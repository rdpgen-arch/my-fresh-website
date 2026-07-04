/**
 * POST /api/callbacks/steadfast/webhook
 *
 * Steadfast Courier delivery status webhook handler.
 *
 * Steadfast sends delivery updates (delivered, returned, in_transit, etc.)
 * to this endpoint. We map their status to our order state machine.
 *
 * Steadfast Webhook Payload:
 *   { consignment_id, invoice, status, delivery_date, ... }
 *
 * Security: Steadfast signs requests with X-Steadfast-API-Secret header.
 * We verify it against the stored api_key for the store.
 *
 * `invoice` maps to our `order_number`.
 */

import sql from "@/app/api/utils/sql";
import {
  getDecryptedCredentials,
  logIPNEvent,
} from "@/app/api/services/integration.service";
import { transitionStatus } from "@/app/api/services/order.service";

const ack = (msg) => Response.json({ received: true, msg }, { status: 200 });

// Steadfast status → our order status mapping
const STEADFAST_STATUS_MAP = {
  delivered: "delivered",
  partial_delivered: "delivered",
  returned: "returned",
  cancelled: "cancelled",
};

export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return ack("bad_json");
  }

  const { consignment_id, invoice, status: sfStatus } = body;
  const incomingKey = request.headers.get("x-steadfast-api-secret") ?? "";

  // ── Find the order ───────────────────────────────────────────────────────────
  let order = null;
  try {
    const rows = await sql`
      SELECT id, store_id, order_number, status
      FROM   orders WHERE order_number = ${invoice} LIMIT 1
    `;
    order = rows[0] ?? null;
  } catch (err) {
    console.error("[Steadfast WH] DB error:", err);
  }

  if (!order) {
    await logIPNEvent({
      storeId: null,
      integration: "steadfast",
      rawPayload: body,
      verified: false,
      actionTaken: "order_not_found",
      errorMessage: `No order for invoice: ${invoice}`,
    });
    return ack("order_not_found");
  }

  // ── Verify API key ───────────────────────────────────────────────────────────
  const creds = await getDecryptedCredentials({
    storeId: order.store_id,
    integration: "steadfast",
  });
  if (!creds?.is_active || incomingKey !== creds.api_key) {
    await logIPNEvent({
      storeId: order.store_id,
      integration: "steadfast",
      rawPayload: body,
      verified: false,
      orderId: order.id,
      orderNumber: order.order_number,
      actionTaken: "signature_invalid",
    });
    return ack("unauthorized");
  }

  // ── Map status + transition ──────────────────────────────────────────────────
  const toStatus = STEADFAST_STATUS_MAP[sfStatus];

  if (!toStatus) {
    await logIPNEvent({
      storeId: order.store_id,
      integration: "steadfast",
      rawPayload: body,
      verified: true,
      orderId: order.id,
      orderNumber: order.order_number,
      actionTaken: "status_not_mapped",
      errorMessage: `Steadfast status: ${sfStatus}`,
    });
    return ack("status_not_mapped");
  }

  try {
    await transitionStatus({
      storeId: order.store_id,
      orderId: order.id,
      toStatus,
      note: `Auto-transitioned via Steadfast webhook. Status: ${sfStatus}, Consignment: ${consignment_id}`,
    });

    await logIPNEvent({
      storeId: order.store_id,
      integration: "steadfast",
      rawPayload: body,
      verified: true,
      orderId: order.id,
      orderNumber: order.order_number,
      actionTaken: `transitioned_to_${toStatus}`,
    });
  } catch (err) {
    // INVALID_TRANSITION is possible (e.g. already delivered). Log and move on.
    await logIPNEvent({
      storeId: order.store_id,
      integration: "steadfast",
      rawPayload: body,
      verified: true,
      orderId: order.id,
      orderNumber: order.order_number,
      actionTaken: "transition_failed",
      errorMessage: err.message,
    });
  }

  return ack("processed");
}
