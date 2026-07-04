/**
 * withRole — RBAC Permission Enforcement Middleware
 *
 * Sits INSIDE `withTenant`. It receives the already-validated `tenantContext`
 * (which contains the user's role permissions embedded in the JWT) and checks
 * whether those permissions satisfy the route's requirements.
 *
 * ── How permissions are resolved ────────────────────────────────────────────
 *
 *  The JWT payload includes a `permissions` snapshot embedded at login time
 *  (from `roles.permissions`). This means:
 *    ✓ Zero additional DB queries per request — no latency overhead.
 *    ✓ If a role's permissions change, users re-authenticate to get new claims.
 *
 * ── Permission string format ─────────────────────────────────────────────────
 *
 *    "<resource>:<action>"
 *
 *  Resources: products, orders, users, roles, webhooks, customers, store
 *  Actions:   read, write, delete
 *
 *  Examples:
 *    "products:write"   → can create/update products
 *    "orders:read"      → can list/fetch orders
 *    "users:delete"     → can remove users from the store
 *
 * ── Usage ────────────────────────────────────────────────────────────────────
 *
 *  Single permission:
 *    export const POST = withTenant(withRole("products:write", handler));
 *
 *  Multiple permissions (ALL must be satisfied — AND logic):
 *    export const DELETE = withTenant(withRole(["products:delete", "orders:read"], handler));
 *
 *  No RBAC (just tenant isolation):
 *    export const GET = withTenant(handler);
 */

import { hasAllPermissions } from "@/app/api/services/auth.service";
import { apiResponse } from "@/app/api/utils/response";

/**
 * @typedef {object} TenantContext
 * @property {string} storeId
 * @property {string} storeName
 * @property {string|null} userId
 * @property {string|null} roleId
 * @property {object|null} permissions  - The role's permissions JSONB (from JWT).
 */

/**
 * RBAC higher-order function. Wraps a route handler and enforces permissions.
 *
 * @param {string|string[]} requiredPermissions  - One or more "resource:action" strings.
 * @param {function(Request, object, TenantContext): Promise<Response>} handler
 * @returns {function(Request, object, TenantContext): Promise<Response>}
 */
export function withRole(requiredPermissions, handler) {
  const required = Array.isArray(requiredPermissions)
    ? requiredPermissions
    : [requiredPermissions];

  // Validate format at definition time (fails fast at startup, not at runtime)
  for (const perm of required) {
    if (typeof perm !== "string" || !perm.includes(":")) {
      throw new Error(
        `[withRole] Invalid permission format: "${perm}". ` +
          `Expected "resource:action" (e.g. "products:write").`,
      );
    }
  }

  return async function roleGuard(request, routeContext, tenantContext) {
    // ── Guard: ensure we're inside withTenant ───────────────────────────────
    if (!tenantContext || !tenantContext.storeId) {
      console.error(
        "[withRole] Called outside of withTenant context. This is a programming error.",
      );
      return apiResponse.internalError("Middleware configuration error.");
    }

    // ── Extract permissions from the tenantContext ───────────────────────────
    // `permissions` is embedded in the JWT at login time via auth.service.js.
    // tenantContext is built from the JWT payload in withTenant.
    const permissions = tenantContext.permissions ?? null;

    if (!permissions) {
      // No permissions claim in the token — deny by default.
      // This should never happen for a correctly-issued token, but we fail closed.
      return apiResponse.forbidden(
        "Your session does not contain permission claims. Please sign in again.",
      );
    }

    // ── Check all required permissions ──────────────────────────────────────
    const granted = hasAllPermissions(permissions, required);

    if (!granted) {
      // Build a human-readable message listing what was required
      const permList = required.join(", ");
      console.warn(
        `[withRole] Access denied for user ${tenantContext.userId ?? "unknown"} ` +
          `on store ${tenantContext.storeId}. Required: [${permList}]`,
      );
      return apiResponse.forbidden(
        `You do not have the required permissions: [${permList}].`,
      );
    }

    // ── All checks passed — delegate to the route handler ──────────────────
    return handler(request, routeContext, tenantContext);
  };
}
