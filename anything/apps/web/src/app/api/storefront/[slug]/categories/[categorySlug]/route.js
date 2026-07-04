import sql from "@/app/api/utils/sql";
import { apiResponse } from "@/app/api/utils/response";

// GET /api/storefront/[slug]/categories/[categorySlug]
export async function GET(request, { params }) {
  const { slug, categorySlug } = params;
  const { searchParams } = new URL(request.url);
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
  const limit = Math.min(100, parseInt(searchParams.get("limit") ?? "24"));
  const sort = searchParams.get("sort") ?? "newest";
  const offset = (page - 1) * limit;

  const ORDER_MAP = {
    newest: "p.created_at DESC",
    oldest: "p.created_at ASC",
    price_asc: "p.price ASC",
    price_desc: "p.price DESC",
    name_asc: "p.name ASC",
  };
  const orderBy = ORDER_MAP[sort] ?? "p.created_at DESC";

  try {
    const [store] =
      await sql`SELECT id FROM stores WHERE slug=${slug} AND is_active=true LIMIT 1`;
    if (!store) return apiResponse.notFound("Store not found.");

    const [category] =
      await sql`SELECT * FROM categories WHERE store_id=${store.id} AND slug=${categorySlug} AND is_active=true LIMIT 1`;
    if (!category) return apiResponse.notFound("Category not found.");

    const [products, [{ total }]] = await sql.transaction([
      sql(
        `
        SELECT p.id, p.sku, p.name, p.description, p.price, p.currency,
          p.stock_quantity, p.image_url, p.created_at
        FROM products p
        JOIN product_categories pc ON pc.product_id = p.id
        WHERE pc.category_id = $1 AND p.store_id = $2 AND p.status = 'published'
        ORDER BY ${orderBy}
        LIMIT $3 OFFSET $4
      `,
        [category.id, store.id, limit, offset],
      ),
      sql`SELECT COUNT(*)::int AS total FROM products p JOIN product_categories pc ON pc.product_id = p.id WHERE pc.category_id=${category.id} AND p.store_id=${store.id} AND p.status='published'`,
    ]);

    return apiResponse.success({
      category,
      products,
      meta: { total, page, limit, pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    console.error("[storefront/category]", err);
    return apiResponse.internalError("Failed to load category.");
  }
}
