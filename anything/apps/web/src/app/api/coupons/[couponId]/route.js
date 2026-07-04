import sql from "@/app/api/utils/sql";
import { withTenant } from "@/app/api/middleware/withTenant";
import { withRole } from "@/app/api/middleware/withRole";
import { apiResponse } from "@/app/api/utils/response";

async function patchHandler(request, { params }, { storeId }) {
  const { couponId } = params;
  let body;
  try {
    body = await request.json();
  } catch {
    return apiResponse.badRequest("Invalid JSON.");
  }

  const allowed = [
    "code",
    "description",
    "discount_type",
    "discount_value",
    "min_order_value",
    "max_uses",
    "expires_at",
    "is_active",
  ];
  const setClauses = [];
  const values = [];
  let idx = 1;

  for (const key of allowed) {
    const camel = key.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
    const val = body[camel] ?? body[key];
    if (val !== undefined) {
      setClauses.push(`${key} = $${idx++}`);
      values.push(val);
    }
  }
  if (!setClauses.length) return apiResponse.badRequest("No fields to update.");

  values.push(couponId, storeId);
  const rows = await sql(
    `UPDATE coupons SET ${setClauses.join(", ")} WHERE id = $${idx} AND store_id = $${idx + 1} RETURNING *`,
    values,
  );
  if (!rows[0]) return apiResponse.notFound("Coupon not found.");
  return apiResponse.success(rows[0]);
}

async function deleteHandler(_req, { params }, { storeId }) {
  const { couponId } = params;
  const rows =
    await sql`DELETE FROM coupons WHERE id = ${couponId} AND store_id = ${storeId} RETURNING id`;
  if (!rows[0]) return apiResponse.notFound("Coupon not found.");
  return new Response(null, { status: 204 });
}

export const PATCH = withTenant(withRole("orders:write", patchHandler));
export const DELETE = withTenant(withRole("orders:delete", deleteHandler));
