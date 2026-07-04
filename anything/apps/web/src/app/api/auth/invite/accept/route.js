import sql from "@/app/api/utils/sql";
import { apiResponse } from "@/app/api/utils/response";
import { createHash } from "crypto";
import argon2 from "argon2";

function hashToken(raw) {
  return createHash("sha256").update(raw).digest("hex");
}

export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return apiResponse.badRequest("Invalid JSON.");
  }

  const { token, fullName, password } = body ?? {};
  if (!token || !password)
    return apiResponse.badRequest("token and password are required.");
  if (password.length < 8)
    return apiResponse.badRequest("Password must be at least 8 characters.");

  const tokenHash = hashToken(token);
  const rows = await sql`
    SELECT id, store_id, email, role_id, expires_at, accepted_at
    FROM user_invites
    WHERE token_hash = ${tokenHash} LIMIT 1
  `;
  if (!rows[0]) return apiResponse.badRequest("Invalid or expired invite.");
  const inv = rows[0];

  if (inv.accepted_at)
    return apiResponse.badRequest("This invite has already been accepted.");
  if (new Date(inv.expires_at) < new Date())
    return apiResponse.badRequest("This invite has expired.");

  const passwordHash = await argon2.hash(password);

  const newUsers = await sql`
    INSERT INTO users (store_id, role_id, email, password_hash, full_name, is_active)
    VALUES (${inv.store_id}, ${inv.role_id}, ${inv.email}, ${passwordHash}, ${fullName?.trim() || null}, true)
    ON CONFLICT (store_id, email) DO UPDATE
      SET password_hash = EXCLUDED.password_hash,
          full_name     = EXCLUDED.full_name,
          is_active     = true,
          updated_at    = now()
    RETURNING id, email, full_name
  `;
  await sql`UPDATE user_invites SET accepted_at = now() WHERE id = ${inv.id}`;

  return apiResponse.ok({ user: newUsers[0] });
}
