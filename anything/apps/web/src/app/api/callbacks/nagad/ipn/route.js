/**
 * Nagad IPN Handler
 * POST /api/callbacks/nagad/ipn
 *
 * Nagad calls this URL after the customer completes (or fails) a payment.
 * We verify the payment independently via the Nagad verify API.
 */
import {
  getDecryptedCredentials,
  logIPNEvent,
} from "@/app/api/services/integration.service";
import { verifyNagadPayment } from "@/app/api/services/nagad.service";
import { sendSMS, smsOrderPlaced } from "@/app/api/services/sms.service";
import sql from "@/app/api/utils/sql";

export async function POST(request) {
  let rawPayload = {};
  let storeId = null;
  let orderId = null;
  let orderNumber = null;

  try {
    rawPayload = await request.json();
  } catch (_) {
    try {
      rawPayload = Object.fromEntries(new URL(request.url).searchParams);
    } catch (_2) {}
  }

  // Nagad sends orderId / merchantOrderId in the callback
  const nagadOrderId =
    rawPayload.orderId || rawPayload.merchantOrderId || rawPayload.order_id;
  if (!nagadOrderId) {
    return Response.json({ error: "Missing orderId" }, { status: 400 });
  }

  try {
    // Find order by order_number
    const orders = await sql`
      SELECT o.id, o.order_number, o.store_id, o.grand_total, o.payment_status,
             o.customer_name, o.customer_phone, s.slug, s.name AS store_name
      FROM orders o
      JOIN stores s ON s.id = o.store_id
      WHERE o.order_number = ${nagadOrderId}
      LIMIT 1
    `;
    const order = orders[0];
    if (!order) {
      await logIPNEvent({
        storeId: null,
        integration: "nagad",
        rawPayload,
        verified: false,
        orderNumber: nagadOrderId,
        actionTaken: "order_not_found",
      });
      return Response.json({ status: "order_not_found" }, { status: 404 });
    }

    storeId = order.store_id;
    orderId = order.id;
    orderNumber = order.order_number;

    // Already paid — skip
    if (order.payment_status === "paid") {
      await logIPNEvent({
        storeId,
        integration: "nagad",
        rawPayload,
        verified: true,
        orderId,
        orderNumber,
        actionTaken: "already_paid",
      });
      return Response.json({ status: "already_processed" });
    }

    // Load Nagad credentials
    const creds = await getDecryptedCredentials({
      storeId,
      integration: "nagad",
    });
    if (!creds) {
      return Response.json({ error: "Nagad not configured" }, { status: 500 });
    }

    // Verify payment independently with Nagad API
    const { verified, transactionId, amount } = await verifyNagadPayment(
      nagadOrderId,
      creds,
    );

    if (!verified) {
      await logIPNEvent({
        storeId,
        integration: "nagad",
        rawPayload,
        verified: false,
        orderId,
        orderNumber,
        actionTaken: "verification_failed",
      });
      return Response.json({ status: "payment_not_verified" });
    }

    // Update order payment status
    await sql`
      UPDATE orders SET
        payment_status = 'paid',
        payment_meta = payment_meta || ${JSON.stringify({
          nagadTransactionId: transactionId,
          nagadAmount: amount,
          verifiedAt: new Date().toISOString(),
        })}::jsonb,
        updated_at = NOW()
      WHERE id = ${orderId}
    `;

    // Transition to processing if pending
    await sql`
      UPDATE orders SET status = 'processing', updated_at = NOW()
      WHERE id = ${orderId} AND status = 'pending'
    `;

    await logIPNEvent({
      storeId,
      integration: "nagad",
      rawPayload,
      verified: true,
      orderId,
      orderNumber,
      actionTaken: "payment_confirmed",
    });

    // Send customer SMS confirmation
    await sendSMS({
      storeId,
      to: order.customer_phone,
      message: smsOrderPlaced({
        orderNumber: order.order_number,
        customerName: order.customer_name,
        grandTotal: Number(order.grand_total).toLocaleString(),
        storeName: order.store_name,
      }),
      type: "order_confirmed",
    });

    return Response.json({ status: "success" });
  } catch (err) {
    console.error("[Nagad IPN]", err);
    await logIPNEvent({
      storeId,
      integration: "nagad",
      rawPayload,
      verified: false,
      orderId,
      orderNumber,
      actionTaken: "error",
      errorMessage: err.message,
    }).catch(() => {});
    return Response.json({ error: "Internal error" }, { status: 500 });
  }
}
