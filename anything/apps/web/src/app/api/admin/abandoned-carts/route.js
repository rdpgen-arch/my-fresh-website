/**
 * GET /api/admin/abandoned-carts
 * Lists abandoned carts for the authenticated tenant store.
 * Supports ?recovered=false&days=7&page=1&limit=50
 */

import sql from "@/app/api/utils/sql";
import { withTenant } from "@/app/api/middleware/withTenant";
import { apiResponse } from "@/app/api/utils/response";

async function handler(request, ctx) {
  const { storeId } = ctx;
  const { searchParams } = new URL(request.url);

  const recovered = searchParams.get("recovered"); // "true" | "false" | null
  const days = Number(searchParams.get("days") ?? 30);
  const page = Math.max(1, Number(searchParams.get("page") ?? 1));
  const limit = Math.min(100, Number(searchParams.get("limit") ?? 50));
  const offset = (page - 1) * limit;

  const carts = await sql`
    SELECT
      id, session_key,
      customer_name, customer_phone, customer_email,
      cart_items, cart_total, currency,
      source_url, recovered,
      last_seen_at, created_at
    FROM abandoned_carts
    WHERE store_id = ${storeId}
      AND last_seen_at >= now() - (${days} || ' days')::interval
      AND (${recovered === null ? true : null} IS NOT NULL OR recovered = ${recovered === "true"})
    ORDER BY last_seen_at DESC
    LIMIT ${limit} OFFSET ${offset}
  `;

  return apiResponse.ok({ carts, page, limit });
}

export const GET = (req, ctx) => withTenant(handler)(req, ctx);
