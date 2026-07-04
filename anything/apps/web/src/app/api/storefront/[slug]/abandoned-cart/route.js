/**
 * POST /api/storefront/:slug/abandoned-cart
 *
 * Task 5D: Silently captures / updates an abandoned cart snapshot.
 * Called from the checkout page on blur events.
 *
 * The frontend sends this on:
 *   - onBlur of any checkout field when cart is non-empty
 *   - beforeunload if the form hasn't been submitted
 *
 * If the same session_key exists, the row is upserted (last_seen_at updated).
 * Cart is marked recovered=true when a real order is placed.
 */

import sql from "@/app/api/utils/sql";
import { apiResponse } from "@/app/api/utils/response";

export async function POST(request, { params }) {
  const { slug } = params;

  let body;
  try {
    body = await request.json();
  } catch {
    return apiResponse.badRequest("Invalid JSON.");
  }

  const {
    sessionKey,
    customerName,
    customerPhone,
    customerEmail,
    cartItems = [],
    cartTotal = 0,
    currency = "BDT",
    sourceUrl,
  } = body;

  if (!sessionKey || !Array.isArray(cartItems)) {
    return apiResponse.badRequest("sessionKey and cartItems are required.");
  }

  // Resolve store
  const stores = await sql`
    SELECT id FROM stores
    WHERE slug = ${slug} AND is_active = true LIMIT 1
  `;
  if (!stores[0]) return apiResponse.notFound("Store not found.");
  const storeId = stores[0].id;

  // Upsert abandoned cart row
  await sql`
    INSERT INTO abandoned_carts
      (store_id, session_key, customer_name, customer_phone, customer_email,
       cart_items, cart_total, currency, source_url, last_seen_at)
    VALUES
      (${storeId}, ${sessionKey}, ${customerName ?? null}, ${customerPhone ?? null},
       ${customerEmail ?? null}, ${JSON.stringify(cartItems)}, ${Number(cartTotal)},
       ${currency}, ${sourceUrl ?? null}, now())
    ON CONFLICT (store_id, session_key)
    DO UPDATE SET
      customer_name  = EXCLUDED.customer_name,
      customer_phone = EXCLUDED.customer_phone,
      customer_email = EXCLUDED.customer_email,
      cart_items     = EXCLUDED.cart_items,
      cart_total     = EXCLUDED.cart_total,
      source_url     = EXCLUDED.source_url,
      last_seen_at   = now()
    WHERE abandoned_carts.recovered = false
  `;

  return apiResponse.ok({ captured: true });
}
