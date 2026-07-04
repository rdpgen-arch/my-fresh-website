import sql from "@/app/api/utils/sql";
import { apiResponse } from "@/app/api/utils/response";

// GET /api/storefront/[slug]/products/[productId]/related
export async function GET(request, { params }) {
  const { slug, productId } = params;
  try {
    const [store] =
      await sql`SELECT id FROM stores WHERE slug=${slug} AND is_active=true LIMIT 1`;
    if (!store) return apiResponse.notFound("Store not found.");

    let related;
    try {
      // Try category-based related first
      related = await sql`
        SELECT DISTINCT p.id, p.name, p.price, p.currency, p.image_url, p.stock_quantity
        FROM products p
        LEFT JOIN product_categories pc ON pc.product_id = p.id
        WHERE p.store_id=${store.id} AND p.status='published' AND p.id != ${productId}
          AND (pc.category_id IN (SELECT category_id FROM product_categories WHERE product_id=${productId}) OR pc.category_id IS NULL)
        ORDER BY RANDOM()
        LIMIT 8
      `;
    } catch {
      // Fallback: random products (if product_categories table not yet migrated)
      related = await sql`
        SELECT id, name, price, currency, image_url, stock_quantity
        FROM products
        WHERE store_id=${store.id} AND status='published' AND id != ${productId}
        ORDER BY RANDOM()
        LIMIT 8
      `;
    }

    return apiResponse.success(related);
  } catch (err) {
    console.error("[related products]", err);
    return apiResponse.internalError("Failed to load related products.");
  }
}
