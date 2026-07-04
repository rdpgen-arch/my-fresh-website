/**
 * POST /api/storefront/:slug/checkout
 *
 * Public — no JWT required (customer-facing checkout endpoint).
 *
 * Creates an order and returns the result.
 * For COD: returns the order immediately.
 * For gateway payments (bKash, SSLCommerz): returns the payment initiation URL
 * that the client should redirect to.
 *
 * This route calls the same createOrder() service as the admin API, ensuring
 * identical business logic, state machine, and CAPI event firing.
 */

import sql from "@/app/api/utils/sql";
import { createOrder } from "@/app/api/services/order.service";
import {
  getDecryptedCredentials,
  initiateBKashPayment,
  initiateSSLCommerzPayment,
} from "@/app/api/services/integration.service";
import {
  sendOrderConfirmation,
  sendStaffOrderNotification,
} from "@/app/api/services/email.service";
import {
  sendSMS,
  smsOrderPlaced,
  smsNewOrderAlert,
} from "@/app/api/services/sms.service";

export async function POST(request, { params }) {
  const { slug } = await params;

  // ── Resolve store ─────────────────────────────────────────────────────────
  const storeRows = await sql`
    SELECT id, name FROM stores WHERE slug = ${slug} AND is_active = TRUE LIMIT 1
  `;
  const store = storeRows[0];
  if (!store) {
    return Response.json(
      { success: false, error: "Store not found." },
      { status: 404 },
    );
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json(
      { success: false, error: "Invalid JSON." },
      { status: 400 },
    );
  }

  const {
    customerName,
    customerPhone,
    customerEmail,
    customerAddress,
    shippingZoneId,
    paymentMethod = "cod",
    items = [],
    notes,
    couponCode, // FIX 1D: optional coupon
  } = body;

  // ── Basic validation ──────────────────────────────────────────────────────
  if (!customerName?.trim())
    return Response.json(
      { success: false, error: "Customer name is required." },
      { status: 400 },
    );
  if (!customerPhone?.trim())
    return Response.json(
      { success: false, error: "Customer phone is required." },
      { status: 400 },
    );
  if (!items.length)
    return Response.json(
      { success: false, error: "Cart is empty." },
      { status: 400 },
    );

  // ── Verify payment method is active for this store ────────────────────────
  if (paymentMethod !== "cod") {
    const integrationRows = await sql`
      SELECT id FROM integration_configs
      WHERE  store_id    = ${store.id}
        AND  integration = ${paymentMethod}
        AND  is_active   = TRUE
      LIMIT  1
    `;
    if (!integrationRows[0]) {
      return Response.json(
        {
          success: false,
          error: `Payment method "${paymentMethod}" is not available.`,
        },
        { status: 400 },
      );
    }
  }

  // ── Fetch current product prices from DB (never trust client-side prices) ─
  const productIds = items.map((i) => i.productId).filter(Boolean);
  let dbProducts = [];
  if (productIds.length) {
    dbProducts = await sql(
      `SELECT id, sku, name, price, currency, stock_quantity, dynamic_attributes, status
       FROM products
       WHERE store_id = $1 AND id = ANY($2::uuid[])`,
      [store.id, productIds],
    );
  }
  const dbProductMap = Object.fromEntries(dbProducts.map((p) => [p.id, p]));

  // ── Build verified items list ─────────────────────────────────────────────
  const verifiedItems = [];
  for (const item of items) {
    const dbProd = dbProductMap[item.productId];
    if (!dbProd) {
      return Response.json(
        { success: false, error: `Product "${item.productId}" not found.` },
        { status: 400 },
      );
    }
    if (dbProd.status !== "published") {
      return Response.json(
        { success: false, error: `"${dbProd.name}" is no longer available.` },
        { status: 400 },
      );
    }
    if (dbProd.stock_quantity < item.quantity) {
      return Response.json(
        { success: false, error: `Insufficient stock for "${dbProd.name}".` },
        { status: 400 },
      );
    }
    verifiedItems.push({
      productId: item.productId,
      sku: dbProd.sku,
      name: dbProd.name,
      unitPrice: Number(dbProd.price), // ← server price, not client price
      quantity: item.quantity,
      dynamicAttributes:
        item.selectedAttributes ?? dbProd.dynamic_attributes ?? {},
    });
  }

  // FIX 1D: Validate coupon if provided
  let couponId = null;
  let discountAmount = 0;
  if (couponCode?.trim()) {
    const coupons = await sql`
      SELECT id, discount_type, discount_value, min_order_value, max_uses, uses_count, expires_at, is_active
      FROM coupons
      WHERE store_id = ${store.id}
        AND UPPER(code) = UPPER(${couponCode.trim()})
      LIMIT 1
    `;
    const coupon = coupons[0];
    if (!coupon || !coupon.is_active) {
      return Response.json(
        { success: false, error: "Invalid or inactive coupon code." },
        { status: 400 },
      );
    }
    if (coupon.expires_at && new Date(coupon.expires_at) < new Date()) {
      return Response.json(
        { success: false, error: "This coupon has expired." },
        { status: 400 },
      );
    }
    if (coupon.max_uses && coupon.uses_count >= coupon.max_uses) {
      return Response.json(
        { success: false, error: "This coupon has reached its usage limit." },
        { status: 400 },
      );
    }

    // Compute subtotal first to check min_order_value
    const subtotal = verifiedItems.reduce(
      (s, i) => s + i.unitPrice * i.quantity,
      0,
    );
    if (
      Number(coupon.min_order_value) > 0 &&
      subtotal < Number(coupon.min_order_value)
    ) {
      return Response.json(
        {
          success: false,
          error: `Minimum order value for this coupon is ৳${coupon.min_order_value}.`,
        },
        { status: 400 },
      );
    }

    couponId = coupon.id;
    discountAmount =
      coupon.discount_type === "percentage"
        ? (subtotal * Number(coupon.discount_value)) / 100
        : Number(coupon.discount_value);
  }

  // ── Create the order ──────────────────────────────────────────────────────
  let order;
  try {
    order = await createOrder({
      storeId: store.id,
      customerName: customerName.trim(),
      customerPhone: customerPhone.trim(),
      customerEmail: customerEmail ?? null,
      customerAddress: customerAddress ?? {},
      shippingZoneId: shippingZoneId ?? null,
      paymentMethod,
      currency: dbProducts[0]?.currency ?? "BDT",
      discountAmount, // FIX 1D: from coupon
      couponId, // FIX 1D: for uses_count increment
      couponCode: couponCode?.trim() ?? null,
      source: "storefront",
      notes: notes ?? null,
      items: verifiedItems,
    });
  } catch (err) {
    if (err.code === "VALIDATION_ERROR") {
      return Response.json(
        { success: false, error: err.message, details: err.details },
        { status: 400 },
      );
    }
    // FIX 1B: handle race-condition stock error
    if (err.code === "INSUFFICIENT_STOCK") {
      return Response.json(
        { success: false, error: err.message },
        { status: 409 },
      );
    }
    console.error("[storefront/checkout]", err);
    return Response.json(
      { success: false, error: "Failed to create order." },
      { status: 500 },
    );
  }

  // ── COD: return order directly ────────────────────────────────────────────
  if (paymentMethod === "cod") {
    // Fire confirmation emails + SMS in background (non-blocking)
    Promise.all([
      sendOrderConfirmation({ order, storeName: store.name, storeSlug: slug }),
      sendStaffOrderNotification({
        order,
        storeName: store.name,
        staffEmail: process.env.STAFF_NOTIFICATION_EMAIL ?? "",
      }).catch(() => null),
      // SMS: customer confirmation
      sendSMS({
        storeId: store.id,
        to: order.customer_phone,
        message: smsOrderPlaced({
          orderNumber: order.order_number,
          customerName: order.customer_name,
          grandTotal: Number(order.grand_total).toLocaleString(),
          storeName: store.name,
        }),
        type: "order_placed_customer",
      }).catch(() => null),
      // SMS: merchant new order alert
      (async () => {
        const storeDetails =
          await sql`SELECT contact_phone FROM stores WHERE id = ${store.id} LIMIT 1`;
        const merchantPhone = storeDetails[0]?.contact_phone;
        if (merchantPhone) {
          return sendSMS({
            storeId: store.id,
            to: merchantPhone,
            message: smsNewOrderAlert({
              orderNumber: order.order_number,
              customerName: order.customer_name,
              grandTotal: Number(order.grand_total).toLocaleString(),
            }),
            type: "new_order_merchant",
          });
        }
      })().catch(() => null),
    ]).catch(console.error);

    return Response.json({
      success: true,
      orderNumber: order.order_number,
      orderId: order.id,
      grandTotal: order.grand_total,
      paymentType: "cod",
    });
  }

  // ── Gateway payment initiation ────────────────────────────────────────────
  const appUrl = process.env.NEXT_PUBLIC_CREATE_APP_URL ?? "";

  try {
    const creds = await getDecryptedCredentials({
      storeId: store.id,
      integration: paymentMethod,
    });
    if (!creds)
      throw Object.assign(new Error("Integration credentials not found."), {
        code: "GATEWAY_ERROR",
      });

    let redirectUrl = null;

    if (paymentMethod === "bkash") {
      const callbackUrl = `${appUrl}/api/callbacks/bkash/return?orderId=${order.id}`;
      const { bkashURL, paymentID } = await initiateBKashPayment(
        order,
        creds,
        callbackUrl,
      );
      redirectUrl = bkashURL;

      // Store paymentID in order's payment_meta so return URL can find it
      await sql`
        UPDATE orders SET
          payment_meta = payment_meta || ${JSON.stringify({ paymentID })}::jsonb,
          updated_at = NOW()
        WHERE id = ${order.id}
      `;
    } else if (paymentMethod === "sslcommerz") {
      const { GatewayPageURL } = await initiateSSLCommerzPayment(
        order,
        creds,
        appUrl,
      );
      redirectUrl = GatewayPageURL;
    }

    return Response.json({
      success: true,
      orderNumber: order.order_number,
      orderId: order.id,
      grandTotal: order.grand_total,
      paymentType: "gateway",
      redirectUrl,
    });
  } catch (err) {
    if (err.code === "GATEWAY_ERROR") {
      console.error(
        "[storefront/checkout] Gateway initiation failed:",
        err.message,
      );
      return Response.json(
        {
          success: false,
          error:
            "Payment gateway error. Please try again or use Cash on Delivery.",
        },
        { status: 502 },
      );
    }
    console.error("[storefront/checkout] Unexpected gateway error:", err);
    return Response.json(
      { success: false, error: "Payment initiation failed." },
      { status: 500 },
    );
  }
}
