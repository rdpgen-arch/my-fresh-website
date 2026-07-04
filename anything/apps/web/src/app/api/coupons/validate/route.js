/**
 * POST /api/coupons/validate
 * Public endpoint — called from the storefront checkout.
 * Body: { storeSlug, code, orderSubtotal }
 */

import sql from "@/app/api/utils/sql";
import { apiResponse } from "@/app/api/utils/response";

export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return apiResponse.badRequest("Invalid JSON.");
  }

  const { storeSlug, code, orderSubtotal = 0 } = body ?? {};
  if (!storeSlug || !code)
    return apiResponse.badRequest("storeSlug and code are required.");

  const stores =
    await sql`SELECT id FROM stores WHERE slug = ${storeSlug} AND is_active = true LIMIT 1`;
  if (!stores[0]) return apiResponse.notFound("Store not found.");

  const coupons = await sql`
    SELECT * FROM coupons
    WHERE store_id  = ${stores[0].id}
      AND upper(code) = ${code.trim().toUpperCase()}
      AND is_active   = true
    LIMIT 1
  `;

  if (!coupons[0]) return apiResponse.badRequest("Invalid coupon code.");
  const coupon = coupons[0];

  if (coupon.expires_at && new Date(coupon.expires_at) < new Date()) {
    return apiResponse.badRequest("This coupon has expired.");
  }
  if (coupon.max_uses !== null && coupon.uses_count >= coupon.max_uses) {
    return apiResponse.badRequest("This coupon has reached its usage limit.");
  }
  if (Number(orderSubtotal) < Number(coupon.min_order_value)) {
    return apiResponse.badRequest(
      `Minimum order value of ${coupon.min_order_value} required for this coupon.`,
    );
  }

  const discountAmount =
    coupon.discount_type === "percentage"
      ? Math.min(
          Number(orderSubtotal),
          (Number(orderSubtotal) * Number(coupon.discount_value)) / 100,
        )
      : Math.min(Number(orderSubtotal), Number(coupon.discount_value));

  return apiResponse.success({
    couponId: coupon.id,
    code: coupon.code,
    discountType: coupon.discount_type,
    discountValue: Number(coupon.discount_value),
    discountAmount: Math.round(discountAmount * 100) / 100,
  });
}
