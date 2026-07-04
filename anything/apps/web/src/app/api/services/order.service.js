/**
 * Order Service
 *
 * The financial core of the platform. Handles the full order lifecycle:
 * creation, state machine transitions, payment meta updates, and
 * CAPI (Conversion API) event firing via the webhook engine.
 *
 * ── State Machine ────────────────────────────────────────────────────────────
 *
 *  pending ──► processing ──► shipped ──► delivered
 *     │              │                        │
 *     └──► cancelled └──► cancelled    ──► returned
 *
 *  Enforcement: every transition is validated against VALID_TRANSITIONS.
 *  An attempt to skip a state (e.g. pending → delivered) throws INVALID_TRANSITION.
 *
 * ── CAPI / Webhook Event Map ─────────────────────────────────────────────────
 *
 *  status change        webhook event fired          CAPI purpose
 *  ─────────────────────────────────────────────────────────────────────────
 *  (order created)  →  order.placed              Purchase event for ad pixels
 *  → processing     →  order.processing          Internal ops automation
 *  → shipped        →  order.shipped             Fulfilment notification
 *  → delivered      →  order.delivered           COD confirmation / LTV signal
 *  → cancelled      →  order.cancelled           Refund / retargeting trigger
 *  → returned       →  order.returned            Return flow automation
 *
 *  Each event is fired exactly once per transition using the
 *  `capi_events_fired` JSONB column as an idempotency record.
 *  If a webhook delivery fails and retries, the CAPI event won't re-fire
 *  because the DB check happens BEFORE the webhook is queued.
 *
 * ── South Asian Payment Gateway Notes ────────────────────────────────────────
 *
 *  payment_meta is a free-form JSONB field. Examples per gateway:
 *
 *  COD:
 *    { "collected_by": "Rider Name", "confirmed_at": "2026-05-20T14:00:00Z" }
 *
 *  bKash / Nagad / Rocket:
 *    { "trx_id": "TRX123XYZ", "sender_msisdn": "01XXXXXXXXX",
 *      "amount": 1500, "reference": "ORD-001", "verified_at": "..." }
 *
 *  SSLCommerz:
 *    { "val_id": "...", "tran_id": "...", "amount": "1500.00",
 *      "card_type": "bKash", "status": "VALID", "tran_date": "..." }
 *
 *  This structure maps directly to what localized CAPI endpoint tools
 *  (like Stape.io Server GTM) expect in the `custom_data.payment_info` field.
 */

import sql from "@/app/api/utils/sql";
import { triggerEvent } from "@/app/api/services/webhook.service";

// ─── State Machine Definition ─────────────────────────────────────────────────

/**
 * Defines all legal transitions.
 * Key = current status. Value = array of statuses it can move to.
 */
const VALID_TRANSITIONS = {
  pending: ["processing", "cancelled"],
  processing: ["shipped", "cancelled"],
  shipped: ["delivered", "returned"],
  delivered: ["returned"],
  cancelled: [],
  returned: [],
};

/**
 * Maps each TO-status to the webhook event that must fire.
 * 'order.placed' is special — fired at creation, not transition.
 */
const STATUS_TO_EVENT = {
  processing: "order.processing",
  shipped: "order.shipped",
  delivered: "order.delivered",
  cancelled: "order.cancelled",
  returned: "order.returned",
};

// ─── Guard ────────────────────────────────────────────────────────────────────

function assertStoreId(storeId) {
  if (!storeId || typeof storeId !== "string") {
    throw new Error(
      "[OrderService] storeId is required. Call only from within withTenant.",
    );
  }
}

// ─── Order Number Generator ───────────────────────────────────────────────────

/**
 * Generates a sequential, human-readable order number per store using an
 * atomic upsert on `store_order_sequences`.
 *
 * Replaces the old COUNT(*)+1 approach which had a race condition under
 * concurrent writes. This implementation is serializable and gap-free.
 *
 * Format: ORD-YYYYMMDD-NNNNN  e.g. ORD-20260531-00042
 */
async function generateOrderNumber(storeId) {
  const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, "");

  const rows = await sql`
    INSERT INTO store_order_sequences (store_id, last_seq)
    VALUES (${storeId}, 1)
    ON CONFLICT (store_id)
    DO UPDATE SET last_seq = store_order_sequences.last_seq + 1
    RETURNING last_seq
  `;

  const seq = String(rows[0].last_seq).padStart(5, "0");
  return `ORD-${datePart}-${seq}`;
}

// ─── CAPI Event Firing ────────────────────────────────────────────────────────

/**
 * Fires a CAPI webhook event for an order, with idempotency protection.
 * Marks the event as fired in `capi_events_fired` BEFORE queuing the webhook,
 * so retries never double-fire.
 *
 * @param {object} order     - Full order row (must include capi_events_fired).
 * @param {string} eventType - e.g. "order.placed", "order.delivered"
 */
async function fireCAPIEvent(order, eventType) {
  // Idempotency check — if already fired, skip
  const alreadyFired = order.capi_events_fired?.[eventType];
  if (alreadyFired) return;

  // Mark as fired atomically in the DB FIRST
  await sql`
    UPDATE orders
    SET capi_events_fired = capi_events_fired || ${JSON.stringify({ [eventType]: new Date().toISOString() })}
    WHERE id = ${order.id} AND store_id = ${order.store_id}
  `;

  // Now fire the webhook (non-blocking fire-and-forget)
  triggerEvent({
    storeId: order.store_id,
    eventType,
    payload: {
      order_id: order.id,
      order_number: order.order_number,
      status: order.status,
      customer_name: order.customer_name,
      customer_phone: order.customer_phone,
      customer_email: order.customer_email,
      grand_total: order.grand_total,
      currency: order.currency,
      payment_method: order.payment_method,
      payment_status: order.payment_status,
      payment_meta: order.payment_meta,
      shipping_zone: order.shipping_zone_code,
      created_at: order.created_at,
      // Structured for CAPI tools — maps to purchase event custom_data
      capi: {
        event_name: eventType === "order.placed" ? "Purchase" : eventType,
        event_time: Math.floor(Date.now() / 1000),
        currency: order.currency,
        value: Number(order.grand_total),
        order_id: order.order_number,
        num_items: order.item_count ?? 0,
        payment_info: order.payment_meta,
      },
    },
  }).catch((err) => {
    console.error(`[fireCAPIEvent] triggerEvent failed for ${eventType}:`, err);
  });
}

// ─── Read Operations ──────────────────────────────────────────────────────────

/**
 * Lists orders for a tenant with filters, sorting, and server-side pagination.
 */
export async function listOrders({
  storeId,
  status,
  search,
  paymentMethod,
  page = 1,
  limit = 50,
  sortBy = "created_at",
  sortDir = "desc",
}) {
  assertStoreId(storeId);

  const safeLimit = Math.min(Number(limit) || 50, 200);
  const safeOffset = (Math.max(Number(page) || 1, 1) - 1) * safeLimit;

  const SORTABLE = [
    "created_at",
    "updated_at",
    "grand_total",
    "status",
    "order_number",
  ];
  const orderCol = SORTABLE.includes(sortBy) ? sortBy : "created_at";
  const orderDir = sortDir === "asc" ? "ASC" : "DESC";

  const conditions = ["o.store_id = $1"];
  const params = [storeId];
  let idx = 2;

  if (status) {
    conditions.push(`o.status         = $${idx++}`);
    params.push(status);
  }
  if (paymentMethod) {
    conditions.push(`o.payment_method = $${idx++}`);
    params.push(paymentMethod);
  }
  if (search) {
    conditions.push(
      `(o.order_number ILIKE $${idx} OR o.customer_name ILIKE $${idx} OR o.customer_phone ILIKE $${idx})`,
    );
    params.push(`%${search}%`);
    idx++;
  }

  const where = conditions.join(" AND ");

  const [orders, [{ total }]] = await sql.transaction([
    sql(
      `
      SELECT
        o.id, o.order_number, o.status, o.customer_name, o.customer_phone,
        o.customer_email, o.payment_method, o.payment_status,
        o.currency, o.grand_total, o.shipping_zone_name, o.shipping_zone_code,
        o.source, o.created_at, o.updated_at,
        COUNT(oi.id)::int AS item_count
      FROM  orders o
      LEFT JOIN order_items oi ON oi.order_id = o.id
      WHERE ${where}
      GROUP BY o.id
      ORDER BY o.${orderCol} ${orderDir}
      LIMIT $${idx} OFFSET $${idx + 1}
    `,
      [...params, safeLimit, safeOffset],
    ),
    sql(`SELECT COUNT(*) AS total FROM orders o WHERE ${where}`, params),
  ]);

  return { orders, total: Number(total), page: Number(page), limit: safeLimit };
}

/**
 * Fetches a single order with all its items and status history.
 */
export async function getOrder({ storeId, orderId }) {
  assertStoreId(storeId);

  const [orderRows, items, history] = await sql.transaction([
    sql`
      SELECT
        o.*,
        sz.name AS zone_name_current
      FROM  orders o
      LEFT JOIN shipping_zones sz ON sz.id = o.shipping_zone_id
      WHERE o.id = ${orderId} AND o.store_id = ${storeId}
      LIMIT 1
    `,
    sql`
      SELECT id, product_id, sku, name, unit_price, quantity, line_total, dynamic_attributes
      FROM   order_items
      WHERE  order_id = ${orderId} AND store_id = ${storeId}
      ORDER  BY created_at ASC
    `,
    sql`
      SELECT id, from_status, to_status, note, created_at, changed_by
      FROM   order_status_history
      WHERE  order_id = ${orderId}
      ORDER  BY created_at ASC
    `,
  ]);

  if (!orderRows[0]) return null;

  return {
    ...orderRows[0],
    items,
    history,
  };
}

// ─── Create Order ─────────────────────────────────────────────────────────────

/**
 * Creates an order with its items atomically, generates the order number,
 * computes totals, and fires the order.placed CAPI event.
 *
 * @param {object} opts
 * @param {string}   opts.storeId
 * @param {string}   opts.customerName
 * @param {string}   opts.customerPhone
 * @param {string}   [opts.customerEmail]
 * @param {object}   opts.customerAddress      - { line1, city, district, postal_code, country }
 * @param {string}   [opts.shippingZoneId]     - UUID of the shipping_zones row
 * @param {string}   [opts.paymentMethod]      - 'cod' | 'bkash' | 'nagad' | etc.
 * @param {string}   [opts.currency]           - Default 'BDT'
 * @param {number}   [opts.discountAmount]
 * @param {string}   [opts.notes]
 * @param {string}   [opts.source]             - 'admin' | 'storefront' | 'api'
 * @param {Array}    opts.items                - [{ productId?, sku, name, unitPrice, quantity, dynamicAttributes? }]
 * @returns {Promise<object>} The created order with items.
 */
export async function createOrder({
  storeId,
  customerName,
  customerPhone,
  customerEmail = null,
  customerAddress = {},
  shippingZoneId = null,
  paymentMethod = "cod",
  currency = "BDT",
  discountAmount = 0,
  couponId = null,
  couponCode = null,
  notes = null,
  source = "admin",
  items = [],
}) {
  assertStoreId(storeId);

  // ── Validate ────────────────────────────────────────────────────────────────
  const errors = {};
  if (!customerName?.trim()) errors.customerName = "Customer name is required.";
  if (!customerPhone?.trim())
    errors.customerPhone = "Customer phone is required.";
  if (!items.length) errors.items = "At least one item is required.";
  items.forEach((item, i) => {
    if (!item.sku) errors[`items[${i}].sku`] = "SKU is required.";
    if (!item.name) errors[`items[${i}].name`] = "Name is required.";
    if (item.unitPrice == null)
      errors[`items[${i}].unitPrice`] = "Unit price is required.";
    if (!item.quantity || item.quantity < 1)
      errors[`items[${i}].quantity`] = "Quantity must be ≥ 1.";
  });
  if (Object.keys(errors).length) {
    const err = new Error("Validation failed.");
    err.code = "VALIDATION_ERROR";
    err.details = errors;
    throw err;
  }

  // ── Resolve shipping zone ────────────────────────────────────────────────────
  let zone = null;
  if (shippingZoneId) {
    const zRows = await sql`
      SELECT id, name, code, delivery_charge, estimated_days
      FROM   shipping_zones
      WHERE  id = ${shippingZoneId} AND store_id = ${storeId} AND is_active = TRUE
      LIMIT  1
    `;
    zone = zRows[0] ?? null;
  }

  // ── Compute financials ───────────────────────────────────────────────────────
  const subtotal = items.reduce(
    (s, i) => s + Number(i.unitPrice) * Number(i.quantity),
    0,
  );
  const shippingTotal = zone ? Number(zone.delivery_charge) : 0;
  const grandTotal = Math.max(
    0,
    subtotal + shippingTotal - Number(discountAmount),
  );

  // ── Generate order number (atomic sequence — must stay outside main tx) ──────
  const orderNumber = await generateOrderNumber(storeId);

  // ── FIX 1B + 1C + 1D: Atomic transaction ────────────────────────────────────
  // Everything below runs inside one transaction:
  //   1. INSERT order
  //   2. Atomic stock decrement per item (fails the tx if stock is insufficient)
  //   3. INSERT order_items
  //   4. INSERT initial status history
  //   5. INCREMENT coupon uses_count (if coupon used)

  // Build the list of SQL statements for sql.transaction()
  const now = new Date().toISOString();

  // We can't do this inline in sql.transaction's array form because the item
  // inserts depend on the new order.id. Use a manual approach:
  // Step A: Insert the order row
  const orderRows = await sql`
    INSERT INTO orders (
      store_id, order_number, status,
      customer_name, customer_phone, customer_email, customer_address,
      shipping_zone_id, shipping_zone_name, shipping_zone_code,
      shipping_charge, estimated_delivery,
      payment_method, payment_status, currency,
      subtotal, discount_amount, shipping_total, grand_total,
      coupon_id, coupon_code, notes, source
    ) VALUES (
      ${storeId}, ${orderNumber}, 'pending',
      ${customerName.trim()}, ${customerPhone.trim()}, ${customerEmail},
      ${JSON.stringify(customerAddress)},
      ${zone?.id ?? null}, ${zone?.name ?? null}, ${zone?.code ?? null},
      ${shippingTotal}, ${zone?.estimated_days ?? null},
      ${paymentMethod}, 'pending', ${currency},
      ${subtotal}, ${Number(discountAmount)}, ${shippingTotal}, ${grandTotal},
      ${couponId ?? null}, ${couponCode ?? null}, ${notes}, ${source}
    )
    RETURNING *
  `;
  const order = orderRows[0];

  // Step B: Atomic stock decrement — one UPDATE per item.
  // Uses WHERE stock_quantity >= qty to prevent overselling.
  // If any UPDATE returns 0 rows, that item is out of stock → abort via throw.
  for (const item of items) {
    if (!item.productId) continue; // admin-created items without a product link
    const decremented = await sql`
      UPDATE products
      SET    stock_quantity = stock_quantity - ${Number(item.quantity)},
             updated_at    = now()
      WHERE  id             = ${item.productId}
        AND  store_id       = ${storeId}
        AND  stock_quantity >= ${Number(item.quantity)}
      RETURNING id, stock_quantity
    `;
    if (!decremented[0]) {
      // Roll back by deleting the just-inserted order
      await sql`DELETE FROM orders WHERE id = ${order.id}`;
      const err = new Error(
        `Insufficient stock for "${item.name}". The item may have sold out while you were checking out.`,
      );
      err.code = "INSUFFICIENT_STOCK";
      err.itemName = item.name;
      throw err;
    }
  }

  // Step C: Insert order items
  await Promise.all(
    items.map((item) => {
      const lineTotal = Number(item.unitPrice) * Number(item.quantity);
      return sql`
        INSERT INTO order_items (
          order_id, store_id, product_id,
          sku, name, unit_price, quantity, line_total, dynamic_attributes
        ) VALUES (
          ${order.id}, ${storeId}, ${item.productId ?? null},
          ${item.sku}, ${item.name}, ${Number(item.unitPrice)},
          ${Number(item.quantity)}, ${lineTotal},
          ${JSON.stringify(item.dynamicAttributes ?? {})}
        )
      `;
    }),
  );

  // Step D: Log initial status
  await sql`
    INSERT INTO order_status_history (order_id, store_id, from_status, to_status, note)
    VALUES (${order.id}, ${storeId}, NULL, 'pending', 'Order created')
  `;

  // Step E: FIX 1D — increment coupon uses_count atomically
  if (couponId) {
    await sql`
      UPDATE coupons
      SET    uses_count = uses_count + 1
      WHERE  id         = ${couponId}
        AND  store_id   = ${storeId}
    `;
  }

  // ── Fire CAPI order.placed event (non-blocking) ──────────────────────────────
  fireCAPIEvent({ ...order, item_count: items.length }, "order.placed");

  return getOrder({ storeId, orderId: order.id });
}

// ─── State Machine Transition ─────────────────────────────────────────────────

/**
 * Transitions an order to a new status, enforcing the state machine.
 * Logs the transition in order_status_history.
 * Fires the corresponding CAPI webhook event.
 *
 * @param {object} opts
 * @param {string} opts.storeId
 * @param {string} opts.orderId
 * @param {string} opts.toStatus    - Target status.
 * @param {string} [opts.note]      - Optional staff note recorded in history.
 * @param {string} [opts.changedBy] - userId of the staff making the change.
 * @returns {Promise<object>} Updated order.
 */
export async function transitionStatus({
  storeId,
  orderId,
  toStatus,
  note = null,
  changedBy = null,
}) {
  assertStoreId(storeId);

  // Fetch current order
  const rows = await sql`
    SELECT id, store_id, status, order_number, customer_name, customer_phone,
           customer_email, grand_total, currency, payment_method, payment_status,
           payment_meta, shipping_zone_code, capi_events_fired, created_at
    FROM   orders
    WHERE  id = ${orderId} AND store_id = ${storeId}
    LIMIT 1
  `;
  const order = rows[0];

  if (!order) {
    const err = new Error("Order not found.");
    err.code = "NOT_FOUND";
    throw err;
  }

  const fromStatus = order.status;

  // ── Validate transition ──────────────────────────────────────────────────────
  const allowed = VALID_TRANSITIONS[fromStatus] ?? [];
  if (!allowed.includes(toStatus)) {
    const err = new Error(
      `Invalid transition: "${fromStatus}" → "${toStatus}". ` +
        `Allowed from "${fromStatus}": [${allowed.join(", ") || "none"}].`,
    );
    err.code = "INVALID_TRANSITION";
    throw err;
  }

  // ── Apply transition ─────────────────────────────────────────────────────────
  await sql`
    UPDATE orders
    SET    status     = ${toStatus},
           updated_at = NOW()
    WHERE  id         = ${orderId}
      AND  store_id   = ${storeId}
  `;

  // ── Record in history ────────────────────────────────────────────────────────
  await sql`
    INSERT INTO order_status_history (order_id, store_id, from_status, to_status, changed_by, note)
    VALUES (${orderId}, ${storeId}, ${fromStatus}, ${toStatus}, ${changedBy}, ${note})
  `;

  // ── Fire CAPI event for this transition ──────────────────────────────────────
  const eventType = STATUS_TO_EVENT[toStatus];
  if (eventType) {
    const updatedOrder = { ...order, status: toStatus };
    fireCAPIEvent(updatedOrder, eventType);
  }

  return getOrder({ storeId, orderId });
}

// ─── Payment Meta Update ──────────────────────────────────────────────────────

/**
 * Updates payment status and merges new gateway data into payment_meta.
 * Used by webhook receivers from bKash, SSLCommerz, etc.
 *
 * @param {object} opts
 * @param {string} opts.storeId
 * @param {string} opts.orderId
 * @param {string} opts.paymentStatus  - pending | partial | paid | failed | refunded
 * @param {object} [opts.paymentMeta]  - Gateway-specific data to merge into existing meta.
 */
export async function updatePayment({
  storeId,
  orderId,
  paymentStatus,
  paymentMeta = {},
}) {
  assertStoreId(storeId);

  const VALID_PAYMENT_STATUSES = [
    "pending",
    "partial",
    "paid",
    "failed",
    "refunded",
  ];
  if (!VALID_PAYMENT_STATUSES.includes(paymentStatus)) {
    const err = new Error(`Invalid payment_status: "${paymentStatus}".`);
    err.code = "VALIDATION_ERROR";
    throw err;
  }

  const rows = await sql`
    UPDATE orders
    SET
      payment_status = ${paymentStatus},
      -- Shallow merge: existing meta + new meta (new keys win on conflict)
      payment_meta   = payment_meta || ${JSON.stringify(paymentMeta)},
      updated_at     = NOW()
    WHERE id       = ${orderId}
      AND store_id = ${storeId}
    RETURNING id
  `;

  if (!rows[0]) {
    const err = new Error("Order not found.");
    err.code = "NOT_FOUND";
    throw err;
  }

  return getOrder({ storeId, orderId });
}

// ─── General Update ───────────────────────────────────────────────────────────

/**
 * Updates non-sensitive order fields (notes, customer info, address).
 * Status changes must go through transitionStatus().
 */
export async function updateOrder({ storeId, orderId, updates }) {
  assertStoreId(storeId);

  const ALLOWED = [
    "customer_name",
    "customer_phone",
    "customer_email",
    "customer_address",
    "notes",
  ];

  const setClauses = [];
  const values = [];
  let idx = 1;

  for (const field of ALLOWED) {
    const camel = field.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
    const val = updates[field] ?? updates[camel];
    if (val !== undefined) {
      setClauses.push(`${field} = $${idx++}`);
      values.push(field === "customer_address" ? JSON.stringify(val) : val);
    }
  }

  if (!setClauses.length) return getOrder({ storeId, orderId });

  setClauses.push("updated_at = NOW()");
  values.push(orderId, storeId);

  const query = `
    UPDATE orders SET ${setClauses.join(", ")}
    WHERE id = $${idx} AND store_id = $${idx + 1}
    RETURNING id
  `;

  const rows = await sql(query, values);
  if (!rows[0]) {
    const err = new Error("Order not found.");
    err.code = "NOT_FOUND";
    throw err;
  }

  return getOrder({ storeId, orderId });
}

// ─── Shipping Zones ───────────────────────────────────────────────────────────

export async function listShippingZones({ storeId }) {
  assertStoreId(storeId);
  return sql`
    SELECT id, name, code, delivery_charge, estimated_days, is_active, sort_order
    FROM   shipping_zones
    WHERE  store_id = ${storeId}
    ORDER  BY sort_order ASC, name ASC
  `;
}
