/**
 * POST /api/auth/login
 *
 * Security hardening applied:
 *  1. JWT is set as an HttpOnly; Secure; SameSite=Strict cookie — never
 *     exposed to JavaScript, immune to XSS token theft.
 *  2. In-memory sliding-window rate limiter: 5 failures per IP per 15 min.
 *     For multi-instance deployments, swap `rateLimitStore` with a Redis client.
 */

import { login } from "@/app/api/services/auth.service";
import { apiResponse } from "@/app/api/utils/response";

// ─── In-Memory Rate Limiter ───────────────────────────────────────────────────
// Map<ip, { count: number, windowStart: number }>

const rateLimitStore = new Map();
const RATE_LIMIT_MAX = 5; // max failures
const RATE_LIMIT_WINDOW = 15 * 60 * 1000; // 15 minutes in ms

function getClientIp(request) {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
    request.headers.get("x-real-ip") ??
    "unknown"
  );
}

function checkRateLimit(ip) {
  const now = Date.now();
  const entry = rateLimitStore.get(ip);

  if (!entry || now - entry.windowStart > RATE_LIMIT_WINDOW) {
    // New window
    rateLimitStore.set(ip, { count: 0, windowStart: now });
    return { limited: false, remaining: RATE_LIMIT_MAX };
  }

  const remaining = RATE_LIMIT_MAX - entry.count;
  return {
    limited: entry.count >= RATE_LIMIT_MAX,
    remaining: Math.max(0, remaining),
  };
}

function recordFailure(ip) {
  const now = Date.now();
  const entry = rateLimitStore.get(ip);

  if (!entry || now - entry.windowStart > RATE_LIMIT_WINDOW) {
    rateLimitStore.set(ip, { count: 1, windowStart: now });
  } else {
    entry.count += 1;
  }
}

function clearRateLimit(ip) {
  rateLimitStore.delete(ip);
}

// Prune stale entries every 30 minutes to prevent memory leaks
setInterval(
  () => {
    const cutoff = Date.now() - RATE_LIMIT_WINDOW;
    for (const [ip, entry] of rateLimitStore) {
      if (entry.windowStart < cutoff) rateLimitStore.delete(ip);
    }
  },
  30 * 60 * 1000,
);

// ─── Cookie Builder ───────────────────────────────────────────────────────────

function buildAuthCookie(token) {
  const isProd = process.env.NODE_ENV === "production";
  const maxAge = 60 * 60 * 8; // 8 hours, matches JWT expiry
  const parts = [
    `admin_token=${token}`,
    `Max-Age=${maxAge}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Strict",
  ];
  if (isProd) parts.push("Secure");
  return parts.join("; ");
}

function buildClearCookie() {
  return "admin_token=; Max-Age=0; Path=/; HttpOnly; SameSite=Strict";
}

// ─── Route Handler ────────────────────────────────────────────────────────────

export async function POST(request) {
  const ip = getClientIp(request);
  const { limited, remaining } = checkRateLimit(ip);

  if (limited) {
    return new Response(
      JSON.stringify({
        success: false,
        error: "Too many login attempts. Please wait 15 minutes.",
      }),
      {
        status: 429,
        headers: {
          "Content-Type": "application/json",
          "Retry-After": "900",
          "X-RateLimit-Limit": String(RATE_LIMIT_MAX),
          "X-RateLimit-Remaining": "0",
        },
      },
    );
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return apiResponse.badRequest("Request body must be valid JSON.");
  }

  const { storeSlug, email, password } = body ?? {};

  if (!storeSlug || !email || !password) {
    return apiResponse.badRequest(
      "storeSlug, email, and password are all required.",
    );
  }

  try {
    const result = await login({ storeSlug, email, password });

    // Success — clear rate limit counter for this IP
    clearRateLimit(ip);

    // Return user info in body; token travels only via HttpOnly cookie
    const responseBody = JSON.stringify({
      success: true,
      data: { user: result.user },
    });

    return new Response(responseBody, {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Set-Cookie": buildAuthCookie(result.token),
        "X-RateLimit-Limit": String(RATE_LIMIT_MAX),
        "X-RateLimit-Remaining": String(remaining),
      },
    });
  } catch (err) {
    switch (err.code) {
      case "VALIDATION_ERROR":
        return apiResponse.badRequest(err.message, err.details);
      case "NOT_FOUND":
        recordFailure(ip);
        return apiResponse.unauthorized("Invalid email or password.");
      case "INVALID_CREDENTIALS":
        recordFailure(ip);
        return apiResponse.unauthorized("Invalid email or password.");
      case "FORBIDDEN":
        return apiResponse.forbidden(err.message);
      default:
        console.error("[POST /api/auth/login]", err);
        return apiResponse.internalError("Login failed. Please try again.");
    }
  }
}

// ─── Logout ───────────────────────────────────────────────────────────────────

export async function DELETE() {
  return new Response(JSON.stringify({ success: true, data: null }), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Set-Cookie": buildClearCookie(),
    },
  });
}
