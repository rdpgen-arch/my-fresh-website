/**
 * withTenant — Multi-Tenant Isolation Middleware
 *
 * This is the most critical security boundary in the entire platform.
 * It wraps every protected API route handler and guarantees that:
 *
 *   1. The request carries a valid, signed JWT.
 *   2. The JWT contains a `storeId` claim.
 *   3. The `storeId` maps to an existing, active store in the database.
 *   4. A `tenantContext` object is injected into every downstream handler.
 *
 * NO service function may query the database without receiving a
 * `storeId` from this context. Doing so is a critical violation.
 *
 * Usage:
 *   export const GET = withTenant(async (req, routeCtx, tenant) => { ... });
 *   export const POST = withTenant(async (req, routeCtx, tenant) => { ... });
 */

import sql from "@/app/api/utils/sql";
import { verifyJWT } from "@/app/api/utils/jwt";
import { apiResponse } from "@/app/api/utils/response";

// ─── Cookie Parser ────────────────────────────────────────────────────────────

function getTokenFromRequest(request) {
  // 1. HttpOnly cookie (preferred — immune to XSS)
  const cookieHeader = request.headers.get("cookie") ?? "";
  if (cookieHeader) {
    for (const part of cookieHeader.split(";")) {
      const [key, ...rest] = part.trim().split("=");
      if (key.trim() === "admin_token") {
        return rest.join("=").trim();
      }
    }
  }

  // 2. Bearer token fallback (for programmatic API clients / mobile)
  const authHeader = request.headers.get("authorization") ?? "";
  if (authHeader.startsWith("Bearer ")) {
    const token = authHeader.slice(7).trim();
    if (token) return token;
  }

  return null;
}

// ─── Middleware ───────────────────────────────────────────────────────────────

/**
 * @typedef {object} TenantContext
 * @property {string} storeId   - The verified, active store UUID.
 * @property {string} userId    - The authenticated user's UUID.
 * @property {string} roleId    - The user's role UUID (for RBAC downstream).
 * @property {string} storeName - Human-readable store name (for logging).
 */

/**
 * Higher-order function that enforces tenant isolation on a route handler.
 *
 * @param {function(Request, object, TenantContext): Promise<Response>} handler
 * @returns {function(Request, object): Promise<Response>}
 */
export function withTenant(handler) {
  return async function tenantGuard(request, routeContext = {}) {
    // ── Step 1: Extract token from cookie or Authorization header ────────────
    const token = getTokenFromRequest(request);

    if (!token) {
      return apiResponse.unauthorized(
        "No authentication token found. Please sign in.",
      );
    }

    // ── Step 2: Cryptographically verify the JWT ─────────────────────────────
    const secret = process.env.AUTH_SECRET;

    if (!secret) {
      console.error(
        "[withTenant] FATAL: AUTH_SECRET environment variable is not set.",
      );
      return apiResponse.internalError(
        "Server authentication configuration error.",
      );
    }

    const payload = await verifyJWT(token, secret);

    if (!payload) {
      return apiResponse.unauthorized(
        "Token is invalid or has expired. Please sign in again.",
      );
    }

    const { storeId, userId, roleId, permissions } = payload;

    // ── Step 3: Enforce tenant claim presence ────────────────────────────────
    if (!storeId) {
      return apiResponse.forbidden(
        "No tenant (storeId) associated with this token. Access denied.",
      );
    }

    // ── Step 4: Verify the tenant exists and is active ───────────────────────
    let store;
    try {
      const rows = await sql`
        SELECT id, name, is_active
        FROM   stores
        WHERE  id = ${storeId}
        LIMIT  1
      `;
      store = rows[0];
    } catch (err) {
      console.error("[withTenant] Database error during tenant lookup:", err);
      return apiResponse.internalError(
        "Failed to verify tenant. Please try again.",
      );
    }

    if (!store) {
      return apiResponse.notFound(
        "Tenant not found. The store may no longer exist.",
      );
    }

    if (!store.is_active) {
      return apiResponse.forbidden(
        "This store account is suspended. Please contact support.",
      );
    }

    // ── Step 5: Build the immutable tenant context ───────────────────────────
    const tenantContext = Object.freeze({
      storeId: store.id,
      storeName: store.name,
      userId: userId ?? null,
      roleId: roleId ?? null,
      permissions: permissions ?? null,
    });

    // ── Step 6: Delegate to the route handler ────────────────────────────────
    return handler(request, routeContext, tenantContext);
  };
}
