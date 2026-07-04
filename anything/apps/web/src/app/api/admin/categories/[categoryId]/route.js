/**
 * PATCH  /api/admin/categories/[categoryId]
 * DELETE /api/admin/categories/[categoryId]
 */

import { withTenant } from "@/app/api/middleware/withTenant";
import { withRole } from "@/app/api/middleware/withRole";
import sql from "@/app/api/utils/sql";
import { apiResponse } from "@/app/api/utils/response";

export const PATCH = withTenant(
  withRole("products:write", async (request, { params }, tenant) => {
    const { categoryId } = params;
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
    if (body.slug !== undefined) {
      setClauses.push(`slug=$${idx++}`);
      values.push(body.slug.trim());
    }
    if (body.description !== undefined) {
      setClauses.push(`description=$${idx++}`);
      values.push(body.description || null);
    }
    if (body.imageUrl !== undefined) {
      setClauses.push(`image_url=$${idx++}`);
      values.push(body.imageUrl || null);
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
    values.push(categoryId, tenant.storeId);

    const rows = await sql(
      `UPDATE categories SET ${setClauses.join(",")} WHERE id=$${idx} AND store_id=$${idx + 1} RETURNING *`,
      values,
    );
    if (!rows[0]) return apiResponse.notFound("Category not found.");
    return apiResponse.ok(rows[0]);
  }),
);

export const DELETE = withTenant(
  withRole("products:write", async (_req, { params }, tenant) => {
    const { categoryId } = params;
    const rows =
      await sql`DELETE FROM categories WHERE id=${categoryId} AND store_id=${tenant.storeId} RETURNING id`;
    if (!rows[0]) return apiResponse.notFound("Category not found.");
    return apiResponse.ok({ deleted: true });
  }),
);
