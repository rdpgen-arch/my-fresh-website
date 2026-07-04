/**
 * Integration Service
 *
 * Manages third-party integration credentials with AES-256-GCM encryption.
 * No plaintext secret ever touches the database.
 *
 * ── Encryption Model ─────────────────────────────────────────────────────────
 *
 *  Algorithm: AES-256-GCM (authenticated encryption — provides both
 *             confidentiality AND integrity verification)
 *
 *  Key source: process.env.INTEGRATION_ENCRYPTION_KEY (32-byte hex string)
 *
 *  Stored JSONB shape in `credentials` column:
 *    {
 *      "iv":   "<24-char base64url nonce>",
 *      "tag":  "<24-char base64url auth tag>",
 *      "data": "<base64url ciphertext>"
 *    }
 *
 *  The plaintext that gets encrypted is the full credentials JSON string.
 *  A unique IV is generated for every write — two identical secrets will
 *  produce different ciphertext, preventing pattern analysis.
 *
 * ── Integration Registry ──────────────────────────────────────────────────────
 *
 *  INTEGRATION_REGISTRY is the single source of truth for every supported
 *  integration. Adding a new gateway = adding one object here.
 *  The Admin UI reads from this registry to render the correct input fields.
 *
 * ── IPN Handler Architecture ──────────────────────────────────────────────────
 *
 *  Each integration exports a `verifyAndExtract(payload, credentials)` function.
 *  The public callback routes call this to:
 *    1. Verify the incoming payload signature.
 *    2. Extract { orderId/orderNumber, paymentStatus, gatewayMeta }.
 *    3. Update the order via updatePayment() + optionally transitionStatus().
 *
 *  This clean interface means adding a new gateway never touches existing code.
 */

import sql from "@/app/api/utils/sql";

// ─── Encryption Engine (AES-256-GCM via Web Crypto) ──────────────────────────

const ALGO = "AES-GCM";

/**
 * Derives a CryptoKey from the INTEGRATION_ENCRYPTION_KEY env variable.
 * @returns {Promise<CryptoKey>}
 */
async function getEncryptionKey() {
  const hexKey = process.env.INTEGRATION_ENCRYPTION_KEY;
  if (!hexKey || hexKey.length !== 64) {
    throw new Error(
      "INTEGRATION_ENCRYPTION_KEY must be set to a 64-character hex string (32 bytes). " +
        "Generate one with: node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\"",
    );
  }
  const keyBytes = Uint8Array.from(Buffer.from(hexKey, "hex"));
  return crypto.subtle.importKey("raw", keyBytes, { name: ALGO }, false, [
    "encrypt",
    "decrypt",
  ]);
}

/**
 * Encrypts a plaintext credentials object.
 * @param {object} plainCredentials
 * @returns {Promise<object>} Encrypted envelope: { iv, tag, data } (all base64url)
 */
export async function encryptCredentials(plainCredentials) {
  const key = await getEncryptionKey();
  const iv = crypto.getRandomValues(new Uint8Array(12)); // 96-bit IV for GCM
  const plaintext = new TextEncoder().encode(JSON.stringify(plainCredentials));

  const ciphertextWithTag = await crypto.subtle.encrypt(
    { name: ALGO, iv },
    key,
    plaintext,
  );

  // AES-GCM appends the 16-byte auth tag at the end of the ciphertext buffer
  const cipherArr = new Uint8Array(ciphertextWithTag);
  const data = cipherArr.slice(0, -16);
  const tag = cipherArr.slice(-16);

  return {
    iv: Buffer.from(iv).toString("base64url"),
    tag: Buffer.from(tag).toString("base64url"),
    data: Buffer.from(data).toString("base64url"),
  };
}

/**
 * Decrypts a stored credentials envelope back to a plain object.
 * Returns null if decryption fails (bad key, tampered data).
 * @param {object} envelope - { iv, tag, data }
 * @returns {Promise<object|null>}
 */
export async function decryptCredentials(envelope) {
  try {
    const key = await getEncryptionKey();
    const iv = Buffer.from(envelope.iv, "base64url");
    const tag = Buffer.from(envelope.tag, "base64url");
    const data = Buffer.from(envelope.data, "base64url");

    // Reconstruct ciphertext + tag (GCM expects them concatenated)
    const ciphertextWithTag = new Uint8Array(data.length + tag.length);
    ciphertextWithTag.set(data, 0);
    ciphertextWithTag.set(tag, data.length);

    const plainBuffer = await crypto.subtle.decrypt(
      { name: ALGO, iv },
      key,
      ciphertextWithTag,
    );
    return JSON.parse(new TextDecoder().decode(plainBuffer));
  } catch {
    return null; // Tampered, wrong key, or corrupt data
  }
}

// ─── Integration Registry ─────────────────────────────────────────────────────

/**
 * Each entry defines a supported integration.
 *
 * `fields` drives the Admin UI input rendering:
 *   - type "secret"   → password input, value is encrypted
 *   - type "text"     → plain text input, stored in public_config
 *   - type "select"   → dropdown, stored in public_config
 *   - type "toggle"   → boolean, stored in public_config
 *
 * `sensitiveFields` = field keys that go into the encrypted `credentials` column.
 * All others go into `public_config`.
 */
export const INTEGRATION_REGISTRY = [
  // ── Payment Gateways ──────────────────────────────────────────────────────
  {
    id: "bkash",
    label: "bKash",
    category: "payment",
    description:
      "Accept bKash mobile payments. Supports PGW (Payment Gateway) API.",
    docsUrl: "https://developer.bka.sh",
    fields: [
      {
        key: "app_key",
        label: "App Key",
        type: "secret",
        placeholder: "bKash App Key",
      },
      {
        key: "app_secret",
        label: "App Secret",
        type: "secret",
        placeholder: "bKash App Secret",
      },
      {
        key: "username",
        label: "Username",
        type: "secret",
        placeholder: "Merchant Username",
      },
      {
        key: "password",
        label: "Password",
        type: "secret",
        placeholder: "Merchant Password",
      },
      {
        key: "merchant_number",
        label: "Merchant Number",
        type: "text",
        placeholder: "01XXXXXXXXX",
      },
      { key: "sandbox", label: "Sandbox Mode", type: "toggle", default: true },
    ],
    sensitiveFields: ["app_key", "app_secret", "username", "password"],
  },
  {
    id: "nagad",
    label: "Nagad",
    category: "payment",
    description: "Accept Nagad mobile banking payments via Merchant API.",
    docsUrl: "https://nagad.com.bd",
    fields: [
      {
        key: "merchant_id",
        label: "Merchant ID",
        type: "text",
        placeholder: "Nagad Merchant ID",
      },
      {
        key: "merchant_number",
        label: "Merchant Number",
        type: "text",
        placeholder: "01XXXXXXXXX",
      },
      {
        key: "public_key",
        label: "PGP Public Key",
        type: "secret",
        placeholder: "Nagad-provided PGP key",
      },
      {
        key: "private_key",
        label: "PGP Private Key",
        type: "secret",
        placeholder: "Your private PGP key",
      },
      { key: "sandbox", label: "Sandbox Mode", type: "toggle", default: true },
    ],
    sensitiveFields: ["public_key", "private_key"],
  },
  {
    id: "sslcommerz",
    label: "SSLCommerz",
    category: "payment",
    description:
      "Multi-gateway aggregator: bKash, Nagad, cards, and more via one integration.",
    docsUrl: "https://developer.sslcommerz.com",
    fields: [
      {
        key: "store_id",
        label: "Store ID",
        type: "text",
        placeholder: "SSLCommerz Store ID",
      },
      {
        key: "store_passwd",
        label: "Store Password",
        type: "secret",
        placeholder: "SSLCommerz Store Password",
      },
      { key: "sandbox", label: "Sandbox Mode", type: "toggle", default: true },
    ],
    sensitiveFields: ["store_passwd"],
  },

  // ── Logistics / Courier ───────────────────────────────────────────────────
  {
    id: "pathao",
    label: "Pathao Courier",
    category: "logistics",
    description:
      "Create and track shipments via Pathao Courier API. Auto-generates waybills.",
    docsUrl: "https://developer.pathao.com",
    fields: [
      {
        key: "client_id",
        label: "Client ID",
        type: "text",
        placeholder: "Pathao Client ID",
      },
      {
        key: "client_secret",
        label: "Client Secret",
        type: "secret",
        placeholder: "Pathao Client Secret",
      },
      {
        key: "merchant_name",
        label: "Merchant Name",
        type: "text",
        placeholder: "Your business name",
      },
      {
        key: "city_id",
        label: "Default City",
        type: "select",
        options: [
          { value: "1", label: "Dhaka" },
          { value: "2", label: "Chittagong" },
          { value: "3", label: "Sylhet" },
          { value: "4", label: "Rajshahi" },
          { value: "5", label: "Khulna" },
        ],
      },
      { key: "sandbox", label: "Sandbox Mode", type: "toggle", default: true },
    ],
    sensitiveFields: ["client_secret"],
  },
  {
    id: "steadfast",
    label: "Steadfast Courier",
    category: "logistics",
    description: "Bulk parcel creation and COD management via Steadfast API.",
    docsUrl: "https://steadfast.com.bd/api-documentation",
    fields: [
      {
        key: "api_key",
        label: "API Key",
        type: "secret",
        placeholder: "Steadfast API Key",
      },
      {
        key: "secret_key",
        label: "Secret Key",
        type: "secret",
        placeholder: "Steadfast Secret Key",
      },
    ],
    sensitiveFields: ["api_key", "secret_key"],
  },
  {
    id: "redx",
    label: "RedX",
    category: "logistics",
    description:
      "Same-day and next-day delivery across Bangladesh via RedX API.",
    docsUrl: "https://redx.com.bd",
    fields: [
      {
        key: "api_token",
        label: "API Token",
        type: "secret",
        placeholder: "RedX Bearer Token",
      },
    ],
    sensitiveFields: ["api_token"],
  },

  // ── SMS / OTP ─────────────────────────────────────────────────────────────
  {
    id: "mimsms",
    label: "Mim SMS",
    category: "sms",
    description: "Send transactional and OTP SMS in Bangladesh.",
    docsUrl: "https://mimsms.com",
    fields: [
      {
        key: "api_key",
        label: "API Key",
        type: "secret",
        placeholder: "Mim SMS API Key",
      },
      {
        key: "sender_id",
        label: "Sender ID",
        type: "text",
        placeholder: "Your registered sender ID",
      },
    ],
    sensitiveFields: ["api_key"],
  },
  {
    id: "greenweb",
    label: "GreenWeb SMS",
    category: "sms",
    description:
      "Bulk and OTP SMS provider with high delivery rate in Bangladesh.",
    docsUrl: "https://greenweb.com.bd",
    fields: [
      {
        key: "username",
        label: "Username",
        type: "text",
        placeholder: "GreenWeb account username",
      },
      {
        key: "password",
        label: "Password",
        type: "secret",
        placeholder: "GreenWeb password",
      },
    ],
    sensitiveFields: ["password"],
  },
];

/** Fast lookup map: integration ID → registry entry */
export const REGISTRY_MAP = Object.fromEntries(
  INTEGRATION_REGISTRY.map((r) => [r.id, r]),
);

// ─── CRUD Operations ──────────────────────────────────────────────────────────

function assertStoreId(storeId) {
  if (!storeId) throw new Error("[IntegrationService] storeId is required.");
}

/**
 * Lists all configured integrations for a store.
 * Credentials are NEVER returned — only public_config and metadata.
 */
export async function listIntegrations({ storeId }) {
  assertStoreId(storeId);
  return sql`
    SELECT id, store_id, integration, label, category,
           public_config, is_active, created_at, updated_at
    FROM   integration_configs
    WHERE  store_id = ${storeId}
    ORDER  BY category ASC, label ASC
  `;
}

/**
 * Upserts an integration config. Encrypts sensitive fields before storing.
 * Non-sensitive fields go into public_config as plain JSON.
 *
 * @param {object} opts
 * @param {string} opts.storeId
 * @param {string} opts.integration  - Registry ID e.g. "bkash"
 * @param {object} opts.fieldValues  - All form field values (flat object)
 * @param {boolean} [opts.isActive]
 */
export async function upsertIntegration({
  storeId,
  integration,
  fieldValues,
  isActive,
}) {
  assertStoreId(storeId);

  const reg = REGISTRY_MAP[integration];
  if (!reg) {
    const err = new Error(`Unknown integration: "${integration}".`);
    err.code = "NOT_FOUND";
    throw err;
  }

  // ── Split fields into sensitive (encrypted) and public ────────────────────
  const sensitiveSet = new Set(reg.sensitiveFields ?? []);
  const plainCreds = {};
  const publicConfig = {};

  for (const field of reg.fields) {
    const val = fieldValues[field.key];
    if (val === undefined || val === "") continue;

    if (sensitiveSet.has(field.key)) {
      plainCreds[field.key] = val;
    } else {
      publicConfig[field.key] = val;
    }
  }

  // Encrypt the sensitive credentials
  const encryptedCreds =
    Object.keys(plainCreds).length > 0
      ? await encryptCredentials(plainCreds)
      : {};

  // ── Upsert ────────────────────────────────────────────────────────────────
  const rows = await sql`
    INSERT INTO integration_configs
      (store_id, integration, label, category, credentials, public_config, is_active)
    VALUES
      (${storeId}, ${integration}, ${reg.label}, ${reg.category},
       ${JSON.stringify(encryptedCreds)}, ${JSON.stringify(publicConfig)},
       ${isActive ?? false})
    ON CONFLICT (store_id, integration) DO UPDATE SET
      credentials   = EXCLUDED.credentials,
      public_config = EXCLUDED.public_config,
      is_active     = COALESCE(${isActive ?? null}, integration_configs.is_active),
      label         = EXCLUDED.label,
      updated_at    = NOW()
    RETURNING id, store_id, integration, label, category, public_config, is_active, created_at, updated_at
  `;

  return rows[0];
}

/**
 * Toggles the is_active flag without touching credentials.
 */
export async function toggleIntegration({ storeId, integration, isActive }) {
  assertStoreId(storeId);
  const rows = await sql`
    UPDATE integration_configs
    SET    is_active = ${isActive}, updated_at = NOW()
    WHERE  store_id    = ${storeId}
      AND  integration = ${integration}
    RETURNING id, integration, is_active, updated_at
  `;
  return rows[0] ?? null;
}

/**
 * Retrieves decrypted credentials for an integration.
 * ONLY callable from server-side (IPN handlers, background jobs).
 * NEVER expose this via a public API route.
 */
export async function getDecryptedCredentials({ storeId, integration }) {
  assertStoreId(storeId);
  const rows = await sql`
    SELECT credentials, public_config, is_active
    FROM   integration_configs
    WHERE  store_id    = ${storeId}
      AND  integration = ${integration}
    LIMIT  1
  `;
  if (!rows[0]) return null;
  const { credentials, public_config, is_active } = rows[0];
  const decrypted =
    Object.keys(credentials).length > 0
      ? await decryptCredentials(credentials)
      : {};
  return { ...decrypted, ...public_config, is_active };
}

// ─── IPN Log ──────────────────────────────────────────────────────────────────

export async function logIPNEvent({
  storeId,
  integration,
  rawPayload,
  verified,
  orderId,
  orderNumber,
  actionTaken,
  errorMessage,
}) {
  await sql`
    INSERT INTO ipn_logs
      (store_id, integration, raw_payload, verified, order_id, order_number, action_taken, error_message)
    VALUES
      (${storeId ?? null}, ${integration}, ${JSON.stringify(rawPayload)}, ${verified},
       ${orderId ?? null}, ${orderNumber ?? null}, ${actionTaken ?? null}, ${errorMessage ?? null})
  `;
}

export async function listIPNLogs({ storeId, integration, limit = 100 }) {
  assertStoreId(storeId);
  const conditions = ["store_id = $1"];
  const params = [storeId];
  let idx = 2;

  if (integration) {
    conditions.push(`integration = $${idx++}`);
    params.push(integration);
  }

  return sql(
    `SELECT id, integration, verified, order_number, action_taken, error_message, received_at
     FROM   ipn_logs
     WHERE  ${conditions.join(" AND ")}
     ORDER  BY received_at DESC
     LIMIT  $${idx}`,
    [...params, Math.min(Number(limit) || 100, 500)],
  );
}

// ─── Payment Initiation ───────────────────────────────────────────────────────

const BKASH_BASE_LIVE = "https://tokenized.pay.bka.sh/v1.2.0-beta";
const BKASH_BASE_SANDBOX = "https://tokenized.sandbox.pay.bka.sh/v1.2.0-beta";

/**
 * Initiates a bKash tokenized payment and returns the payment redirect URL.
 * Call this from the storefront checkout route AFTER order creation.
 *
 * @param {object} order - must have id, order_number, grand_total, currency
 * @param {object} creds - decrypted bKash credentials
 * @param {string} callbackUrl - absolute URL for bKash to redirect after payment
 * @returns {Promise<{ bkashURL: string, paymentID: string }>}
 */
export async function initiateBKashPayment(order, creds, callbackUrl) {
  const base = creds.sandbox ? BKASH_BASE_SANDBOX : BKASH_BASE_LIVE;

  // Step 1: Grant token
  const tokenRes = await fetch(`${base}/tokenized/checkout/token/grant`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      username: creds.username,
      password: creds.password,
    },
    body: JSON.stringify({
      app_key: creds.app_key,
      app_secret: creds.app_secret,
    }),
  });
  const tokenData = await tokenRes.json();
  if (!tokenRes.ok || !tokenData.id_token) {
    throw Object.assign(
      new Error(
        "bKash token grant failed: " +
          (tokenData.msg ?? JSON.stringify(tokenData)),
      ),
      { code: "GATEWAY_ERROR" },
    );
  }

  // Step 2: Create payment session
  const paymentRes = await fetch(`${base}/tokenized/checkout/create`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      authorization: tokenData.id_token,
      "x-app-key": creds.app_key,
    },
    body: JSON.stringify({
      mode: "0011", // Tokenized checkout
      payerReference: order.order_number,
      callbackURL: callbackUrl,
      amount: String(Number(order.grand_total).toFixed(2)),
      currency: "BDT",
      intent: "sale",
      merchantInvoiceNumber: order.order_number,
    }),
  });
  const paymentData = await paymentRes.json();
  if (!paymentRes.ok || paymentData.statusCode !== "0000") {
    throw Object.assign(
      new Error(
        "bKash payment create failed: " +
          (paymentData.statusMessage ?? JSON.stringify(paymentData)),
      ),
      { code: "GATEWAY_ERROR" },
    );
  }

  return { bkashURL: paymentData.bkashURL, paymentID: paymentData.paymentID };
}

const SSL_LIVE_URL = "https://securepay.sslcommerz.com/gwprocess/v4/api.php";
const SSL_SANDBOX_URL = "https://sandbox.sslcommerz.com/gwprocess/v4/api.php";
const SSL_SUCCESS_REDIRECT = "/api/callbacks/sslcommerz/success";
const SSL_FAIL_REDIRECT = "/api/callbacks/sslcommerz/fail";
const SSL_CANCEL_REDIRECT = "/api/callbacks/sslcommerz/cancel";
const SSL_IPN_URL = "/api/callbacks/sslcommerz/ipn";

/**
 * Initiates an SSLCommerz payment and returns the gateway redirect URL (GatewayPageURL).
 *
 * @param {object} order - must have id, order_number, grand_total, currency, customer_name, customer_phone, customer_email
 * @param {object} creds - decrypted SSLCommerz credentials
 * @param {string} appUrl - base URL of the application (process.env.NEXT_PUBLIC_CREATE_APP_URL)
 * @returns {Promise<{ GatewayPageURL: string, sessionkey: string }>}
 */
export async function initiateSSLCommerzPayment(order, creds, appUrl) {
  const endpoint = creds.sandbox ? SSL_SANDBOX_URL : SSL_LIVE_URL;
  const baseUrl = appUrl ?? "";

  const params = new URLSearchParams({
    store_id: creds.store_id,
    store_passwd: creds.store_passwd,
    total_amount: String(Number(order.grand_total).toFixed(2)),
    currency: "BDT",
    tran_id: order.order_number,
    success_url: `${baseUrl}${SSL_SUCCESS_REDIRECT}?tran_id=${order.order_number}`,
    fail_url: `${baseUrl}${SSL_FAIL_REDIRECT}?tran_id=${order.order_number}`,
    cancel_url: `${baseUrl}${SSL_CANCEL_REDIRECT}?tran_id=${order.order_number}`,
    ipn_url: `${baseUrl}${SSL_IPN_URL}`,
    cus_name: order.customer_name ?? "Customer",
    cus_email: order.customer_email ?? "customer@example.com",
    cus_phone: order.customer_phone ?? "",
    cus_add1: order.customer_address?.line1 ?? "N/A",
    cus_city: order.customer_address?.city ?? "Dhaka",
    cus_country: "Bangladesh",
    shipping_method: "Courier",
    product_name: "Order " + order.order_number,
    product_category: "general",
    product_profile: "general",
  });

  const res = await fetch(endpoint, { method: "POST", body: params });
  const data = await res.json();

  if (data.status !== "SUCCESS" || !data.GatewayPageURL) {
    throw Object.assign(
      new Error(
        "SSLCommerz initiation failed: " +
          (data.failedreason ?? JSON.stringify(data)),
      ),
      { code: "GATEWAY_ERROR" },
    );
  }
  return { GatewayPageURL: data.GatewayPageURL, sessionkey: data.sessionkey };
}
