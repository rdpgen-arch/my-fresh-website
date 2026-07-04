/**
 * GET /api/orders/shipping-zones  — List available shipping zones for the tenant
 * Used by order creation form to populate zone picker + live delivery charge.
 */

import { withTenant } from "@/app/api/middleware/withTenant";
import { withRole } from "@/app/api/middleware/withRole";
import { listShippingZones } from "@/app/api/services/order.service";
import { apiResponse } from "@/app/api/utils/response";

export const GET = withTenant(
  withRole("orders:read", async (_req, _ctx, tenant) => {
    const zones = await listShippingZones({ storeId: tenant.storeId });
    return apiResponse.ok(zones);
  }),
);
