/**
 * Low Stock Alert Check (can be called manually or via a cron-like trigger)
 * POST /api/notifications/low-stock-check
 *
 * Checks all products for low stock and sends SMS to merchant.
 * Protected by PLATFORM_SECRET for external scheduling.
 */
import { sendSMS, smsLowStockAlert } from "@/app/api/services/sms.service";
import sql from "@/app/api/utils/sql";

export async function POST(request) {
  // Auth: require either a JWT (tenant) or the platform secret
  const authHeader = request.headers.get("authorization") || "";
  const platformSecret = process.env.PLATFORM_SECRET;
  const isSystemCall =
    platformSecret && authHeader === `Bearer ${platformSecret}`;

  if (!isSystemCall) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Find all products across all stores that are below their threshold
    const lowStockProducts = await sql`
      SELECT
        p.id, p.name, p.sku, p.stock_quantity, p.low_stock_threshold,
        p.store_id,
        s.contact_phone AS merchant_phone,
        s.name AS store_name
      FROM products p
      JOIN stores s ON s.id = p.store_id
      WHERE p.stock_quantity IS NOT NULL
        AND p.stock_quantity <= COALESCE(p.low_stock_threshold, 5)
        AND p.stock_quantity >= 0
        AND p.status = 'published'
        AND s.is_active = true
      ORDER BY p.store_id, p.stock_quantity ASC
      LIMIT 500
    `;

    let alertsSent = 0;
    for (const product of lowStockProducts) {
      if (!product.merchant_phone) continue;
      const result = await sendSMS({
        storeId: product.store_id,
        to: product.merchant_phone,
        message: smsLowStockAlert({
          productName: product.name,
          sku: product.sku,
          stockQuantity: product.stock_quantity,
        }),
        type: "low_stock_alert",
      });
      if (result.sent) alertsSent++;
    }

    return Response.json({
      checked: lowStockProducts.length,
      alertsSent,
    });
  } catch (err) {
    console.error("[Low stock check]", err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}
