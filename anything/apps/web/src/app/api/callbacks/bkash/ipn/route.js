/**
 * POST /api/callbacks/bkash/ipn
 *
 * Public endpoint — receives bKash Payment Gateway IPN (Instant Payment Notification).
 * No JWT auth (bKash calls this directly).
 *
 * bKash IPN Flow:
 *   1. Customer pays on bKash checkout.
 *   2. bKash POSTs this endpoint with { paymentID, trxID, amount, merchantInvoiceNumber, ... }
 *   3. We re-verify the payment with bKash's Query API using our stored credentials.
 *   4. On COMPLETED status, we update the order: payment_status → 'paid' + transition → 'processing'.
 *
 * Security:
 *   - We NEVER trust the incoming payload status alone.
 *   - We always re-query bKash's API to verify the payment independently (Double-verification).
 *   - The `merchantInvoiceNumber` field maps to our `order_number`.
 *   - The store is resolved from the order's store_id — no tenant ID needed in the callback URL.
 *
 * IPN verification model:
 *   bKash → POST /api/callbacks/bkash/ipn  (raw payload)
 *     → find order by merchantInvoiceNumber
 *     → look up store's bKash credentials
 *     → call bKash Execute Payment API to re-verify
 *     → if COMPLETED → updatePayment + transitionStatus
 */

import sql from "@/app/api/utils/sql";
import {
  getDecryptedCredentials,
  logIPNEvent,
} from "@/app/api/services/integration.service";
import {
  updatePayment,
  transitionStatus,
} from "@/app/api/services/order.service";

// Always respond 200 to bKash immediately — they retry on non-200.
const ack = (msg = "OK") =>
  Response.json({ status: "received", msg }, { status: 200 });

export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return ack("bad_json");
  }

  const { paymentID, trxID, amount, merchantInvoiceNumber, transactionStatus } =
    body;

  // ── Find the order by invoice number ────────────────────────────────────────
  let order = null;
  try {
    const rows = await sql`
      SELECT id, store_id, order_number, status, payment_status, grand_total
      FROM   orders
      WHERE  order_number = ${merchantInvoiceNumber}
      LIMIT  1
    `;
    order = rows[0] ?? null;
  } catch (err) {
    console.error("[bKash IPN] DB lookup error:", err);
  }

  if (!order) {
    await logIPNEvent({
      storeId: null,
      integration: "bkash",
      rawPayload: body,
      verified: false,
      actionTaken: "order_not_found",
      errorMessage: `No order found for invoice: ${merchantInvoiceNumber}`,
    });
    return ack("order_not_found");
  }

  // ── Load bKash credentials for this store ───────────────────────────────────
  const creds = await getDecryptedCredentials({
    storeId: order.store_id,
    integration: "bkash",
  });

  if (!creds || !creds.is_active) {
    await logIPNEvent({
      storeId: order.store_id,
      integration: "bkash",
      rawPayload: body,
      verified: false,
      orderId: order.id,
      orderNumber: order.order_number,
      actionTaken: "integration_not_configured",
    });
    return ack("integration_inactive");
  }

  // ── Re-verify with bKash Query Payment API ──────────────────────────────────
  // We never trust the IPN status alone. Always re-query independently.
  let verified = false;
  let queryData = {};

  try {
    const baseUrl = creds.sandbox
      ? "https://tokenized.sandbox.bka.sh"
      : "https://tokenized.pay.bka.sh";

    // Step 1: Get token
    const tokenRes = await fetch(
      `${baseUrl}/v1.2.0-beta/tokenized/checkout/token/grant`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          username: creds.username,
          password: creds.password,
        },
        body: JSON.stringify({
          app_key: creds.app_key,
          app_secret: creds.app_secret,
        }),
      },
    );
    const tokenJson = await tokenRes.json();
    const idToken = tokenJson?.id_token;

    if (!idToken) throw new Error("Failed to obtain bKash token");

    // Step 2: Query payment status
    const queryRes = await fetch(
      `${baseUrl}/v1.2.0-beta/tokenized/checkout/payment/status`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          authorization: idToken,
          "x-app-key": creds.app_key,
        },
        body: JSON.stringify({ paymentID }),
      },
    );
    queryData = await queryRes.json();
    verified = queryData?.transactionStatus === "Completed";
  } catch (err) {
    console.error("[bKash IPN] Verification API error:", err);
    await logIPNEvent({
      storeId: order.store_id,
      integration: "bkash",
      rawPayload: body,
      verified: false,
      orderId: order.id,
      orderNumber: order.order_number,
      actionTaken: "verification_api_error",
      errorMessage: err.message,
    });
    return ack("verification_error");
  }

  if (!verified) {
    await logIPNEvent({
      storeId: order.store_id,
      integration: "bkash",
      rawPayload: body,
      verified: false,
      orderId: order.id,
      orderNumber: order.order_number,
      actionTaken: "not_completed",
      errorMessage: `Status: ${queryData?.transactionStatus}`,
    });
    return ack("not_verified");
  }

  // ── Idempotency: don't re-process already-paid orders ───────────────────────
  if (order.payment_status === "paid") {
    await logIPNEvent({
      storeId: order.store_id,
      integration: "bkash",
      rawPayload: body,
      verified: true,
      orderId: order.id,
      orderNumber: order.order_number,
      actionTaken: "already_paid",
    });
    return ack("already_processed");
  }

  // ── Apply payment update + state machine transition ──────────────────────────
  try {
    await updatePayment({
      storeId: order.store_id,
      orderId: order.id,
      paymentStatus: "paid",
      paymentMeta: {
        trx_id: trxID,
        payment_id: paymentID,
        amount: queryData.amount,
        currency: queryData.currency,
        sender_msisdn: queryData.customerMsisdn,
        verified_at: new Date().toISOString(),
        gateway: "bkash",
        raw_status: queryData.transactionStatus,
      },
    });

    // Only transition if currently pending (COD might already be processing)
    if (order.status === "pending") {
      await transitionStatus({
        storeId: order.store_id,
        orderId: order.id,
        toStatus: "processing",
        note: `Auto-transitioned via bKash IPN. TrxID: ${trxID}`,
      });
    }

    await logIPNEvent({
      storeId: order.store_id,
      integration: "bkash",
      rawPayload: body,
      verified: true,
      orderId: order.id,
      orderNumber: order.order_number,
      actionTaken: "payment_confirmed_and_processing",
    });
  } catch (err) {
    console.error("[bKash IPN] Order update error:", err);
    await logIPNEvent({
      storeId: order.store_id,
      integration: "bkash",
      rawPayload: body,
      verified: true,
      orderId: order.id,
      orderNumber: order.order_number,
      actionTaken: "update_failed",
      errorMessage: err.message,
    });
  }

  return ack("processed");
}
