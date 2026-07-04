/**
 * GET  /api/admin/categories  — List categories for the tenant
 * POST /api/admin/categories  — Create a new category
 */

import { withTenant } from "@/app/api/middleware/withTenant";
import { withRole } from "@/app/api/middleware/withRole";
import sql from "@/app/api/utils/sql";
import { apiResponse } from "@/app/api/utils/response";

export const GET = withTenant(
  withRole("products:read", async (_req, _ctx, tenant) => {
    try {
      const categories = await sql`
        SELECT id, name, slug, description, image_url, is_active, sort_order, created_at
        FROM categories
        WHERE store_id = ${tenant.storeId}
        ORDER BY sort_order ASC, name ASC
      `;
      return apiResponse.ok(categories);
    } catch (err) {
      console.error("[admin/categories GET]", err);
      return apiResponse.ok([]); // Return empty if table doesn't exist yet
    }
  }),
);

export const POST = withTenant(
  withRole("products:write", async (request, _ctx, tenant) => {
    let body;
    try {
      body = await request.json();
    } catch {
      return apiResponse.badRequest("Invalid JSON.");
    }
    const { name, slug, description, imageUrl, sortOrder } = body;
    if (!name?.trim()) return apiResponse.badRequest("name is required.");
    if (!slug?.trim()) return apiResponse.badRequest("slug is required.");

    try {
      const [cat] = await sql`
        INSERT INTO categories (store_id, name, slug, description, image_url, sort_order)
        VALUES (${tenant.storeId}, ${name.trim()}, ${slug.trim()},
                ${description?.trim() || null}, ${imageUrl || null}, ${Number(sortOrder ?? 0)})
        RETURNING *
      `;
      return apiResponse.created(cat);
    } catch (err) {
      if (err.code === "23505")
        return apiResponse.conflict(
          "A category with this slug already exists.",
        );
      console.error("[admin/categories POST]", err);
      return apiResponse.internalError("Failed to create category.");
    }
  }),
);
