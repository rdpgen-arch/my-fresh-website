/**
 * GET /api/storefront/:slug/products/:productId
 *
 * Public — no JWT required.
 * Returns a single published product for the storefront.
 */

import sql from "@/app/api/utils/sql";

export async function GET(_req, { params }) {
  const { slug, productId } = await params;

  const storeRows = await sql`
    SELECT id FROM stores WHERE slug = ${slug} AND is_active = TRUE LIMIT 1
  `;
  const store = storeRows[0];
  if (!store) {
    return Response.json(
      { success: false, error: "Store not found." },
      { status: 404 },
    );
  }

  const rows = await sql`
    SELECT id, sku, name, description, price, currency, stock_quantity, dynamic_attributes, created_at
    FROM   products
    WHERE  id       = ${productId}
      AND  store_id = ${store.id}
      AND  status   = 'published'
    LIMIT  1
  `;

  if (!rows[0]) {
    return Response.json(
      { success: false, error: "Product not found." },
      { status: 404 },
    );
  }

  return Response.json({ success: true, data: rows[0] });
}
