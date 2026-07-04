/**
 * Steadfast One-Click Parcel Booking
 * POST /api/courier/steadfast/book
 *
 * Creates a consignment in Steadfast with customer address pre-filled,
 * saves the tracking code to the order, and returns the consignment details.
 *
 * Body: { orderId: "uuid" }
 */
import { withTenant } from "@/app/api/middleware/withTenant";
import { withRole } from "@/app/api/middleware/withRole";
import { getDecryptedCredentials } from "@/app/api/services/integration.service";
import { apiResponse } from "@/app/api/utils/response";
import sql from "@/app/api/utils/sql";

const STEADFAST_API = "https://portal.steadfast.com.bd/api/v1";

async function handler(request, context, tenant) {
  const { storeId } = tenant;

  let body;
  try {
    body = await request.json();
  } catch (_) {
    return apiResponse.badRequest("Invalid JSON body");
  }

  const { orderId } = body;
  if (!orderId) return apiResponse.badRequest("orderId is required");

  // Load order
  const orders = await sql`
    SELECT o.*, s.name AS store_name, s.contact_phone AS store_phone
    FROM orders o
    JOIN stores s ON s.id = o.store_id
    WHERE o.id = ${orderId} AND o.store_id = ${storeId}
    LIMIT 1
  `;
  const order = orders[0];
  if (!order) return apiResponse.notFound("Order not found");

  if (order.tracking_code) {
    return apiResponse.badRequest(
      `Already booked — Tracking: ${order.tracking_code}`,
    );
  }

  // Load Steadfast credentials
  const creds = await getDecryptedCredentials({
    storeId,
    integration: "steadfast",
  });
  if (!creds || !creds.is_active) {
    return apiResponse.badRequest(
      "Steadfast integration is not enabled. Please configure it in Integrations.",
    );
  }

  // Build address string
  const addr = order.customer_address || {};
  const recipientAddress =
    [addr.line1, addr.line2, addr.area, addr.district || addr.city]
      .filter(Boolean)
      .join(", ") || "Dhaka, Bangladesh";

  // Build consignment payload
  const consignmentPayload = {
    invoice: order.order_number,
    recipient_name: order.customer_name,
    recipient_phone: order.customer_phone,
    recipient_address: recipientAddress,
    cod_amount:
      order.payment_method === "cod"
        ? Number(order.cod_exact_amount || order.grand_total)
        : 0,
    note: order.notes || "",
  };

  // Create consignment
  const sfRes = await fetch(`${STEADFAST_API}/create_order`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Api-Key": creds.api_key,
      "Secret-Key": creds.secret_key,
    },
    body: JSON.stringify(consignmentPayload),
  });

  const sfData = await sfRes.json();

  if (!sfRes.ok || sfData.status !== 200) {
    console.error("[Steadfast booking]", sfData);
    return apiResponse.badRequest(
      sfData?.message || "Steadfast booking failed. Check API credentials.",
    );
  }

  const { consignment_id, tracking_code } = sfData.consignment || {};

  if (!tracking_code) {
    return apiResponse.internalError("Steadfast returned no tracking code");
  }

  // Save tracking info to order
  await sql`
    UPDATE orders SET
      consignment_id = ${consignment_id || null},
      tracking_code  = ${tracking_code},
      courier        = 'steadfast',
      updated_at     = NOW()
    WHERE id = ${orderId} AND store_id = ${storeId}
  `;

  // Log status history
  await sql`
    INSERT INTO order_status_history (order_id, store_id, from_status, to_status, note)
    VALUES (${orderId}, ${storeId}, ${order.status}, ${order.status}, ${`Steadfast booked. Tracking: ${tracking_code}`})
  `;

  return apiResponse.ok({
    consignment_id,
    tracking_code,
    courier: "steadfast",
    message: `Parcel booked successfully! Tracking: ${tracking_code}`,
  });
}

export const POST = (req, ctx) =>
  withTenant(
    withRole("orders:write", (req2, ctx2, tenant) =>
      handler(req2, ctx2, tenant),
    ),
  )(req, ctx);
