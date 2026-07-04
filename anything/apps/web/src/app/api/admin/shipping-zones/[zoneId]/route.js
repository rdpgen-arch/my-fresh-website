/**
 * PATCH  /api/admin/shipping-zones/[zoneId]  — Update a zone
 * DELETE /api/admin/shipping-zones/[zoneId]  — Delete a zone
 */

import { withTenant } from "@/app/api/middleware/withTenant";
import { withRole } from "@/app/api/middleware/withRole";
import sql from "@/app/api/utils/sql";
import { apiResponse } from "@/app/api/utils/response";

export const PATCH = withTenant(
  withRole("orders:write", async (request, { params }, tenant) => {
    const { zoneId } = params;
    let body;
    try {
      body = await request.json();
    } catch {
      return apiResponse.badRequest("Invalid JSON.");
    }

    const setClauses = [];
    const values = [];
    let idx = 1;

    if (body.name !== undefined) {
      setClauses.push(`name=$${idx++}`);
      values.push(body.name.trim());
    }
    if (body.code !== undefined) {
      setClauses.push(`code=$${idx++}`);
      values.push(body.code.trim().toUpperCase());
    }
    if (body.deliveryCharge !== undefined) {
      setClauses.push(`delivery_charge=$${idx++}`);
      values.push(Number(body.deliveryCharge));
    }
    if (body.estimatedDays !== undefined) {
      setClauses.push(`estimated_days=$${idx++}`);
      values.push(body.estimatedDays || null);
    }
    if (body.isActive !== undefined) {
      setClauses.push(`is_active=$${idx++}`);
      values.push(Boolean(body.isActive));
    }
    if (body.sortOrder !== undefined) {
      setClauses.push(`sort_order=$${idx++}`);
      values.push(Number(body.sortOrder));
    }

    if (!setClauses.length)
      return apiResponse.badRequest("No fields to update.");
    values.push(zoneId, tenant.storeId);

    const rows = await sql(
      `UPDATE shipping_zones SET ${setClauses.join(",")} WHERE id=$${idx} AND store_id=$${idx + 1} RETURNING *`,
      values,
    );
    if (!rows[0]) return apiResponse.notFound("Zone not found.");
    return apiResponse.ok(rows[0]);
  }),
);

export const DELETE = withTenant(
  withRole("orders:write", async (_req, { params }, tenant) => {
    const { zoneId } = params;
    const rows =
      await sql`DELETE FROM shipping_zones WHERE id=${zoneId} AND store_id=${tenant.storeId} RETURNING id`;
    if (!rows[0]) return apiResponse.notFound("Zone not found.");
    return apiResponse.ok({ deleted: true });
  }),
);
