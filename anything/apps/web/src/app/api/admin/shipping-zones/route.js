/**
 * GET  /api/admin/shipping-zones  — List zones for the tenant
 * POST /api/admin/shipping-zones  — Create a new zone
 */

import { withTenant } from "@/app/api/middleware/withTenant";
import { withRole } from "@/app/api/middleware/withRole";
import sql from "@/app/api/utils/sql";
import { apiResponse } from "@/app/api/utils/response";

export const GET = withTenant(
  withRole("orders:read", async (_req, _ctx, tenant) => {
    const zones = await sql`
      SELECT id, name, code, delivery_charge, estimated_days, is_active, sort_order, created_at
      FROM shipping_zones
      WHERE store_id = ${tenant.storeId}
      ORDER BY sort_order ASC, name ASC
    `;
    return apiResponse.ok(zones);
  }),
);

export const POST = withTenant(
  withRole("orders:write", async (request, _ctx, tenant) => {
    let body;
    try {
      body = await request.json();
    } catch {
      return apiResponse.badRequest("Invalid JSON.");
    }
    const { name, code, deliveryCharge, estimatedDays, isActive, sortOrder } =
      body;
    if (!name?.trim()) return apiResponse.badRequest("name is required.");
    if (!code?.trim()) return apiResponse.badRequest("code is required.");

    try {
      const [zone] = await sql`
        INSERT INTO shipping_zones (store_id, name, code, delivery_charge, estimated_days, is_active, sort_order)
        VALUES (${tenant.storeId}, ${name.trim()}, ${code.trim().toUpperCase()},
                ${Number(deliveryCharge ?? 0)}, ${estimatedDays?.trim() || null},
                ${isActive !== false}, ${Number(sortOrder ?? 0)})
        RETURNING *
      `;
      return apiResponse.created(zone);
    } catch (err) {
      if (err.code === "23505")
        return apiResponse.conflict("A zone with this code already exists.");
      console.error("[POST /api/admin/shipping-zones]", err);
      return apiResponse.internalError("Failed to create zone.");
    }
  }),
);
