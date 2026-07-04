/**
 * GET  /api/coupons  — list coupons for the store
 * POST /api/coupons  — create a coupon
 */

import sql from "@/app/api/utils/sql";
import { withTenant } from "@/app/api/middleware/withTenant";
import { withRole } from "@/app/api/middleware/withRole";
import { apiResponse } from "@/app/api/utils/response";

async function listHandler(_req, _rc, { storeId }) {
  const rows = await sql`
    SELECT * FROM coupons WHERE store_id = ${storeId} ORDER BY created_at DESC
  `;
  return apiResponse.success(rows);
}

async function createHandler(request, _rc, { storeId }) {
  let body;
  try {
    body = await request.json();
  } catch {
    return apiResponse.badRequest("Invalid JSON.");
  }

  const {
    code,
    description,
    discountType,
    discountValue,
    minOrderValue,
    maxUses,
    expiresAt,
  } = body ?? {};
  if (!code) return apiResponse.badRequest("code is required.");
  if (!discountType)
    return apiResponse.badRequest(
      "discountType is required (percentage|flat).",
    );
  if (!discountValue)
    return apiResponse.badRequest("discountValue is required.");

  try {
    const rows = await sql`
      INSERT INTO coupons (store_id, code, description, discount_type, discount_value, min_order_value, max_uses, expires_at)
      VALUES (
        ${storeId}, ${code.trim().toUpperCase()}, ${description ?? null},
        ${discountType}, ${discountValue}, ${minOrderValue ?? 0},
        ${maxUses ?? null}, ${expiresAt ?? null}
      )
      RETURNING *
    `;
    return apiResponse.created(rows[0]);
  } catch (err) {
    if (err.code === "23505")
      return apiResponse.conflict("A coupon with this code already exists.");
    console.error("[POST /api/coupons]", err);
    return apiResponse.internalError("Failed to create coupon.");
  }
}

export const GET = withTenant(withRole("orders:read", listHandler));
export const POST = withTenant(withRole("orders:write", createHandler));
