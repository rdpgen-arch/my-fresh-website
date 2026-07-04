/**
 * GET    /api/users/:userId  — Fetch single user
 * PATCH  /api/users/:userId  — Update user (role, name, active, password)
 * DELETE /api/users/:userId  — Remove user from tenant
 *
 * RBAC:
 *   GET    requires "users:read"
 *   PATCH  requires "users:write"
 *   DELETE requires "users:delete"
 */

import { withTenant } from "@/app/api/middleware/withTenant";
import { withRole } from "@/app/api/middleware/withRole";
import {
  getUser,
  updateUser,
  deleteUser,
} from "@/app/api/services/auth.service";
import { apiResponse } from "@/app/api/utils/response";

export const GET = withTenant(
  withRole("users:read", async (_req, { params }, tenant) => {
    const { userId } = await params;
    const user = await getUser({ storeId: tenant.storeId, userId });
    if (!user) return apiResponse.notFound("User not found.");
    return apiResponse.ok(user);
  }),
);

export const PATCH = withTenant(
  withRole("users:write", async (request, { params }, tenant) => {
    const { userId } = await params;

    let body;
    try {
      body = await request.json();
    } catch {
      return apiResponse.badRequest("Request body must be valid JSON.");
    }

    if (!body || Object.keys(body).length === 0)
      return apiResponse.badRequest("Provide at least one field to update.");

    // Prevent self-deactivation or self-demotion (basic guard)
    if (body.isActive === false && userId === tenant.userId)
      return apiResponse.badRequest("You cannot deactivate your own account.");

    try {
      const updated = await updateUser({
        storeId: tenant.storeId,
        userId,
        updates: body,
      });
      if (!updated) return apiResponse.notFound("User not found.");
      return apiResponse.ok(updated);
    } catch (err) {
      if (err.code === "VALIDATION_ERROR")
        return apiResponse.badRequest(err.message);
      console.error("[PATCH /api/users/:userId]", err);
      return apiResponse.internalError("Failed to update user.");
    }
  }),
);

export const DELETE = withTenant(
  withRole("users:delete", async (_req, { params }, tenant) => {
    const { userId } = await params;

    // Prevent self-deletion
    if (userId === tenant.userId)
      return apiResponse.badRequest("You cannot delete your own account.");

    const deleted = await deleteUser({ storeId: tenant.storeId, userId });
    if (!deleted) return apiResponse.notFound("User not found.");
    return apiResponse.noContent();
  }),
);
