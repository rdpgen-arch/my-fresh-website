/**
 * GET /api/admin/analytics?period=7|30
 *
 * Returns:
 *   - revenue_by_day      : [{date, revenue, orders}]
 *   - orders_by_status    : [{status, count}]
 *   - top_products        : [{name, sku, units_sold, revenue}]
 *   - payment_breakdown   : [{method, count, revenue}]
 *   - shipping_breakdown  : [{zone, count, revenue}]
 */

import sql from "@/app/api/utils/sql";
import { withTenant } from "@/app/api/middleware/withTenant";
import { apiResponse } from "@/app/api/utils/response";

async function handler(request, _rc, { storeId }) {
  const { searchParams } = new URL(request.url);
  const period = searchParams.get("period") === "30" ? 30 : 7;

  try {
    const [
      revenueByDay,
      ordersByStatus,
      topProducts,
      paymentBreakdown,
      shippingBreakdown,
    ] = await sql.transaction([
      // Revenue + order count per day for the last N days
      sql`
          SELECT
            to_char(date_trunc('day', created_at AT TIME ZONE 'UTC'), 'YYYY-MM-DD') AS date,
            COALESCE(SUM(grand_total), 0)::numeric                                   AS revenue,
            COUNT(*)::int                                                             AS orders
          FROM orders
          WHERE store_id  = ${storeId}
            AND status   != 'cancelled'
            AND created_at >= now() - (${period} || ' days')::interval
          GROUP BY 1
          ORDER BY 1 ASC
        `,
      // Orders by status
      sql`
          SELECT status, COUNT(*)::int AS cnt
          FROM   orders
          WHERE  store_id = ${storeId}
          GROUP BY status
          ORDER BY cnt DESC
        `,
      // Top 10 products by revenue
      sql`
          SELECT
            oi.name,
            oi.sku,
            SUM(oi.quantity)::int        AS units_sold,
            SUM(oi.line_total)::numeric  AS revenue
          FROM   order_items oi
          JOIN   orders      o  ON o.id = oi.order_id
          WHERE  oi.store_id  = ${storeId}
            AND  o.status    != 'cancelled'
            AND  o.created_at >= now() - (${period} || ' days')::interval
          GROUP BY oi.name, oi.sku
          ORDER BY revenue DESC
          LIMIT 10
        `,
      // Payment method breakdown
      sql`
          SELECT
            payment_method             AS method,
            COUNT(*)::int              AS cnt,
            SUM(grand_total)::numeric  AS revenue
          FROM   orders
          WHERE  store_id  = ${storeId}
            AND  status   != 'cancelled'
            AND  created_at >= now() - (${period} || ' days')::interval
          GROUP BY payment_method
          ORDER BY revenue DESC
        `,
      // Shipping zone breakdown
      sql`
          SELECT
            COALESCE(shipping_zone_name, 'No zone') AS zone,
            COUNT(*)::int              AS cnt,
            SUM(grand_total)::numeric  AS revenue
          FROM   orders
          WHERE  store_id  = ${storeId}
            AND  status   != 'cancelled'
            AND  created_at >= now() - (${period} || ' days')::interval
          GROUP BY shipping_zone_name
          ORDER BY revenue DESC
        `,
    ]);

    return apiResponse.success({
      period,
      revenue_by_day: revenueByDay,
      orders_by_status: ordersByStatus.map((r) => ({
        status: r.status,
        count: r.cnt,
      })),
      top_products: topProducts,
      payment_breakdown: paymentBreakdown.map((r) => ({
        method: r.method,
        count: r.cnt,
        revenue: r.revenue,
      })),
      shipping_breakdown: shippingBreakdown.map((r) => ({
        zone: r.zone,
        count: r.cnt,
        revenue: r.revenue,
      })),
    });
  } catch (err) {
    console.error("[admin/analytics]", err);
    return apiResponse.internalError("Failed to load analytics.");
  }
}

export const GET = withTenant(handler);
