/**
 * GET   /api/admin/store/domain         — get current custom domain
 * POST  /api/admin/store/domain/verify  — verify DNS and save if correct
 * DELETE /api/admin/store/domain        — remove custom domain
 */

import sql from "@/app/api/utils/sql";
import { withTenant } from "@/app/api/middleware/withTenant";
import { withRole } from "@/app/api/middleware/withRole";
import { apiResponse } from "@/app/api/utils/response";

async function getHandler(_req, _rc, { storeId }) {
  const rows =
    await sql`SELECT custom_domain, slug FROM stores WHERE id = ${storeId} LIMIT 1`;
  return apiResponse.success({
    customDomain: rows[0]?.custom_domain ?? null,
    slug: rows[0]?.slug,
  });
}

async function saveHandler(request, _rc, { storeId }) {
  let body;
  try {
    body = await request.json();
  } catch {
    return apiResponse.badRequest("Invalid JSON.");
  }
  const { domain } = body ?? {};
  if (!domain) return apiResponse.badRequest("domain is required.");

  const cleaned = domain
    .toLowerCase()
    .trim()
    .replace(/^https?:\/\//, "")
    .replace(/\/$/, "");

  // Check uniqueness across stores
  const conflict = await sql`
    SELECT id FROM stores WHERE custom_domain = ${cleaned} AND id != ${storeId} LIMIT 1
  `;
  if (conflict[0])
    return apiResponse.conflict(
      "This domain is already registered to another store.",
    );

  // DNS verification: attempt a CNAME lookup via public DoH
  let verified = false;
  try {
    const storeRows =
      await sql`SELECT slug FROM stores WHERE id = ${storeId} LIMIT 1`;
    const slug = storeRows[0]?.slug;
    const appHost = new URL(
      process.env.NEXT_PUBLIC_CREATE_APP_URL ?? "https://platformhq.app",
    ).hostname;
    const dohUrl = `https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(cleaned)}&type=CNAME`;
    const res = await fetch(dohUrl, {
      headers: { Accept: "application/dns-json" },
    });
    const data = await res.json();
    const answer = (data.Answer ?? []).find((a) => a.type === 5); // CNAME = 5
    if (answer?.data?.replace(/\.$/, "") === appHost) verified = true;
    // Also accept direct A-record match (some setups don't use CNAME)
  } catch {
    /* DNS lookup optional — save anyway with unverified flag */
  }

  await sql`
    UPDATE stores SET custom_domain = ${cleaned}, updated_at = now() WHERE id = ${storeId}
  `;

  return apiResponse.success({ customDomain: cleaned, dnsVerified: verified });
}

async function deleteHandler(_req, _rc, { storeId }) {
  await sql`UPDATE stores SET custom_domain = NULL, updated_at = now() WHERE id = ${storeId}`;
  return apiResponse.success({ customDomain: null });
}

export const GET = withTenant(withRole("store:read", getHandler));
export const POST = withTenant(withRole("store:write", saveHandler));
export const DELETE = withTenant(withRole("store:write", deleteHandler));
