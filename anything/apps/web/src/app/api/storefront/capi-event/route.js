/**
 * POST /api/storefront/capi-event
 *
 * Server-side CAPI relay (Task 2C / Stape.io compatible).
 *
 * Receives a client-side analytics event and forwards it through the
 * webhook engine so it reaches configured CAPI endpoints (Stape.io, Meta,
 * Google Enhanced Conversions, etc.) with server-side user data enrichment.
 *
 * Stape.io setup (Task 2D):
 *   1. Create a Server GTM container on Stape.io
 *   2. Add a "Custom Event" tag in Server GTM pointing to Facebook / Google CAPI APIs
 *   3. Configure a webhook integration in this platform pointing to:
 *      https://your-stape-container.stape.io/event?event_name=purchase
 *   4. Map payload fields: event_id, value, currency, order_id → CAPI fields
 *
 * The webhook engine handles delivery, retry, and HMAC signing automatically.
 */

import sql from "@/app/api/utils/sql";
import { triggerEvent } from "@/app/api/services/webhook.service";
import { apiResponse } from "@/app/api/utils/response";

export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return apiResponse.badRequest("Invalid JSON.");
  }

  const { storeSlug, eventName, params = {}, eventId } = body ?? {};
  if (!storeSlug || !eventName)
    return apiResponse.badRequest("storeSlug and eventName are required.");

  // Resolve store
  const stores =
    await sql`SELECT id FROM stores WHERE slug = ${storeSlug} AND is_active = true LIMIT 1`;
  if (!stores[0]) return apiResponse.notFound("Store not found.");

  const storeId = stores[0].id;

  // Enrich with server-side data
  const ua = request.headers.get("user-agent") ?? "";
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
    request.headers.get("x-real-ip") ??
    "unknown";

  const payload = {
    event_name: eventName,
    event_id: eventId, // deduplication key
    event_time: Math.floor(Date.now() / 1000),
    source: "server",
    user_agent: ua,
    client_ip: ip,
    ...params,
    // Structured for Stape.io / Meta CAPI
    capi: {
      event_name: eventName === "purchase" ? "Purchase" : eventName,
      event_id: eventId,
      event_time: Math.floor(Date.now() / 1000),
      event_source_url: params.source_url ?? "",
      user_data: {
        client_ip_address: ip,
        client_user_agent: ua,
        em: params.email ? [params.email] : undefined,
        ph: params.phone ? [params.phone] : undefined,
      },
      custom_data: {
        currency: params.currency ?? "BDT",
        value: params.value,
        order_id: params.transaction_id ?? params.order_id,
        num_items: params.num_items,
        content_ids: (params.items ?? []).map((i) => i.item_id),
      },
    },
  };

  // Fire via webhook engine (non-blocking — uses the store's configured webhooks)
  const webhookEventName = `capi.${eventName}`;
  triggerEvent({ storeId, eventType: webhookEventName, payload }).catch(
    console.error,
  );

  return apiResponse.ok({ queued: true, eventId });
}
