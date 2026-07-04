/**
 * Pathao Courier Service — OAuth2 + Parcel Booking
 *
 * Pathao uses OAuth2 client_credentials flow.
 * Tokens expire after 3600 seconds — we store them in integration_configs.public_config.
 *
 * API Docs: https://developer.pathao.com
 */
import sql from "@/app/api/utils/sql";

const PATHAO_LIVE_BASE = "https://api-hermes.pathao.com";
const PATHAO_SANDBOX_BASE = "https://hermes.p-stageenv.xyz";

function getBase(creds) {
  return creds.sandbox === true || creds.sandbox === "true"
    ? PATHAO_SANDBOX_BASE
    : PATHAO_LIVE_BASE;
}

/**
 * Get a valid Pathao access token.
 * Refreshes if expired or missing. Stores new token in public_config.
 */
export async function getPathaoToken(storeId, creds) {
  const base = getBase(creds);

  // Check if we have a valid stored token
  const now = Math.floor(Date.now() / 1000);
  if (
    creds.access_token &&
    creds.token_expires_at &&
    creds.token_expires_at > now + 60
  ) {
    return creds.access_token;
  }

  // Need to get a new token
  const body = {
    client_id: creds.client_id,
    client_secret: creds.client_secret,
    username: creds.username || "",
    password: creds.password_field || "",
    grant_type: creds.refresh_token ? "refresh_token" : "password",
  };

  if (creds.refresh_token) {
    body.refresh_token = creds.refresh_token;
    body.grant_type = "refresh_token";
  }

  const res = await fetch(`${base}/aladdin/api/v1/issue-token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(body),
  });

  const data = await res.json();
  if (!res.ok || !data.access_token) {
    throw new Error("Pathao token request failed: " + JSON.stringify(data));
  }

  const expiresAt = now + (data.expires_in || 3600) - 30;

  // Persist new token into public_config
  await sql`
    UPDATE integration_configs SET
      public_config = public_config || ${JSON.stringify({
        access_token: data.access_token,
        refresh_token: data.refresh_token || creds.refresh_token || null,
        token_expires_at: expiresAt,
      })}::jsonb,
      updated_at = NOW()
    WHERE store_id = ${storeId} AND integration = 'pathao'
  `;

  return data.access_token;
}

/**
 * Get Pathao cities list
 */
export async function getPathaoCities(storeId, creds) {
  const base = getBase(creds);
  const token = await getPathaoToken(storeId, creds);

  const res = await fetch(`${base}/aladdin/api/v1/countries/1/city-list`, {
    headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
  });
  const data = await res.json();
  return data.data?.data || [];
}

/**
 * Get Pathao zones for a city
 */
export async function getPathaoZones(storeId, creds, cityId) {
  const base = getBase(creds);
  const token = await getPathaoToken(storeId, creds);

  const res = await fetch(`${base}/aladdin/api/v1/cities/${cityId}/zone-list`, {
    headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
  });
  const data = await res.json();
  return data.data?.data || [];
}

/**
 * Get Pathao areas for a zone
 */
export async function getPathaoAreas(storeId, creds, zoneId) {
  const base = getBase(creds);
  const token = await getPathaoToken(storeId, creds);

  const res = await fetch(`${base}/aladdin/api/v1/zones/${zoneId}/area-list`, {
    headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
  });
  const data = await res.json();
  return data.data?.data || [];
}

/**
 * Create a Pathao parcel order (book shipment)
 *
 * @param {object} params
 * @param {string} params.storeId
 * @param {object} params.creds - decrypted + public merged credentials
 * @param {object} params.order - DB order row
 * @param {object} params.booking - { recipientCityId, recipientZoneId, recipientAreaId, deliveryType, itemType, itemWeight, specialInstruction }
 */
export async function createPathaoOrder({ storeId, creds, order, booking }) {
  const base = getBase(creds);
  const token = await getPathaoToken(storeId, creds);

  const address = order.customer_address || {};
  const addressLine =
    [address.line1, address.line2, address.area].filter(Boolean).join(", ") ||
    "Dhaka";

  const payload = {
    store_id: creds.pathao_store_id || null, // Merchant's Pathao store ID
    merchant_order_id: order.order_number,
    recipient_name: order.customer_name,
    recipient_phone: order.customer_phone,
    recipient_address: addressLine,
    recipient_city: Number(booking.recipientCityId || creds.city_id || 1),
    recipient_zone: Number(booking.recipientZoneId || 1),
    recipient_area: Number(booking.recipientAreaId || 0) || undefined,
    delivery_type: booking.deliveryType || 48, // 48h = standard
    item_type: booking.itemType || 2, // 2 = parcel
    special_instruction: booking.specialInstruction || order.notes || "",
    item_quantity: order.items?.length || 1,
    item_weight: booking.itemWeight || 0.5,
    item_description: `Order #${order.order_number}`,
    amount_to_collect:
      order.payment_method === "cod"
        ? Number(order.cod_exact_amount || order.grand_total)
        : 0,
  };

  const res = await fetch(`${base}/aladdin/api/v1/orders`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(payload),
  });

  const data = await res.json();
  if (!res.ok || data.code !== 200) {
    throw new Error("Pathao booking failed: " + JSON.stringify(data));
  }

  return {
    consignment_id: data.data?.consignment_id,
    tracking_code: data.data?.consignment_id, // Pathao uses consignment_id as tracking
    merchant_order_id: data.data?.merchant_order_id,
  };
}
