/**
 * SMS Service — mimsms.com provider
 *
 * Usage:
 *   import { sendSMS } from "@/app/api/services/sms.service";
 *   await sendSMS({ storeId, to: "01XXXXXXXXX", message: "Your order..." });
 *
 * Logs every send attempt to notification_logs.
 * Silently swallows errors so SMS failures never break the main order flow.
 */
import { getDecryptedCredentials } from "@/app/api/services/integration.service";
import sql from "@/app/api/utils/sql";

const MIMSMS_API_URL = "https://api.mimsms.com/api/SmsSending/SMS";

/**
 * Send an SMS via mimsms.com
 * @param {object} opts
 * @param {string} opts.storeId    - Store UUID (used to load credentials)
 * @param {string} opts.to         - Recipient phone number (01XXXXXXXXX)
 * @param {string} opts.message    - SMS body text
 * @param {string} [opts.type]     - Message type label for logging (e.g. "order_placed")
 */
export async function sendSMS({ storeId, to, message, type = "general" }) {
  let status = "failed";
  let errorMsg = null;

  try {
    // Load mimsms credentials for this store
    const creds = await getDecryptedCredentials({
      storeId,
      integration: "mimsms",
    });
    if (!creds || !creds.is_active) {
      // SMS not configured — skip silently
      return { sent: false, reason: "not_configured" };
    }

    const phone = normalizePhone(to);

    const payload = {
      ApiKey: creds.api_key,
      ClientId: creds.sender_id || "",
      SenderId: creds.sender_id || "",
      Message: message,
      MobileNumbers: phone,
      // Optionally: Url: "https://..." for callback
    };

    const res = await fetch(MIMSMS_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(payload),
    });

    const text = await res.text();
    let body = {};
    try {
      body = JSON.parse(text);
    } catch (_) {
      body = { raw: text };
    }

    if (!res.ok) {
      throw new Error(`mimsms HTTP ${res.status}: ${text}`);
    }

    // mimsms returns status code 200 with response body for success/failure
    // Common success indicators: body.Status === "0" or body.StatusCode === 200
    const succeeded = body.Status === "0" || body.success === true || res.ok;
    if (!succeeded) {
      throw new Error("mimsms rejected: " + JSON.stringify(body));
    }

    status = "sent";
  } catch (err) {
    errorMsg = err.message;
    console.error("[SMS]", err.message);
  }

  // Log to notification_logs (best-effort)
  try {
    await sql`
      INSERT INTO notification_logs
        (store_id, channel, recipient, message_type, payload, status, sent_at)
      VALUES
        (${storeId}, 'sms', ${to}, ${type},
         ${JSON.stringify({ message })},
         ${status},
         ${status === "sent" ? new Date().toISOString() : null})
    `;
  } catch (_) {}

  return { sent: status === "sent", error: errorMsg };
}

/** Normalize Bangladeshi phone numbers to 01XXXXXXXXX format */
function normalizePhone(phone) {
  if (!phone) return phone;
  let p = phone.replace(/\D/g, "");
  if (p.startsWith("880")) p = "0" + p.slice(3);
  if (p.startsWith("88")) p = "0" + p.slice(2);
  return p;
}

// ─── SMS Templates ─────────────────────────────────────────────────────────────

/**
 * Customer: Order placed confirmation
 */
export function smsOrderPlaced({
  orderNumber,
  customerName,
  grandTotal,
  storeName,
}) {
  return `Dear ${customerName}, your order #${orderNumber} has been placed at ${storeName}. Total: BDT ${grandTotal}. We will call you to confirm delivery. Thank you!`;
}

/**
 * Customer: Order shipped with tracking number
 */
export function smsOrderShipped({
  orderNumber,
  customerName,
  trackingCode,
  courier,
  storeName,
}) {
  const trackingPart = trackingCode ? ` Tracking: ${trackingCode}` : "";
  const courierPart = courier ? ` (${courier})` : "";
  return `Dear ${customerName}, your order #${orderNumber} from ${storeName} has been shipped${courierPart}.${trackingPart} Please be available for delivery. Thank you!`;
}

/**
 * Merchant: New order alert
 */
export function smsNewOrderAlert({ orderNumber, customerName, grandTotal }) {
  return `New order received! Order #${orderNumber} from ${customerName}. Amount: BDT ${grandTotal}. Please process it promptly.`;
}

/**
 * Merchant: Low stock alert
 */
export function smsLowStockAlert({ productName, sku, stockQuantity }) {
  return `Low stock alert! Product "${productName}" (SKU: ${sku}) has only ${stockQuantity} units remaining. Please restock soon.`;
}
