/**
 * GET /api/storefront/:slug/track?order=ORD-...&phone=01...
 *
 * Public order tracking — verifies both order number AND phone number
 * so customers can only see their own orders.
 */

import sql from "@/app/api/utils/sql";
import { apiResponse } from "@/app/api/utils/response";

export async function GET(request, { params }) {
  const { slug } = params;
  const { searchParams } = new URL(request.url);
  const orderNumber = (searchParams.get("order") ?? "").trim();
  const phone = (searchParams.get("phone") ?? "").trim().replace(/\s/g, "");

  if (!orderNumber || !phone) {
    return apiResponse.badRequest("order and phone query params are required.");
  }

  const stores =
    await sql`SELECT id FROM stores WHERE slug = ${slug} AND is_active = true LIMIT 1`;
  if (!stores[0]) return apiResponse.notFound("Store not found.");

  const orders = await sql`
    SELECT o.id, o.order_number, o.status, o.payment_method, o.payment_status,
           o.customer_name, o.customer_phone,
           o.subtotal, o.shipping_total, o.discount_amount, o.grand_total, o.currency,
           o.shipping_zone_name, o.estimated_delivery, o.created_at, o.updated_at
    FROM   orders o
    WHERE  o.store_id     = ${stores[0].id}
      AND  o.order_number = ${orderNumber}
      AND  o.customer_phone = ${phone}
    LIMIT 1
  `;

  if (!orders[0])
    return apiResponse.notFound(
      "Order not found. Please check your order number and phone number.",
    );

  const order = orders[0];

  const [items, history] = await sql.transaction([
    sql`SELECT id, name, sku, quantity, unit_price, line_total, dynamic_attributes FROM order_items WHERE order_id = ${order.id} ORDER BY created_at ASC`,
    sql`SELECT id, from_status, to_status, note, created_at FROM order_status_history WHERE order_id = ${order.id} ORDER BY created_at DESC`,
  ]);

  return apiResponse.success({ ...order, items, history });
}
