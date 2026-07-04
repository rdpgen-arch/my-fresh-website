/**
 * Nagad Payment Service — Full RSA-signed Merchant API Implementation
 *
 * Nagad's payment flow (Merchant API v1):
 *   1. Initialize  → POST to Nagad with RSA-encrypted sensitive data
 *   2. Complete    → POST to Nagad with amount + RSA-encrypted data
 *   3. IPN         → Nagad calls our webhook when payment is done
 *   4. Verify      → We query Nagad to verify payment status
 *
 * RSA operations:
 *   - Data sent to Nagad is RSA-encrypted with Nagad's public key (PKCS1 OAEP)
 *   - Signatures use merchant's private key (RSA-SHA256 PKCS1)
 */
import crypto from "crypto";

const NAGAD_LIVE_BASE = "https://api.mynagad.com/api/dfs";
const NAGAD_SANDBOX_BASE =
  "https://sandbox.mynagad.com:10080/merchant-server/api/dfs";

function getNagadBase(creds) {
  return creds.sandbox === true || creds.sandbox === "true"
    ? NAGAD_SANDBOX_BASE
    : NAGAD_LIVE_BASE;
}

function getDateTime() {
  const now = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
}

/**
 * Encrypt data with Nagad's RSA public key (PKCS1 OAEP / SHA-256)
 */
function encryptWithNagadKey(plaintext, nagadPublicKey) {
  // Nagad public key may be raw base64 or PEM — normalize to PEM
  const pem = wrapPem(nagadPublicKey, "PUBLIC KEY");
  const buffer = Buffer.from(plaintext, "utf8");
  const encrypted = crypto.publicEncrypt(
    { key: pem, padding: crypto.constants.RSA_PKCS1_OAEP_PADDING },
    buffer,
  );
  return encrypted.toString("base64");
}

/**
 * Sign data with merchant's RSA private key (SHA-256 + PKCS1)
 */
function signWithMerchantKey(data, merchantPrivateKey) {
  const pem = wrapPem(merchantPrivateKey, "PRIVATE KEY");
  const sign = crypto.createSign("SHA256");
  sign.update(data);
  sign.end();
  return sign.sign(pem, "base64");
}

/**
 * Wrap a raw base64 key in PEM headers if not already wrapped
 */
function wrapPem(key, type) {
  if (key.includes("-----")) return key;
  // Strip any whitespace/newlines from raw base64
  const raw = key.replace(/\s/g, "");
  const header = `-----BEGIN ${type}-----`;
  const footer = `-----END ${type}-----`;
  // Insert newlines every 64 chars
  const body = raw.match(/.{1,64}/g).join("\n");
  return `${header}\n${body}\n${footer}`;
}

/**
 * Common headers required by Nagad API
 */
function nagadHeaders(merchantId) {
  return {
    "Content-Type": "application/json",
    Accept: "application/json",
    "X-KM-Api-Version": "v-0.2.0",
    "X-KM-IP-V4": "127.0.0.1",
    "X-KM-Client-Type": "PC_WEB",
    "X-KM-MC-Id": merchantId,
  };
}

/**
 * Step 1: Initialize a Nagad payment session
 *
 * @param {object} order - { order_number, grand_total, id }
 * @param {object} creds - decrypted Nagad credentials from DB
 * @returns {Promise<{ callbackUrl: string, challenge: string, orderNumber: string }>}
 */
export async function initiateNagadPayment(order, creds) {
  const base = getNagadBase(creds);
  const merchantId = creds.merchant_id;
  const datetime = getDateTime();
  const challenge = crypto.randomBytes(16).toString("hex");

  const sensitivePayload = JSON.stringify({
    merchantId,
    datetime,
    orderId: order.order_number,
    challenge,
  });

  const encryptedSensitiveData = encryptWithNagadKey(
    sensitivePayload,
    creds.public_key,
  );
  const signature = signWithMerchantKey(
    encryptedSensitiveData,
    creds.private_key,
  );

  const endpoint = `${base}/check-out/initialize/${merchantId}/${order.order_number}`;

  const res = await fetch(endpoint, {
    method: "POST",
    headers: nagadHeaders(merchantId),
    body: JSON.stringify({
      dateTime: datetime,
      sensitiveData: encryptedSensitiveData,
      signature,
    }),
  });

  const data = await res.json();

  if (!res.ok || !data.sensitiveData) {
    throw Object.assign(
      new Error("Nagad initialize failed: " + JSON.stringify(data)),
      { code: "GATEWAY_ERROR" },
    );
  }

  // The callbackUrl is returned in the response
  const callbackUrl = data.callbackUrl || data.sensitiveData;
  return { callbackUrl, challenge, orderNumber: order.order_number };
}

/**
 * Step 2: Complete a Nagad payment session (redirect to this URL)
 *
 * @param {object} params
 * @param {string} params.orderId - order_number
 * @param {number} params.amount - grand_total
 * @param {string} params.challenge - from initialize step
 * @param {object} creds - decrypted Nagad credentials
 * @param {string} merchantCallbackURL - absolute URL for Nagad to POST result to
 * @returns {Promise<{ redirectUrl: string }>}
 */
export async function completeNagadPayment({
  orderId,
  amount,
  challenge,
  creds,
  merchantCallbackURL,
}) {
  const base = getNagadBase(creds);
  const merchantId = creds.merchant_id;

  const sensitivePayload = JSON.stringify({
    merchantId,
    orderId,
    amount: Number(amount).toFixed(2),
    currencyCode: "050",
    challenge,
  });

  const encryptedSensitiveData = encryptWithNagadKey(
    sensitivePayload,
    creds.public_key,
  );
  const signature = signWithMerchantKey(
    encryptedSensitiveData,
    creds.private_key,
  );

  const endpoint = `${base}/check-out/complete/${merchantId}/${orderId}`;

  const res = await fetch(endpoint, {
    method: "POST",
    headers: nagadHeaders(merchantId),
    body: JSON.stringify({
      sensitiveData: encryptedSensitiveData,
      signature,
      merchantCallbackURL,
    }),
  });

  const data = await res.json();

  if (!res.ok || data.status !== "Success") {
    throw Object.assign(
      new Error("Nagad complete failed: " + JSON.stringify(data)),
      { code: "GATEWAY_ERROR" },
    );
  }

  return { redirectUrl: data.callbackUrl || data.data?.callbackUrl };
}

/**
 * Verify a Nagad payment via API query
 *
 * @param {string} orderId - order_number (Nagad calls it orderId)
 * @param {object} creds - decrypted Nagad credentials
 * @returns {Promise<{ verified: boolean, transactionId?: string, amount?: string }>}
 */
export async function verifyNagadPayment(orderId, creds) {
  const base = getNagadBase(creds);
  const merchantId = creds.merchant_id;

  const endpoint = `${base}/verify/payment/${orderId}`;
  const res = await fetch(endpoint, {
    method: "GET",
    headers: nagadHeaders(merchantId),
  });

  const data = await res.json();

  const verified =
    data.status === "Success" && (data.paymentRefId || data.data?.paymentRefId);

  return {
    verified,
    transactionId: data.paymentRefId || data.data?.paymentRefId,
    amount: data.amount || data.data?.amount,
    rawResponse: data,
  };
}
