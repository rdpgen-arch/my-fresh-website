/**
 * GET  /api/users  — List all users in the tenant
 * POST /api/users  — Invite (create) a new user in the tenant
 *
 * RBAC:
 *   GET  requires "users:read"
 *   POST requires "users:write"
 */

import { withTenant } from "@/app/api/middleware/withTenant";
import { withRole } from "@/app/api/middleware/withRole";
import { listUsers, createUser } from "@/app/api/services/auth.service";
import { apiResponse } from "@/app/api/utils/response";

export const GET = withTenant(
  withRole("users:read", async (_req, _ctx, tenant) => {
    const users = await listUsers({ storeId: tenant.storeId });
    return apiResponse.ok(users);
  }),
);

export const POST = withTenant(
  withRole("users:write", async (request, _ctx, tenant) => {
    let body;
    try {
      body = await request.json();
    } catch {
      return apiResponse.badRequest("Request body must be valid JSON.");
    }

    try {
      const user = await createUser({
        storeId: tenant.storeId,
        email: body.email,
        password: body.password,
        fullName: body.fullName ?? body.full_name,
        roleId: body.roleId ?? body.role_id,
      });
      return apiResponse.created(user);
    } catch (err) {
      if (err.code === "VALIDATION_ERROR")
        return apiResponse.badRequest(err.message, err.details);
      if (err.code === "CONFLICT") return apiResponse.conflict(err.message);
      console.error("[POST /api/users]", err);
      return apiResponse.internalError("Failed to create user.");
    }
  }),
);
