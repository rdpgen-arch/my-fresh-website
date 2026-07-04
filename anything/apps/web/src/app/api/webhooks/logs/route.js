/**
 * GET /api/webhooks/logs  — Delivery log viewer for the admin UI
 *
 * Returns paginated `webhook_deliveries` rows (the logical delivery events)
 * with optional filtering by webhookId and status.
 *
 * GET /api/webhooks/logs/attempts  — Raw HTTP attempt log (individual tries)
 */

import { withTenant } from "@/app/api/middleware/withTenant";
import {
  listDeliveryLogs,
  listAttemptLogs,
} from "@/app/api/services/webhook.service";
import { apiResponse } from "@/app/api/utils/response";

export const GET = withTenant(async (request, _ctx, tenant) => {
  const { searchParams } = new URL(request.url);

  const result = await listDeliveryLogs({
    storeId: tenant.storeId,
    webhookId: searchParams.get("webhookId") ?? undefined,
    status: searchParams.get("status") ?? undefined,
    page: searchParams.get("page") ?? 1,
    limit: searchParams.get("limit") ?? 50,
  });

  return apiResponse.ok(result.deliveries, {
    total: result.total,
    page: result.page,
    limit: result.limit,
    pages: Math.ceil(result.total / result.limit),
  });
});
