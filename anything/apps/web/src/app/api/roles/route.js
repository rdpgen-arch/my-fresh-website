/**
 * GET  /api/roles  — List roles scoped to the authenticated store
 * POST /api/roles  — Create a new role for the authenticated store
 *
 * RBAC:
 *   GET  requires "roles:read"
 *   POST requires "roles:write"
 */

import { withTenant } from "@/app/api/middleware/withTenant";
import { withRole } from "@/app/api/middleware/withRole";
import { listRoles, createRole } from "@/app/api/services/auth.service";
import { apiResponse } from "@/app/api/utils/response";

export const GET = withTenant(
  withRole("roles:read", async (_req, _routeCtx, { storeId }) => {
    const roles = await listRoles({ storeId });
    return apiResponse.ok(roles);
  }),
);

export const POST = withTenant(
  withRole("roles:write", async (request, _routeCtx, { storeId }) => {
    let body;
    try {
      body = await request.json();
    } catch {
      return apiResponse.badRequest("Request body must be valid JSON.");
    }

    try {
      const role = await createRole({
        storeId,
        name: body.name,
        permissions: body.permissions ?? {},
      });
      return apiResponse.created(role);
    } catch (err) {
      if (err.code === "VALIDATION_ERROR")
        return apiResponse.badRequest(err.message);
      if (err.code === "CONFLICT") return apiResponse.conflict(err.message);
      console.error("[POST /api/roles]", err);
      return apiResponse.internalError("Failed to create role.");
    }
  }),
);
