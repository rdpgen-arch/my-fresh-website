/**
 * GET /api/products/[productId]/categories — Get categories for a product
 * PUT /api/products/[productId]/categories — Set categories for a product (replace)
 */

import { withTenant } from "@/app/api/middleware/withTenant";
import { withRole } from "@/app/api/middleware/withRole";
import sql from "@/app/api/utils/sql";
import { apiResponse } from "@/app/api/utils/response";

export const GET = withTenant(
  withRole("products:read", async (_req, { params }, tenant) => {
    const { productId } = params;
    try {
      const rows = await sql`
        SELECT c.id, c.name, c.slug
        FROM categories c
        JOIN product_categories pc ON pc.category_id = c.id
        WHERE pc.product_id = ${productId} AND c.store_id = ${tenant.storeId}
        ORDER BY c.name ASC
      `;
      return apiResponse.ok(rows);
    } catch {
      return apiResponse.ok([]);
    }
  }),
);

export const PUT = withTenant(
  withRole("products:write", async (request, { params }, tenant) => {
    const { productId } = params;
    let body;
    try {
      body = await request.json();
    } catch {
      return apiResponse.badRequest("Invalid JSON.");
    }
    const { categoryIds = [] } = body;

    try {
      // Delete existing and re-insert
      await sql`DELETE FROM product_categories WHERE product_id = ${productId}`;
      if (categoryIds.length > 0) {
        for (const catId of categoryIds) {
          await sql`
            INSERT INTO product_categories (product_id, category_id)
            SELECT ${productId}, c.id FROM categories c
            WHERE c.id = ${catId} AND c.store_id = ${tenant.storeId}
            ON CONFLICT DO NOTHING
          `;
        }
      }
      return apiResponse.ok({ updated: true });
    } catch (err) {
      console.error("[product/categories PUT]", err);
      return apiResponse.ok({ updated: false }); // Graceful — table may not exist
    }
  }),
);
