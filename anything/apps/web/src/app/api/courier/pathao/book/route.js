/**
 * Pathao One-Click Parcel Booking
 * POST /api/courier/pathao/book
 *
 * Body: { orderId, recipientCityId, recipientZoneId, recipientAreaId?, deliveryType?, itemWeight? }
 */
import { withTenant } from "@/app/api/middleware/withTenant";
import { withRole } from "@/app/api/middleware/withRole";
import { getDecryptedCredentials } from "@/app/api/services/integration.service";
import { createPathaoOrder } from "@/app/api/services/pathao.service";
import { apiResponse } from "@/app/api/utils/response";
import sql from "@/app/api/utils/sql";

async function handler(request, context, tenant) {
  const { storeId } = tenant;

  let body;
  try {
    body = await request.json();
  } catch (_) {
    return apiResponse.badRequest("Invalid JSON body");
  }

  const {
    orderId,
    recipientCityId,
    recipientZoneId,
    recipientAreaId,
    deliveryType,
    itemWeight,
    specialInstruction,
  } = body;
  if (!orderId) return apiResponse.badRequest("orderId is required");

  // Load order with items
  const orders = await sql`
    SELECT o.*,
      COALESCE(json_agg(json_build_object('id', oi.id, 'name', oi.name, 'quantity', oi.quantity)) FILTER (WHERE oi.id IS NOT NULL), '[]'::json) AS items
    FROM orders o
    LEFT JOIN order_items oi ON oi.order_id = o.id
    WHERE o.id = ${orderId} AND o.store_id = ${storeId}
    GROUP BY o.id
    LIMIT 1
  `;
  const order = orders[0];
  if (!order) return apiResponse.notFound("Order not found");

  if (order.tracking_code && order.courier === "pathao") {
    return apiResponse.badRequest(
      `Already booked with Pathao — Tracking: ${order.tracking_code}`,
    );
  }

  // Load Pathao credentials
  const creds = await getDecryptedCredentials({
    storeId,
    integration: "pathao",
  });
  if (!creds || !creds.is_active) {
    return apiResponse.badRequest(
      "Pathao integration is not enabled. Configure it in Integrations.",
    );
  }

  const result = await createPathaoOrder({
    storeId,
    creds,
    order,
    booking: {
      recipientCityId,
      recipientZoneId,
      recipientAreaId,
      deliveryType,
      itemWeight,
      specialInstruction,
    },
  });

  // Save tracking info
  await sql`
    UPDATE orders SET
      consignment_id = ${result.consignment_id || null},
      tracking_code  = ${result.tracking_code},
      courier        = 'pathao',
      updated_at     = NOW()
    WHERE id = ${orderId} AND store_id = ${storeId}
  `;

  await sql`
    INSERT INTO order_status_history (order_id, store_id, from_status, to_status, note)
    VALUES (${orderId}, ${storeId}, ${order.status}, ${order.status},
            ${`Pathao booked. Consignment: ${result.consignment_id}`})
  `;

  return apiResponse.ok({
    consignment_id: result.consignment_id,
    tracking_code: result.tracking_code,
    courier: "pathao",
    message: `Parcel booked with Pathao! Consignment: ${result.consignment_id}`,
  });
}

export const POST = (req, ctx) =>
  withTenant(
    withRole("orders:write", (req2, ctx2, tenant) =>
      handler(req2, ctx2, tenant),
    ),
  )(req, ctx);
