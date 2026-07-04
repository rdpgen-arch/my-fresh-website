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

  const { token, newPassword } = body ?? {};
  if (!token || !newPassword)
    return apiResponse.badRequest("token and newPassword are required.");
  if (newPassword.length < 8)
    return apiResponse.badRequest("Password must be at least 8 characters.");

  const tokenHash = hashToken(token);

  const rows = await sql`
    SELECT id, user_id, store_id, expires_at, used_at
    FROM password_reset_tokens
    WHERE token_hash = ${tokenHash}
    LIMIT 1
  `;

  if (!rows[0]) return apiResponse.badRequest("Invalid or expired reset link.");
  const rec = rows[0];

  if (rec.used_at)
    return apiResponse.badRequest("This reset link has already been used.");
  if (new Date(rec.expires_at) < new Date())
    return apiResponse.badRequest("This reset link has expired.");

  const passwordHash = await argon2.hash(newPassword);

  await sql.transaction([
    sql`UPDATE users SET password_hash = ${passwordHash}, updated_at = now()
        WHERE id = ${rec.user_id} AND store_id = ${rec.store_id}`,
    sql`UPDATE password_reset_tokens SET used_at = now() WHERE id = ${rec.id}`,
  ]);

  return apiResponse.ok({ message: "Password updated successfully." });
}
