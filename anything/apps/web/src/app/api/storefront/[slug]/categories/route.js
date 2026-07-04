import sql from "@/app/api/utils/sql";
import { apiResponse } from "@/app/api/utils/response";

// GET /api/storefront/[slug]/categories
export async function GET(request, { params }) {
  const { slug } = params;
  try {
    const [store] =
      await sql`SELECT id FROM stores WHERE slug=${slug} AND is_active=true LIMIT 1`;
    if (!store) return apiResponse.notFound("Store not found.");

    const categories = await sql`
      SELECT c.id, c.name, c.slug, c.description, c.image_url, c.sort_order,
        COUNT(pc.product_id)::int AS product_count
      FROM categories c
      LEFT JOIN product_categories pc ON pc.category_id = c.id
      WHERE c.store_id=${store.id} AND c.is_active=true
      GROUP BY c.id
      ORDER BY c.sort_order ASC, c.name ASC
    `;
    return apiResponse.success(categories);
  } catch (err) {
    // Table may not exist yet (before migration 007) — return empty array
    if (err.message?.includes("relation") || err.code === "42P01") {
      return apiResponse.success([]);
    }
    console.error("[storefront/categories]", err);
    return apiResponse.success([]); // Return empty rather than error
  }
}
