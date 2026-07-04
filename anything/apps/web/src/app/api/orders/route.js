/**
 * GET  /api/orders  — List orders (paginated, filtered)
 * POST /api/orders  — Create a new order
 *
 * RBAC: orders:read / orders:write
 */

import { withTenant } from "@/app/api/middleware/withTenant";
import { withRole } from "@/app/api/middleware/withRole";
import { listOrders, createOrder } from "@/app/api/services/order.service";
import { apiResponse } from "@/app/api/utils/response";

export const GET = withTenant(
  withRole("orders:read", async (request, _ctx, tenant) => {
    const { searchParams } = new URL(request.url);
    const result = await listOrders({
      storeId: tenant.storeId,
      status: searchParams.get("status") ?? undefined,
      search: searchParams.get("search") ?? undefined,
      paymentMethod: searchParams.get("paymentMethod") ?? undefined,
      page: searchParams.get("page") ?? 1,
      limit: searchParams.get("limit") ?? 50,
      sortBy: searchParams.get("sortBy") ?? "created_at",
      sortDir: searchParams.get("sortDir") ?? "desc",
    });

    return apiResponse.ok(result.orders, {
      total: result.total,
      page: result.page,
      limit: result.limit,
      pages: Math.ceil(result.total / result.limit),
    });
  }),
);

export const POST = withTenant(
  withRole("orders:write", async (request, _ctx, tenant) => {
    let body;
    try {
      body = await request.json();
    } catch {
      return apiResponse.badRequest("Request body must be valid JSON.");
    }

    try {
      const order = await createOrder({
        storeId: tenant.storeId,
        customerName: body.customerName ?? body.customer_name,
        customerPhone: body.customerPhone ?? body.customer_phone,
        customerEmail: body.customerEmail ?? body.customer_email,
        customerAddress: body.customerAddress ?? body.customer_address ?? {},
        shippingZoneId: body.shippingZoneId ?? body.shipping_zone_id,
        paymentMethod: body.paymentMethod ?? body.payment_method ?? "cod",
        currency: body.currency ?? "BDT",
        discountAmount: body.discountAmount ?? body.discount_amount ?? 0,
        notes: body.notes,
        source: body.source ?? "admin",
        items: body.items ?? [],
      });
      return apiResponse.created(order);
    } catch (err) {
      if (err.code === "VALIDATION_ERROR")
        return apiResponse.badRequest(err.message, err.details);
      if (err.code === "23505")
        return apiResponse.conflict(
          "Duplicate order number generated. Please retry.",
        );
      console.error("[POST /api/orders]", err);
      return apiResponse.internalError("Failed to create order.");
    }
  }),
);
