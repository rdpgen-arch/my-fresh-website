/**
 * GET   /api/admin/store  — get store settings
 * PATCH /api/admin/store  — update store settings
 */

import sql from "@/app/api/utils/sql";
import { withTenant } from "@/app/api/middleware/withTenant";
import { withRole } from "@/app/api/middleware/withRole";
import { apiResponse } from "@/app/api/utils/response";

async function getHandler(_req, _rc, { storeId }) {
  const rows = await sql`
    SELECT id, name, slug, description, logo_url, contact_email, contact_phone,
           currency, custom_domain, theme_config, is_active, created_at
    FROM stores WHERE id = ${storeId} LIMIT 1
  `;
  if (!rows[0]) return apiResponse.notFound("Store not found.");
  return apiResponse.success(rows[0]);
}

async function patchHandler(request, _rc, { storeId }) {
  let body;
  try {
    body = await request.json();
  } catch {
    return apiResponse.badRequest("Invalid JSON.");
  }

  const allowed = [
    "name",
    "description",
    "logo_url",
    "contact_email",
    "contact_phone",
    "currency",
    "theme_config",
  ];
  const setClauses = [];
  const values = [];
  let idx = 1;

  for (const key of allowed) {
    const camel = key.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
    const val = body[camel] ?? body[key];
    if (val !== undefined) {
      if (key === "theme_config") {
        setClauses.push(`theme_config = $${idx++}`);
        values.push(typeof val === "string" ? val : JSON.stringify(val));
      } else {
        setClauses.push(`${key} = $${idx++}`);
        values.push(val);
      }
    }
  }

  if (!setClauses.length) return apiResponse.badRequest("No fields to update.");
  setClauses.push(`updated_at = now()`);
  values.push(storeId);

  const rows = await sql(
    `UPDATE stores SET ${setClauses.join(", ")} WHERE id = $${idx} RETURNING id, name, slug, description, logo_url, contact_email, contact_phone, currency, custom_domain, theme_config`,
    values,
  );
  return apiResponse.success(rows[0]);
}

export const GET = withTenant(withRole("store:read", getHandler));
export const PATCH = withTenant(withRole("store:write", patchHandler));
