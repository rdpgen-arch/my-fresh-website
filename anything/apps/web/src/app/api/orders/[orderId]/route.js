/**
 * GET   /api/orders/:orderId          — Fetch order with items + history
 * PATCH /api/orders/:orderId          — Update mutable fields (notes, customer info)
 * POST  /api/orders/:orderId/status   — Transition state machine (via sub-route)
 */

import { withTenant } from "@/app/api/middleware/withTenant";
import { withRole } from "@/app/api/middleware/withRole";
import { getOrder, updateOrder } from "@/app/api/services/order.service";
import { apiResponse } from "@/app/api/utils/response";

export const GET = withTenant(
  withRole("orders:read", async (_req, { params }, tenant) => {
    const { orderId } = await params;
    const order = await getOrder({ storeId: tenant.storeId, orderId });
    if (!order) return apiResponse.notFound("Order not found.");
    return apiResponse.ok(order);
  }),
);

export const PATCH = withTenant(
  withRole("orders:write", async (request, { params }, tenant) => {
    const { orderId } = await params;

    let body;
    try {
      body = await request.json();
    } catch {
      return apiResponse.badRequest("Request body must be valid JSON.");
    }

    if (!body || Object.keys(body).length === 0)
      return apiResponse.badRequest("Provide at least one field to update.");

    try {
      const updated = await updateOrder({
        storeId: tenant.storeId,
        orderId,
        updates: body,
      });
      return apiResponse.ok(updated);
    } catch (err) {
      if (err.code === "NOT_FOUND")
        return apiResponse.notFound("Order not found.");
      console.error("[PATCH /api/orders/:orderId]", err);
      return apiResponse.internalError("Failed to update order.");
    }
  }),
);
