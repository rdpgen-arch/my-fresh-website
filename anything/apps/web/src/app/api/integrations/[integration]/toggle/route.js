/**
 * POST /api/integrations/:integration/toggle
 * Toggles the is_active flag for an integration without touching credentials.
 */

import { withTenant } from "@/app/api/middleware/withTenant";
import { withRole } from "@/app/api/middleware/withRole";
import { toggleIntegration } from "@/app/api/services/integration.service";
import { apiResponse } from "@/app/api/utils/response";

export const POST = withTenant(
  withRole("store:write", async (request, { params }, tenant) => {
    const { integration } = await params;

    let body;
    try {
      body = await request.json();
    } catch {
      return apiResponse.badRequest("Request body must be valid JSON.");
    }

    if (typeof body?.isActive !== "boolean")
      return apiResponse.badRequest("`isActive` must be a boolean.");

    const result = await toggleIntegration({
      storeId: tenant.storeId,
      integration,
      isActive: body.isActive,
    });

    if (!result)
      return apiResponse.notFound("Integration not configured for this store.");
    return apiResponse.ok(result);
  }),
);
