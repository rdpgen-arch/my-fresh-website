/**
 * POST /api/orders/:orderId/status  — State machine transition
 *
 * This is a dedicated sub-route to make the intent crystal clear:
 * changing order status is a meaningful business event, not a generic PATCH.
 *
 * Body: { "status": "processing", "note": "Payment verified by phone" }
 *
 * RBAC: orders:write
 */

import { withTenant } from "@/app/api/middleware/withTenant";
import { withRole } from "@/app/api/middleware/withRole";
import { transitionStatus, getOrder } from "@/app/api/services/order.service";
import { sendOrderStatusUpdate } from "@/app/api/services/email.service";
import {
  sendSMS,
  smsOrderShipped,
  smsNewOrderAlert,
} from "@/app/api/services/sms.service";
import { apiResponse } from "@/app/api/utils/response";
import sql from "@/app/api/utils/sql";

export const POST = withTenant(
  withRole("orders:write", async (request, { params }, tenant) => {
    const { orderId } = await params;

    let body;
    try {
      body = await request.json();
    } catch {
      return apiResponse.badRequest("Request body must be valid JSON.");
    }

    const { status: toStatus, note } = body ?? {};
    if (!toStatus || typeof toStatus !== "string")
      return apiResponse.badRequest(
        "`status` is required and must be a string.",
      );

    const VALID_STATUSES = [
      "pending",
      "processing",
      "shipped",
      "delivered",
      "returned",
      "cancelled",
    ];
    if (!VALID_STATUSES.includes(toStatus)) {
      return apiResponse.badRequest(
        `"${toStatus}" is not a valid status. Must be one of: ${VALID_STATUSES.join(", ")}.`,
      );
    }

    try {
      const updated = await transitionStatus({
        storeId: tenant.storeId,
        orderId,
        toStatus,
        note: note ?? null,
        changedBy: tenant.userId ?? null,
      });

      // Non-blocking: email + SMS side effects
      Promise.all([
        getOrder({ storeId: tenant.storeId, orderId }),
        sql`SELECT slug, name, contact_phone FROM stores WHERE id = ${tenant.storeId} LIMIT 1`,
      ])
        .then(async ([fullOrder, stores]) => {
          const store = stores[0];

          // Email notification
          if (fullOrder?.customer_email) {
            await sendOrderStatusUpdate({
              order: fullOrder,
              toStatus,
              storeName: store?.name ?? "",
              storeSlug: store?.slug ?? "",
            }).catch(console.error);
          }

          // SMS: customer notification when shipped
          if (toStatus === "shipped" && fullOrder?.customer_phone) {
            await sendSMS({
              storeId: tenant.storeId,
              to: fullOrder.customer_phone,
              message: smsOrderShipped({
                orderNumber: fullOrder.order_number,
                customerName: fullOrder.customer_name,
                trackingCode: fullOrder.tracking_code || null,
                courier: fullOrder.courier || null,
                storeName: store?.name || "Store",
              }),
              type: "order_shipped",
            }).catch(console.error);
          }

          // SMS: low stock alerts after delivery (stock has been consumed)
          if (toStatus === "delivered" || toStatus === "processing") {
            checkAndAlertLowStock(
              tenant.storeId,
              orderId,
              store?.contact_phone,
            ).catch(console.error);
          }
        })
        .catch(console.error);

      return apiResponse.ok(updated);
    } catch (err) {
      if (err.code === "NOT_FOUND")
        return apiResponse.notFound("Order not found.");
      if (err.code === "INVALID_TRANSITION")
        return apiResponse.badRequest(err.message);
      console.error("[POST /api/orders/:orderId/status]", err);
      return apiResponse.internalError("Failed to update order status.");
    }
  }),
);

/**
 * Check products in this order for low stock and send SMS alerts to merchant.
 */
async function checkAndAlertLowStock(storeId, orderId, merchantPhone) {
  if (!merchantPhone) return;

  const lowStockProducts = await sql`
    SELECT p.name, p.sku, p.stock_quantity, p.low_stock_threshold
    FROM order_items oi
    JOIN products p ON p.id = oi.product_id
    WHERE oi.order_id = ${orderId}
      AND p.store_id = ${storeId}
      AND p.stock_quantity IS NOT NULL
      AND p.stock_quantity <= COALESCE(p.low_stock_threshold, 5)
      AND p.stock_quantity >= 0
  `;

  for (const product of lowStockProducts) {
    await sendSMS({
      storeId,
      to: merchantPhone,
      message: `Low stock alert! "${product.name}" (${product.sku}) has only ${product.stock_quantity} units left. Please restock.`,
      type: "low_stock_alert",
    }).catch(console.error);
  }
}
