/**
 * GET  /api/webhooks  — List webhook configs for the tenant
 * POST /api/webhooks  — Create a new webhook config
 */

import { withTenant } from "@/app/api/middleware/withTenant";
import {
  listWebhookConfigs,
  createWebhookConfig,
} from "@/app/api/services/webhook.service";
import { apiResponse } from "@/app/api/utils/response";

const SUPPORTED_EVENTS = [
  "product.created",
  "product.updated",
  "product.deleted",
  "order.created",
  "order.updated",
  "order.fulfilled",
  "order.cancelled",
  "customer.created",
  "customer.updated",
];

export const GET = withTenant(async (_req, _ctx, tenant) => {
  const configs = await listWebhookConfigs({ storeId: tenant.storeId });
  return apiResponse.ok(configs);
});

export const POST = withTenant(async (request, _ctx, tenant) => {
  let body;
  try {
    body = await request.json();
  } catch {
    return apiResponse.badRequest("Request body must be valid JSON.");
  }

  const { targetUrl, eventType } = body;

  if (!targetUrl || typeof targetUrl !== "string") {
    return apiResponse.badRequest(
      "`targetUrl` is required and must be a string.",
    );
  }

  // Basic URL validation
  try {
    new URL(targetUrl);
  } catch {
    return apiResponse.badRequest("`targetUrl` must be a valid URL.");
  }

  if (!eventType || !SUPPORTED_EVENTS.includes(eventType)) {
    return apiResponse.badRequest(
      `\`eventType\` must be one of: ${SUPPORTED_EVENTS.join(", ")}.`,
    );
  }

  const config = await createWebhookConfig({
    storeId: tenant.storeId,
    targetUrl: targetUrl.trim(),
    eventType,
  });

  return apiResponse.created(config);
});
