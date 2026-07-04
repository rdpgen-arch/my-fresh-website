/**
 * POST /api/auth/invite          — send an invite
 * POST /api/auth/invite/accept   — accept an invite (set password → create user)
 */

import sql from "@/app/api/utils/sql";
import { sendUserInvite } from "@/app/api/services/email.service";
import { withTenant } from "@/app/api/middleware/withTenant";
import { withRole } from "@/app/api/middleware/withRole";
import { apiResponse } from "@/app/api/utils/response";
import { createHash, randomBytes } from "crypto";

const APP_URL = process.env.NEXT_PUBLIC_CREATE_APP_URL ?? "";
const INVITE_TTL_MS = 72 * 60 * 60 * 1000;

function hashToken(raw) {
  return createHash("sha256").update(raw).digest("hex");
}

// ── POST /api/auth/invite ─────────────────────────────────────────────────────

async function inviteHandler(request, _rc, { storeId, storeName, userId }) {
  let body;
  try {
    body = await request.json();
  } catch {
    return apiResponse.badRequest("Invalid JSON.");
  }

  const { email, roleId } = body ?? {};
  if (!email || !roleId)
    return apiResponse.badRequest("email and roleId are required.");

  // Check role belongs to this store
  const roles =
    await sql`SELECT id, name FROM roles WHERE id = ${roleId} AND (store_id = ${storeId} OR store_id IS NULL) LIMIT 1`;
  if (!roles[0]) return apiResponse.notFound("Role not found.");

  // Don't re-invite an existing active user
  const existing =
    await sql`SELECT id FROM users WHERE store_id = ${storeId} AND email = ${email.toLowerCase().trim()} AND is_active = true LIMIT 1`;
  if (existing[0])
    return apiResponse.conflict(
      "A user with this email already exists in this store.",
    );

  // Invalidate old invites for same email/store
  await sql`DELETE FROM user_invites WHERE store_id = ${storeId} AND email = ${email.toLowerCase().trim()}`;

  const rawToken = randomBytes(32).toString("hex");
  const tokenHash = hashToken(rawToken);
  const expiresAt = new Date(Date.now() + INVITE_TTL_MS);

  await sql`
    INSERT INTO user_invites (store_id, email, role_id, token_hash, invited_by, expires_at)
    VALUES (${storeId}, ${email.toLowerCase().trim()}, ${roleId}, ${tokenHash}, ${userId}, ${expiresAt.toISOString()})
  `;

  // Get inviter name
  const inviters =
    await sql`SELECT full_name, email FROM users WHERE id = ${userId} LIMIT 1`;
  const inviterName =
    inviters[0]?.full_name || inviters[0]?.email || "A team member";

  const inviteUrl = `${APP_URL}/admin/accept-invite?token=${rawToken}`;
  await sendUserInvite({
    email,
    inviteUrl,
    storeName,
    invitedByName: inviterName,
    roleName: roles[0].name,
  });

  return apiResponse.created({ message: "Invite sent." });
}

export const POST = withTenant(withRole("users:write", inviteHandler));
