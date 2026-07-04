/**
 * GET    /api/webhooks/:webhookId  — Fetch single config
 * PATCH  /api/webhooks/:webhookId  — Update config
 * DELETE /api/webhooks/:webhookId  — Delete config
 */

import { withTenant } from "@/app/api/middleware/withTenant";
import {
  updateWebhookConfig,
  deleteWebhookConfig,
  listWebhookConfigs,
} from "@/app/api/services/webhook.service";
import { apiResponse } from "@/app/api/utils/response";
import sql from "@/app/api/utils/sql";

export const GET = withTenant(async (_req, { params }, tenant) => {
  const { webhookId } = await params;

  const rows = await sql`
    SELECT id, store_id, target_url, event_type, is_active, created_at, updated_at
    FROM   webhook_configs
    WHERE  id       = ${webhookId}
      AND  store_id = ${tenant.storeId}
    LIMIT  1
  `;

  if (!rows[0]) return apiResponse.notFound("Webhook config not found.");
  return apiResponse.ok(rows[0]);
});

export const PATCH = withTenant(async (request, { params }, tenant) => {
  const { webhookId } = await params;

  let body;
  try {
    body = await request.json();
  } catch {
    return apiResponse.badRequest("Request body must be valid JSON.");
  }

  if (!body || Object.keys(body).length === 0) {
    return apiResponse.badRequest("Provide at least one field to update.");
  }

  // Validate URL if provided
  if (body.targetUrl) {
    try {
      new URL(body.targetUrl);
    } catch {
      return apiResponse.badRequest("`targetUrl` must be a valid URL.");
    }
  }

  const updated = await updateWebhookConfig({
    storeId: tenant.storeId,
    webhookId,
    updates: body,
  });

  if (!updated) return apiResponse.notFound("Webhook config not found.");
  return apiResponse.ok(updated);
});

export const DELETE = withTenant(async (_req, { params }, tenant) => {
  const { webhookId } = await params;
  const deleted = await deleteWebhookConfig({
    storeId: tenant.storeId,
    webhookId,
  });
  if (!deleted) return apiResponse.notFound("Webhook config not found.");
  return apiResponse.noContent();
});
