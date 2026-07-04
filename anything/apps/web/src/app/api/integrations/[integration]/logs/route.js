/**
 * GET /api/integrations/:integration/logs  — IPN event log for one integration
 */

import { withTenant } from "@/app/api/middleware/withTenant";
import { withRole } from "@/app/api/middleware/withRole";
import { listIPNLogs } from "@/app/api/services/integration.service";
import { apiResponse } from "@/app/api/utils/response";

export const GET = withTenant(
  withRole("store:read", async (request, { params }, tenant) => {
    const { integration } = await params;
    const { searchParams } = new URL(request.url);
    const logs = await listIPNLogs({
      storeId: tenant.storeId,
      integration,
      limit: searchParams.get("limit") ?? 100,
    });
    return apiResponse.ok(logs);
  }),
);
