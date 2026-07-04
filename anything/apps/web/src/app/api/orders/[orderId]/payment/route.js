/**
 * POST /api/orders/:orderId/payment  — Update payment status + gateway meta
 *
 * Called by:
 *   - Admin staff after manual COD collection confirmation
 *   - Webhook receiver from bKash / SSLCommerz / Nagad callbacks
 *   - Zero-code integration layer (Stape, Make.com, Zapier)
 *
 * Body:
 *   {
 *     "paymentStatus": "paid",
 *     "paymentMeta": {
 *       "trx_id": "TRX123", "sender_msisdn": "01700000000",
 *       "amount": 1500, "verified_at": "2026-05-20T14:00:00Z"
 *     }
 *   }
 *
 * RBAC: orders:write
 */

import { withTenant } from "@/app/api/middleware/withTenant";
import { withRole } from "@/app/api/middleware/withRole";
import { updatePayment } from "@/app/api/services/order.service";
import { apiResponse } from "@/app/api/utils/response";

export const POST = withTenant(
  withRole("orders:write", async (request, { params }, tenant) => {
    const { orderId } = await params;

    let body;
    try {
      body = await request.json();
    } catch {
      return apiResponse.badRequest("Request body must be valid JSON.");
    }

    const { paymentStatus, paymentMeta } = body ?? {};

    if (!paymentStatus) {
      return apiResponse.badRequest("`paymentStatus` is required.");
    }

    try {
      const updated = await updatePayment({
        storeId: tenant.storeId,
        orderId,
        paymentStatus,
        paymentMeta: paymentMeta ?? {},
      });
      return apiResponse.ok(updated);
    } catch (err) {
      if (err.code === "NOT_FOUND")
        return apiResponse.notFound("Order not found.");
      if (err.code === "VALIDATION_ERROR")
        return apiResponse.badRequest(err.message);
      console.error("[POST /api/orders/:orderId/payment]", err);
      return apiResponse.internalError("Failed to update payment.");
    }
  }),
);
