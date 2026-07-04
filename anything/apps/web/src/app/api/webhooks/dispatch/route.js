/**
 * POST /api/webhooks/dispatch  — Internal async dispatch endpoint
 *
 * !! THIS IS AN INTERNAL ROUTE. It is NOT tenant-protected via withTenant. !!
 *
 * It is protected by a shared internal secret key (`X-Internal-Key` header)
 * to prevent any unauthorized public invocation.
 *
 * The workflow:
 *   1. The main API (product/order route) calls `triggerEvent()`.
 *   2. `triggerEvent()` creates a `webhook_deliveries` row and then
 *      fire-and-forgets a POST to THIS route with the delivery ID.
 *   3. This route calls `dispatchOne(deliveryId)` in its own serverless
 *      invocation — fully isolated from the original user-facing request.
 *
 * This design means:
 *   - User-facing API latency is never impacted by outbound HTTP calls.
 *   - Each dispatch has its own full serverless execution time budget.
 *   - If this invocation times out (rare), the retry processor rescues it.
 */

import { dispatchOne } from "@/app/api/services/webhook.service";

export async function POST(request) {
  // ── Internal auth guard ────────────────────────────────────────────────────
  const internalKey = process.env.AUTH_SECRET ?? "";
  const provided = request.headers.get("x-internal-key") ?? "";

  if (!provided || provided !== internalKey) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  // ── Parse body ─────────────────────────────────────────────────────────────
  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { deliveryId } = body;

  if (!deliveryId) {
    return Response.json(
      { error: "`deliveryId` is required." },
      { status: 400 },
    );
  }

  // ── Dispatch and respond immediately ───────────────────────────────────────
  // We acknowledge receipt right away. The actual HTTP call happens inline
  // but in its own execution context thanks to the serverless invocation boundary.
  const { success } = await dispatchOne(deliveryId);

  return Response.json({ ok: true, deliveryId, success }, { status: 200 });
}
