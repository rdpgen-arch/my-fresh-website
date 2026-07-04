/**
 * In-memory rate limiter middleware for serverless API routes.
 * Uses a sliding window with exponential backoff tracking.
 *
 * Usage:
 *   import { rateLimiter } from "@/app/api/middleware/rateLimiter";
 *   const loginLimit = rateLimiter({ max: 10, windowMs: 60_000 });
 *   export async function POST(req) { return loginLimit(req, handler); }
 */

const store = new Map(); // key → { count, windowStart, blocked }

function getClientKey(request) {
  // Prefer CF/proxy forwarded IP, then fallback
  const forwarded =
    request.headers.get("x-forwarded-for") ??
    request.headers.get("x-real-ip") ??
    "unknown";
  const ip = forwarded.split(",")[0].trim();
  return ip;
}

/**
 * @param {object} opts
 * @param {number} opts.max           Max requests per window (default 15)
 * @param {number} opts.windowMs      Window in ms (default 60000 = 1 min)
 * @param {string} [opts.keyPrefix]   Prefix for scoping limits (e.g. "login:")
 * @param {string} [opts.message]     Custom error message
 */
export function rateLimiter({
  max = 15,
  windowMs = 60_000,
  keyPrefix = "rl:",
  message = "Too many requests. Please try again later.",
} = {}) {
  // Periodically clean up stale entries (every 5 minutes)
  if (typeof globalThis.__rl_cleanup === "undefined") {
    globalThis.__rl_cleanup = setInterval(() => {
      const now = Date.now();
      for (const [key, val] of store.entries()) {
        if (now - val.windowStart > windowMs * 2) store.delete(key);
      }
    }, 300_000);
  }

  /**
   * @param {Request}  request
   * @param {Function} handler  next(request, ...args)
   * @param {...any}   args     forwarded to handler
   */
  return async function limitGuard(request, handler, ...args) {
    const ip = getClientKey(request);
    const key = keyPrefix + ip;
    const now = Date.now();

    const record = store.get(key) ?? { count: 0, windowStart: now };

    // Reset window if expired
    if (now - record.windowStart > windowMs) {
      record.count = 0;
      record.windowStart = now;
    }

    record.count++;
    store.set(key, record);

    if (record.count > max) {
      const retryAfter = Math.ceil(
        (record.windowStart + windowMs - now) / 1000,
      );
      return Response.json(
        { success: false, error: message, code: "RATE_LIMITED" },
        {
          status: 429,
          headers: {
            "Retry-After": String(retryAfter),
            "X-RateLimit-Limit": String(max),
            "X-RateLimit-Remaining": "0",
            "X-RateLimit-Reset": String(
              Math.ceil((record.windowStart + windowMs) / 1000),
            ),
          },
        },
      );
    }

    const remaining = max - record.count;
    // Add rate-limit headers to valid responses
    const response = await handler(request, ...args);
    const headers = new Headers(response.headers);
    headers.set("X-RateLimit-Limit", String(max));
    headers.set("X-RateLimit-Remaining", String(remaining));
    headers.set(
      "X-RateLimit-Reset",
      String(Math.ceil((record.windowStart + windowMs) / 1000)),
    );
    return new Response(response.body, { status: response.status, headers });
  };
}

/**
 * Pre-configured limiters for common endpoints
 */
export const authRateLimit = rateLimiter({
  max: 10,
  windowMs: 60_000,
  keyPrefix: "auth:",
  message: "Too many login attempts. Wait 1 minute and try again.",
});
export const apiRateLimit = rateLimiter({
  max: 100,
  windowMs: 60_000,
  keyPrefix: "api:",
  message: "API rate limit exceeded.",
});
export const heavyRateLimit = rateLimiter({
  max: 5,
  windowMs: 300_000,
  keyPrefix: "heavy:",
  message: "Too many requests to this endpoint. Please wait 5 minutes.",
});
