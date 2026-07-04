/**
 * GET /api/storefront/:slug/shipping-zones
 *
 * Public — returns active shipping zones so the checkout form
 * can render zone selection + live delivery charge preview.
 */

import sql from "@/app/api/utils/sql";

export async function GET(_req, { params }) {
  const { slug } = await params;

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

  const zones = await sql`
    SELECT id, name, code, delivery_charge, estimated_days
    FROM   shipping_zones
    WHERE  store_id  = ${store.id}
      AND  is_active = TRUE
    ORDER  BY sort_order ASC, name ASC
  `;

  return Response.json({ success: true, data: zones });
}
