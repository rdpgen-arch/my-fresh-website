/**
 * GET    /api/roles/:roleId  — Fetch single role (must belong to this store or be a system role)
 * PATCH  /api/roles/:roleId  — Update name or permissions (store-owned roles only)
 * DELETE /api/roles/:roleId  — Delete role (store-owned roles only; system roles protected)
 */

import { withTenant } from "@/app/api/middleware/withTenant";
import { withRole } from "@/app/api/middleware/withRole";
import { updateRole, deleteRole } from "@/app/api/services/auth.service";
import { apiResponse } from "@/app/api/utils/response";
import sql from "@/app/api/utils/sql";

export const GET = withTenant(
  withRole("roles:read", async (_req, { params }, { storeId }) => {
    const { roleId } = await params;
    const rows = await sql`
      SELECT id, name, permissions, store_id, created_at
      FROM   roles
      WHERE  id = ${roleId}
        AND (store_id = ${storeId} OR store_id IS NULL)
      LIMIT 1
    `;
    if (!rows[0]) return apiResponse.notFound("Role not found.");
    return apiResponse.ok(rows[0]);
  }),
);

export const PATCH = withTenant(
  withRole("roles:write", async (request, { params }, { storeId }) => {
    const { roleId } = await params;

    let body;
    try {
      body = await request.json();
    } catch {
      return apiResponse.badRequest("Request body must be valid JSON.");
    }

    if (!body || Object.keys(body).length === 0)
      return apiResponse.badRequest("Provide at least one field to update.");

    try {
      const updated = await updateRole({ storeId, roleId, updates: body });
      if (!updated) return apiResponse.notFound("Role not found.");
      return apiResponse.ok(updated);
    } catch (err) {
      if (err.code === "FORBIDDEN") return apiResponse.forbidden(err.message);
      console.error("[PATCH /api/roles/:roleId]", err);
      return apiResponse.internalError("Failed to update role.");
    }
  }),
);

export const DELETE = withTenant(
  withRole("roles:delete", async (_req, { params }, { storeId }) => {
    const { roleId } = await params;
    try {
      const deleted = await deleteRole({ storeId, roleId });
      if (!deleted) return apiResponse.notFound("Role not found.");
      return apiResponse.noContent();
    } catch (err) {
      if (err.code === "FORBIDDEN") return apiResponse.forbidden(err.message);
      console.error("[DELETE /api/roles/:roleId]", err);
      return apiResponse.internalError("Failed to delete role.");
    }
  }),
);
