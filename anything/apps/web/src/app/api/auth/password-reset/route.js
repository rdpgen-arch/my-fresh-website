/**
 * Password Reset Flow
 *
 * POST /api/auth/password-reset         — request a reset token
 * POST /api/auth/password-reset/confirm — consume token + set new password
 */

import sql from "@/app/api/utils/sql";
import { sendPasswordReset } from "@/app/api/services/email.service";
import { apiResponse } from "@/app/api/utils/response";
import { createHash, randomBytes } from "crypto";

const APP_URL = process.env.NEXT_PUBLIC_CREATE_APP_URL ?? "";
const TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour

function hashToken(raw) {
  return createHash("sha256").update(raw).digest("hex");
}

// ── POST /api/auth/password-reset  (request) ─────────────────────────────────

export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return apiResponse.badRequest("Invalid JSON.");
  }

  const { storeSlug, email } = body ?? {};
  if (!storeSlug || !email)
    return apiResponse.badRequest("storeSlug and email are required.");

  // Resolve store
  const stores =
    await sql`SELECT id, name FROM stores WHERE slug = ${storeSlug} AND is_active = true LIMIT 1`;
  if (!stores[0]) return apiResponse.ok(null); // silent — don't leak store existence

  const store = stores[0];

  // Resolve user (silent on not-found to prevent email enumeration)
  const users = await sql`
    SELECT id, full_name FROM users
    WHERE store_id = ${store.id} AND email = ${email.toLowerCase().trim()} AND is_active = true LIMIT 1
  `;
  if (!users[0]) return apiResponse.ok(null); // silent

  // Invalidate any existing tokens for this user
  await sql`DELETE FROM password_reset_tokens WHERE user_id = ${users[0].id} AND used_at IS NULL`;

  // Generate token
  const rawToken = randomBytes(32).toString("hex");
  const tokenHash = hashToken(rawToken);
  const expiresAt = new Date(Date.now() + TOKEN_TTL_MS);

  await sql`
    INSERT INTO password_reset_tokens (user_id, store_id, token_hash, expires_at)
    VALUES (${users[0].id}, ${store.id}, ${tokenHash}, ${expiresAt.toISOString()})
  `;

  const resetUrl = `${APP_URL}/admin/reset-password?token=${rawToken}&store=${storeSlug}`;
  await sendPasswordReset({ email, resetUrl, storeName: store.name });

  return apiResponse.ok(null); // always 200 — no information leakage
}
