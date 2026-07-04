/**
 * GET  /api/integrations  — List configured integrations (no credentials returned)
 * POST /api/integrations  — Upsert an integration config (save credentials)
 *
 * RBAC: integrations:read / integrations:write
 */

import { withTenant } from "@/app/api/middleware/withTenant";
import { withRole } from "@/app/api/middleware/withRole";
import {
  listIntegrations,
  upsertIntegration,
  INTEGRATION_REGISTRY,
} from "@/app/api/services/integration.service";
import { apiResponse } from "@/app/api/utils/response";

// GET — returns configured + unconfigured integrations merged with registry metadata
export const GET = withTenant(
  withRole("store:read", async (_req, _ctx, tenant) => {
    const configured = await listIntegrations({ storeId: tenant.storeId });

    // Build a map of what's already configured
    const configuredMap = Object.fromEntries(
      configured.map((c) => [c.integration, c]),
    );

    // Merge registry definitions with live DB state
    const merged = INTEGRATION_REGISTRY.map((reg) => {
      const live = configuredMap[reg.id];
      return {
        id: reg.id,
        label: reg.label,
        category: reg.category,
        description: reg.description,
        docsUrl: reg.docsUrl,
        fields: reg.fields,
        sensitiveFields: reg.sensitiveFields,
        // Live state (null if never configured)
        configured: !!live,
        is_active: live?.is_active ?? false,
        public_config: live?.public_config ?? {},
        updated_at: live?.updated_at ?? null,
      };
    });

    return apiResponse.ok(merged);
  }),
);

// POST — save / update credentials for one integration
export const POST = withTenant(
  withRole("store:write", async (request, _ctx, tenant) => {
    let body;
    try {
      body = await request.json();
    } catch {
      return apiResponse.badRequest("Request body must be valid JSON.");
    }

    const { integration, fieldValues, isActive } = body ?? {};

    if (!integration || typeof integration !== "string")
      return apiResponse.badRequest("`integration` identifier is required.");

    if (!fieldValues || typeof fieldValues !== "object")
      return apiResponse.badRequest(
        "`fieldValues` must be a key-value object.",
      );

    try {
      const result = await upsertIntegration({
        storeId: tenant.storeId,
        integration,
        fieldValues,
        isActive: isActive ?? undefined,
      });
      return apiResponse.ok(result);
    } catch (err) {
      if (err.code === "NOT_FOUND") return apiResponse.badRequest(err.message);
      console.error("[POST /api/integrations]", err);
      return apiResponse.internalError("Failed to save integration.");
    }
  }),
);
