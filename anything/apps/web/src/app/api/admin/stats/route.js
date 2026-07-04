/**
 * GET /api/admin/stats
 *
 * Returns two KPIs for the admin dashboard:
 *   - pending_orders  : count of orders with status = 'pending'
 *   - today_revenue   : sum of grand_total for orders created today (UTC)
 *
 * Protected by withTenant — requires a valid Bearer token.
 */

import sql from "@/app/api/utils/sql";
import { withTenant } from "@/app/api/middleware/withTenant";
import { apiResponse } from "@/app/api/utils/response";

async function handler(_request, _routeCtx, { storeId }) {
  try {
    const [pendingRow, todayRow] = await sql.transaction([
      sql`
        SELECT COUNT(*)::int AS cnt
        FROM   orders
        WHERE  store_id = ${storeId}
          AND  status   = 'pending'
      `,
      sql`
        SELECT
          COALESCE(SUM(grand_total), 0)::numeric AS total,
          COUNT(*)::int                           AS order_count
        FROM   orders
        WHERE  store_id   = ${storeId}
          AND  created_at >= date_trunc('day', now() AT TIME ZONE 'UTC')
      `,
    ]);

    return apiResponse.success({
      pending_orders: pendingRow[0]?.cnt ?? 0,
      today_revenue: Number(todayRow[0]?.total ?? 0),
      today_orders: todayRow[0]?.order_count ?? 0,
    });
  } catch (err) {
    console.error("[admin/stats]", err);
    return apiResponse.internalError("Failed to load stats.");
  }
}

export const GET = withTenant(handler);
