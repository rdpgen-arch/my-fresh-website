/**
 * Nagad Payment Initiation (Storefront)
 * POST /api/storefront/[slug]/nagad
 *
 * Called from the storefront checkout page when customer selects Nagad.
 * Initiates the Nagad payment session and returns a redirect URL.
 *
 * Body: { orderId: "uuid" }
 */
import { getDecryptedCredentials } from "@/app/api/services/integration.service";
import {
  initiateNagadPayment,
  completeNagadPayment,
} from "@/app/api/services/nagad.service";
import sql from "@/app/api/utils/sql";

export async function POST(request, { params: { slug } }) {
  try {
    const body = await request.json();
    const { orderId } = body;
    if (!orderId)
      return Response.json({ error: "orderId is required" }, { status: 400 });

    // Resolve store
    const stores =
      await sql`SELECT id, name FROM stores WHERE slug = ${slug} AND is_active = true LIMIT 1`;
    const store = stores[0];
    if (!store)
      return Response.json({ error: "Store not found" }, { status: 404 });

    // Load order
    const orders = await sql`
      SELECT id, order_number, grand_total, status, payment_status, payment_meta
      FROM orders WHERE id = ${orderId} AND store_id = ${store.id} LIMIT 1
    `;
    const order = orders[0];
    if (!order)
      return Response.json({ error: "Order not found" }, { status: 404 });

    // Load Nagad creds
    const creds = await getDecryptedCredentials({
      storeId: store.id,
      integration: "nagad",
    });
    if (!creds || !creds.is_active) {
      return Response.json(
        { error: "Nagad is not configured for this store" },
        { status: 400 },
      );
    }

    const appUrl = process.env.NEXT_PUBLIC_CREATE_APP_URL || "";

    // Step 1: Initialize
    const { callbackUrl, challenge } = await initiateNagadPayment(order, creds);

    // Save challenge to payment_meta so we can verify later
    await sql`
      UPDATE orders SET
        payment_meta = payment_meta || ${JSON.stringify({ nagadChallenge: challenge })}::jsonb,
        updated_at = NOW()
      WHERE id = ${orderId}
    `;

    // Step 2: Complete — get the redirect URL
    const merchantCallbackURL = `${appUrl}/api/callbacks/nagad/ipn`;
    const { redirectUrl } = await completeNagadPayment({
      orderId: order.order_number,
      amount: order.grand_total,
      challenge,
      creds,
      merchantCallbackURL,
    });

    return Response.json({ redirectUrl });
  } catch (err) {
    console.error("[Nagad initiate]", err);
    return Response.json(
      { error: err.message || "Payment initiation failed" },
      { status: 500 },
    );
  }
}
