/**
 * GET /api/storefront/:slug/products
 *
 * Public — no JWT required.
 * Returns ONLY published products for the store.
 * Supports: search, page, limit, sortBy, sortDir.
 */

import sql from "@/app/api/utils/sql";

export async function GET(request, { params }) {
  const { slug } = await params;
  const { searchParams } = new URL(request.url);

  // Resolve store
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

  const search = searchParams.get("search") ?? "";
  const category = searchParams.get("category") ?? "";
  const page = Math.max(Number(searchParams.get("page")) || 1, 1);
  const limit = Math.min(Number(searchParams.get("limit")) || 24, 100);
  const sortBy = searchParams.get("sortBy") ?? "created_at";
  const sortDir = searchParams.get("sortDir") === "asc" ? "ASC" : "DESC";

  const SORTABLE = ["price", "name", "created_at"];
  const orderCol = SORTABLE.includes(sortBy) ? sortBy : "created_at";
  const offset = (page - 1) * limit;

  const conditions = ["p.store_id = $1", "p.status = 'published'"];
  const params_ = [store.id];
  let idx = 2;

  if (search) {
    conditions.push(
      `(p.name ILIKE $${idx} OR p.sku ILIKE $${idx} OR p.description ILIKE $${idx})`,
    );
    params_.push(`%${search}%`);
    idx++;
  }

  // Category filter — join product_categories if needed
  let categoryJoin = "";
  if (category) {
    try {
      const catRows =
        await sql`SELECT id FROM categories WHERE store_id=${store.id} AND slug=${category} AND is_active=true LIMIT 1`;
      if (catRows[0]) {
        categoryJoin = `JOIN product_categories pc ON pc.product_id = p.id AND pc.category_id = '${catRows[0].id}'`;
      }
    } catch {
      // product_categories table doesn't exist yet — ignore filter
    }
  }

  const where = conditions.join(" AND ");
  const baseTable = `products p ${categoryJoin}`;

  const [products, [{ total }]] = await sql.transaction([
    sql(
      `SELECT p.id, p.sku, p.name, p.description, p.price, p.currency, p.stock_quantity,
              p.dynamic_attributes, p.image_url, p.created_at
       FROM ${baseTable}
       WHERE ${where}
       ORDER BY p.${orderCol} ${sortDir}
       LIMIT $${idx} OFFSET $${idx + 1}`,
      [...params_, limit, offset],
    ),
    sql(`SELECT COUNT(*) AS total FROM ${baseTable} WHERE ${where}`, params_),
  ]);

  return Response.json({
    success: true,
    data: products,
    meta: {
      total: Number(total),
      page,
      limit,
      pages: Math.ceil(Number(total) / limit),
    },
  });
}
