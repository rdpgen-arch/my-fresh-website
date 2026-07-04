/**
 * POST /api/callbacks/sslcommerz/ipn
 *
 * SSLCommerz IPN (Instant Payment Notification) handler.
 *
 * SSLCommerz IPN Flow:
 *   1. Customer completes payment via SSLCommerz (bKash, Nagad, VISA, etc.).
 *   2. SSLCommerz POSTs to this URL with transaction data.
 *   3. We verify the payload using SSLCommerz's hash verification algorithm.
 *   4. We also call the SSLCommerz validation API for double-verification.
 *   5. On VALID status, update payment + transition order to 'processing'.
 *
 * Signature Verification (SSLCommerz standard):
 *   1. Remove the `verify_sign` and `verify_key` from the received POST data.
 *   2. Sort remaining keys alphabetically.
 *   3. Concatenate values with store_passwd (MD5 hashed).
 *   4. Compare MD5 hash with `verify_sign`.
 *
 * `tran_id` maps to our `order_number`.
 */

import sql from "@/app/api/utils/sql";
import {
  getDecryptedCredentials,
  logIPNEvent,
} from "@/app/api/services/integration.service";
import {
  updatePayment,
  transitionStatus,
} from "@/app/api/services/order.service";

const ack = (msg = "OK") =>
  new Response(msg, { status: 200, headers: { "Content-Type": "text/plain" } });

/**
 * SSLCommerz hash verification.
 * Uses the Web Crypto API to compute MD5 (via a workaround — SSLCommerz uses MD5).
 * Since Web Crypto doesn't natively support MD5, we use a manual implementation.
 */
async function verifySSLCommerzSignature(params, storePasswd) {
  try {
    // Remove signature fields from params for hash calculation
    const { verify_sign, verify_key, ...rest } = params;
    if (!verify_sign || !verify_key) return false;

    // Only include keys listed in verify_key
    const keyList = verify_key.split(",");
    const sortedKeys = keyList.sort();
    const hashString =
      sortedKeys.map((k) => `${k}=${rest[k] ?? ""}`).join("&") +
      `&store_passwd=${storePasswd}`;

    // MD5 via SubtleCrypto is not natively available — use a pure-JS fallback
    const md5Hash = md5(hashString);
    return md5Hash === verify_sign;
  } catch {
    return false;
  }
}

// Minimal MD5 implementation (RFC 1321) for SSLCommerz compatibility
function md5(str) {
  function safeAdd(x, y) {
    const lsw = (x & 0xffff) + (y & 0xffff);
    const msw = (x >> 16) + (y >> 16) + (lsw >> 16);
    return (msw << 16) | (lsw & 0xffff);
  }
  function bitRotateLeft(num, cnt) {
    return (num << cnt) | (num >>> (32 - cnt));
  }
  function md5cmn(q, a, b, x, s, t) {
    return safeAdd(bitRotateLeft(safeAdd(safeAdd(a, q), safeAdd(x, t)), s), b);
  }
  function md5ff(a, b, c, d, x, s, t) {
    return md5cmn((b & c) | (~b & d), a, b, x, s, t);
  }
  function md5gg(a, b, c, d, x, s, t) {
    return md5cmn((b & d) | (c & ~d), a, b, x, s, t);
  }
  function md5hh(a, b, c, d, x, s, t) {
    return md5cmn(b ^ c ^ d, a, b, x, s, t);
  }
  function md5ii(a, b, c, d, x, s, t) {
    return md5cmn(c ^ (b | ~d), a, b, x, s, t);
  }
  const bytes = new TextEncoder().encode(str);
  const len8 = bytes.length;
  const len32 = (len8 + 8 + 64) & ~63;
  const buf = new Uint8Array(len32);
  buf.set(bytes);
  buf[len8] = 0x80;
  const view = new DataView(buf.buffer);
  view.setUint32(len32 - 8, len8 * 8, true);
  const w = new Int32Array(buf.buffer);
  let a = 1732584193,
    b = -271733879,
    c = -1732584194,
    d = 271733878;
  for (let i = 0; i < w.length; i += 16) {
    const [oa, ob, oc, od] = [a, b, c, d];
    a = md5ff(a, b, c, d, w[i + 0], 7, -680876936);
    d = md5ff(d, a, b, c, w[i + 1], 12, -389564586);
    c = md5ff(c, d, a, b, w[i + 2], 17, 606105819);
    b = md5ff(b, c, d, a, w[i + 3], 22, -1044525330);
    a = md5ff(a, b, c, d, w[i + 4], 7, -176418897);
    d = md5ff(d, a, b, c, w[i + 5], 12, 1200080426);
    c = md5ff(c, d, a, b, w[i + 6], 17, -1473231341);
    b = md5ff(b, c, d, a, w[i + 7], 22, -45705983);
    a = md5ff(a, b, c, d, w[i + 8], 7, 1770035416);
    d = md5ff(d, a, b, c, w[i + 9], 12, -1958414417);
    c = md5ff(c, d, a, b, w[i + 10], 17, -42063);
    b = md5ff(b, c, d, a, w[i + 11], 22, -1990404162);
    a = md5ff(a, b, c, d, w[i + 12], 7, 1804603682);
    d = md5ff(d, a, b, c, w[i + 13], 12, -40341101);
    c = md5ff(c, d, a, b, w[i + 14], 17, -1502002290);
    b = md5ff(b, c, d, a, w[i + 15], 22, 1236535329);
    a = md5gg(a, b, c, d, w[i + 1], 5, -165796510);
    d = md5gg(d, a, b, c, w[i + 6], 9, -1069501632);
    c = md5gg(c, d, a, b, w[i + 11], 14, 643717713);
    b = md5gg(b, c, d, a, w[i + 0], 20, -373897302);
    a = md5gg(a, b, c, d, w[i + 5], 5, -701558691);
    d = md5gg(d, a, b, c, w[i + 10], 9, 38016083);
    c = md5gg(c, d, a, b, w[i + 15], 14, -660478335);
    b = md5gg(b, c, d, a, w[i + 4], 20, -405537848);
    a = md5gg(a, b, c, d, w[i + 9], 5, 568446438);
    d = md5gg(d, a, b, c, w[i + 14], 9, -1019803690);
    c = md5gg(c, d, a, b, w[i + 3], 14, -187363961);
    b = md5gg(b, c, d, a, w[i + 8], 20, 1163531501);
    a = md5gg(a, b, c, d, w[i + 13], 5, -1444681467);
    d = md5gg(d, a, b, c, w[i + 2], 9, -51403784);
    c = md5gg(c, d, a, b, w[i + 7], 14, 1735328473);
    b = md5gg(b, c, d, a, w[i + 12], 20, -1926607734);
    a = md5hh(a, b, c, d, w[i + 5], 4, -378558);
    d = md5hh(d, a, b, c, w[i + 8], 11, -2022574463);
    c = md5hh(c, d, a, b, w[i + 11], 16, 1839030562);
    b = md5hh(b, c, d, a, w[i + 14], 23, -35309556);
    a = md5hh(a, b, c, d, w[i + 1], 4, -1530992060);
    d = md5hh(d, a, b, c, w[i + 4], 11, 1272893353);
    c = md5hh(c, d, a, b, w[i + 7], 16, -155497632);
    b = md5hh(b, c, d, a, w[i + 10], 23, -1094730640);
    a = md5hh(a, b, c, d, w[i + 13], 4, 681279174);
    d = md5hh(d, a, b, c, w[i + 0], 11, -358537222);
    c = md5hh(c, d, a, b, w[i + 3], 16, -722521979);
    b = md5hh(b, c, d, a, w[i + 6], 23, 76029189);
    a = md5hh(a, b, c, d, w[i + 9], 4, -640364487);
    d = md5hh(d, a, b, c, w[i + 12], 11, -421815835);
    c = md5hh(c, d, a, b, w[i + 15], 16, 530742520);
    b = md5hh(b, c, d, a, w[i + 2], 23, -995338651);
    a = md5ii(a, b, c, d, w[i + 0], 6, -198630844);
    d = md5ii(d, a, b, c, w[i + 7], 10, 1126891415);
    c = md5ii(c, d, a, b, w[i + 14], 15, -1416354905);
    b = md5ii(b, c, d, a, w[i + 5], 21, -57434055);
    a = md5ii(a, b, c, d, w[i + 12], 6, 1700485571);
    d = md5ii(d, a, b, c, w[i + 3], 10, -1894986606);
    c = md5ii(c, d, a, b, w[i + 10], 15, -1051523);
    b = md5ii(b, c, d, a, w[i + 1], 21, -2054922799);
    a = md5ii(a, b, c, d, w[i + 8], 6, 1873313359);
    d = md5ii(d, a, b, c, w[i + 15], 10, -30611744);
    c = md5ii(c, d, a, b, w[i + 6], 15, -1560198380);
    b = md5ii(b, c, d, a, w[i + 13], 21, 1309151649);
    a = md5ii(a, b, c, d, w[i + 4], 6, -145523070);
    d = md5ii(d, a, b, c, w[i + 11], 10, -1120210379);
    c = md5ii(c, d, a, b, w[i + 2], 15, 718787259);
    b = md5ii(b, c, d, a, w[i + 9], 21, -343485551);
    a = safeAdd(a, oa);
    b = safeAdd(b, ob);
    c = safeAdd(c, oc);
    d = safeAdd(d, od);
  }
  const out = new Uint8Array(new Int32Array([a, b, c, d]).buffer);
  return Array.from(out)
    .map((n) => n.toString(16).padStart(2, "0"))
    .join("");
}

export async function POST(request) {
  let body;
  try {
    const text = await request.text();
    const params = Object.fromEntries(new URLSearchParams(text));
    body = params;
  } catch {
    return ack("bad_request");
  }

  const { tran_id, status, amount, val_id, card_type, tran_date } = body;

  // ── Find the order ───────────────────────────────────────────────────────────
  let order = null;
  try {
    const rows = await sql`
      SELECT id, store_id, order_number, status AS order_status, payment_status, grand_total
      FROM   orders WHERE order_number = ${tran_id} LIMIT 1
    `;
    order = rows[0] ?? null;
  } catch (err) {
    console.error("[SSLCommerz IPN] DB error:", err);
  }

  if (!order) {
    await logIPNEvent({
      storeId: null,
      integration: "sslcommerz",
      rawPayload: body,
      verified: false,
      actionTaken: "order_not_found",
      errorMessage: `No order for tran_id: ${tran_id}`,
    });
    return ack("order_not_found");
  }

  // ── Load credentials ─────────────────────────────────────────────────────────
  const creds = await getDecryptedCredentials({
    storeId: order.store_id,
    integration: "sslcommerz",
  });
  if (!creds?.is_active) {
    await logIPNEvent({
      storeId: order.store_id,
      integration: "sslcommerz",
      rawPayload: body,
      verified: false,
      orderId: order.id,
      orderNumber: order.order_number,
      actionTaken: "integration_not_configured",
    });
    return ack("integration_inactive");
  }

  // ── Signature verification ───────────────────────────────────────────────────
  const sigValid = await verifySSLCommerzSignature(body, creds.store_passwd);

  if (!sigValid) {
    await logIPNEvent({
      storeId: order.store_id,
      integration: "sslcommerz",
      rawPayload: body,
      verified: false,
      orderId: order.id,
      orderNumber: order.order_number,
      actionTaken: "signature_invalid",
    });
    return ack("signature_invalid");
  }

  // ── Double-verify via SSLCommerz validation API ──────────────────────────────
  let apiVerified = false;
  try {
    const baseUrl = creds.sandbox
      ? "https://sandbox.sslcommerz.com"
      : "https://securepay.sslcommerz.com";
    const verifyUrl = `${baseUrl}/validator/api/validationserverAPI.php?val_id=${val_id}&store_id=${creds.store_id}&store_passwd=${creds.store_passwd}&format=json`;
    const verRes = await fetch(verifyUrl);
    const verJson = await verRes.json();
    apiVerified = verJson?.status === "VALID" && verJson?.tran_id === tran_id;
  } catch (err) {
    console.error("[SSLCommerz IPN] Validation API error:", err);
  }

  if (!apiVerified || status !== "VALID") {
    await logIPNEvent({
      storeId: order.store_id,
      integration: "sslcommerz",
      rawPayload: body,
      verified: false,
      orderId: order.id,
      orderNumber: order.order_number,
      actionTaken: "payment_not_valid",
      errorMessage: `IPN status: ${status}`,
    });
    return ack("not_verified");
  }

  if (order.payment_status === "paid") {
    await logIPNEvent({
      storeId: order.store_id,
      integration: "sslcommerz",
      rawPayload: body,
      verified: true,
      orderId: order.id,
      orderNumber: order.order_number,
      actionTaken: "already_paid",
    });
    return ack("already_processed");
  }

  // ── Update order ─────────────────────────────────────────────────────────────
  try {
    await updatePayment({
      storeId: order.store_id,
      orderId: order.id,
      paymentStatus: "paid",
      paymentMeta: {
        val_id,
        tran_id,
        amount,
        card_type,
        tran_date,
        gateway: "sslcommerz",
        verified_at: new Date().toISOString(),
      },
    });

    if (order.order_status === "pending") {
      await transitionStatus({
        storeId: order.store_id,
        orderId: order.id,
        toStatus: "processing",
        note: `Auto-transitioned via SSLCommerz IPN. Val ID: ${val_id}`,
      });
    }

    await logIPNEvent({
      storeId: order.store_id,
      integration: "sslcommerz",
      rawPayload: body,
      verified: true,
      orderId: order.id,
      orderNumber: order.order_number,
      actionTaken: "payment_confirmed_and_processing",
    });
  } catch (err) {
    console.error("[SSLCommerz IPN] Order update error:", err);
    await logIPNEvent({
      storeId: order.store_id,
      integration: "sslcommerz",
      rawPayload: body,
      verified: true,
      orderId: order.id,
      orderNumber: order.order_number,
      actionTaken: "update_failed",
      errorMessage: err.message,
    });
  }

  return ack("processed");
}
