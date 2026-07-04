/**
 * Lightweight JWT utility using the Web Crypto API (no external dependencies).
 * Algorithm: HMAC-SHA256 (HS256)
 */

const enc = new TextEncoder();

const b64url = (buf) => Buffer.from(buf).toString("base64url");

const b64urlDecode = (str) => Buffer.from(str, "base64url");

async function importKey(secret) {
  return crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

/**
 * Signs a JWT with HS256.
 * @param {object} payload  - Claims to encode. `iat` and `exp` are added automatically.
 * @param {string} secret   - HMAC secret (use AUTH_SECRET env var).
 * @param {number} expiresIn - Expiry in seconds (default 8 hours).
 * @returns {Promise<string>} Signed JWT string.
 */
export async function signJWT(payload, secret, expiresIn = 60 * 60 * 8) {
  const now = Math.floor(Date.now() / 1000);
  const claims = { ...payload, iat: now, exp: now + expiresIn };

  const header = b64url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const body = b64url(JSON.stringify(claims));
  const signingInput = `${header}.${body}`;

  const key = await importKey(secret);
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    enc.encode(signingInput),
  );

  return `${signingInput}.${b64url(signature)}`;
}

/**
 * Verifies a JWT and returns its payload, or null if invalid/expired.
 * @param {string} token  - The raw JWT string.
 * @param {string} secret - HMAC secret to verify against.
 * @returns {Promise<object|null>}
 */
export async function verifyJWT(token, secret) {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;

    const [header, body, sig] = parts;
    const signingInput = `${header}.${body}`;

    const key = await importKey(secret);
    const isValid = await crypto.subtle.verify(
      "HMAC",
      key,
      b64urlDecode(sig),
      enc.encode(signingInput),
    );

    if (!isValid) return null;

    const payload = JSON.parse(b64urlDecode(body).toString("utf8"));

    if (payload.exp < Math.floor(Date.now() / 1000)) {
      return null; // Token expired
    }

    return payload;
  } catch {
    return null;
  }
}
