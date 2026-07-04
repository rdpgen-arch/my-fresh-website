/**
 * Facebook Product Catalog Feed
 * GET /api/storefront/[slug]/facebook-feed
 *
 * Returns an RSS-2.0 / Facebook Catalog XML feed for all published products.
 * Register this URL in Facebook Commerce Manager → Catalog → Data Sources → Scheduled Feed.
 *
 * Format: https://developers.facebook.com/docs/marketing-api/catalog/guides/use-data-feeds
 */
import sql from "@/app/api/utils/sql";

function escapeXml(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export async function GET(request, { params: { slug } }) {
  try {
    // Resolve store
    const stores = await sql`
      SELECT id, name, slug, custom_domain
      FROM stores
      WHERE (slug = ${slug} OR custom_domain = ${slug}) AND is_active = true
      LIMIT 1
    `;
    const store = stores[0];
    if (!store) {
      return new Response("Store not found", { status: 404 });
    }

    // Fetch all published products
    const products = await sql`
      SELECT id, sku, name, description, price, currency, stock_quantity, image_url, status
      FROM products
      WHERE store_id = ${store.id} AND status = 'published'
      ORDER BY created_at DESC
      LIMIT 10000
    `;

    const appUrl = process.env.NEXT_PUBLIC_CREATE_APP_URL || "";
    const storeUrl = `${appUrl}/${store.slug}`;

    const items = products
      .map((p) => {
        const productUrl = `${storeUrl}/products/${p.id}`;
        const availability = p.stock_quantity > 0 ? "in stock" : "out of stock";
        const price = `${Number(p.price).toFixed(2)} BDT`;
        const imageUrl = p.image_url || "";
        const description = escapeXml(p.description || p.name);

        return `    <item>
      <g:id>${escapeXml(p.id)}</g:id>
      <g:title>${escapeXml(p.name)}</g:title>
      <g:description>${description}</g:description>
      <g:link>${escapeXml(productUrl)}</g:link>
      <g:image_link>${escapeXml(imageUrl)}</g:image_link>
      <g:condition>new</g:condition>
      <g:availability>${availability}</g:availability>
      <g:price>${price}</g:price>
      <g:brand>${escapeXml(store.name)}</g:brand>
      <g:mpn>${escapeXml(p.sku)}</g:mpn>
      <g:identifier_exists>no</g:identifier_exists>
      <g:currency>BDT</g:currency>
    </item>`;
      })
      .join("\n");

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss xmlns:g="http://base.google.com/ns/1.0" version="2.0">
  <channel>
    <title>${escapeXml(store.name)} — Product Catalog</title>
    <link>${escapeXml(storeUrl)}</link>
    <description>Product catalog for ${escapeXml(store.name)}</description>
${items}
  </channel>
</rss>`;

    return new Response(xml, {
      status: 200,
      headers: {
        "Content-Type": "application/xml; charset=utf-8",
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch (err) {
    console.error("[Facebook feed]", err);
    return new Response("Internal error", { status: 500 });
  }
}
