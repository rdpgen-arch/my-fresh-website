/**
 * Webhook Service
 *
 * The complete lifecycle engine for webhook event dispatch:
 *
 *   triggerEvent()     — Entry point. Called by any product/order/etc. route
 *                        after a state change. Finds matching configs and
 *                        fires the dispatcher asynchronously.
 *
 *   signPayload()      — Produces an HMAC-SHA256 hex signature from the
 *                        raw JSON string and the tenant's secret_token.
 *
 *   dispatchOne()      — Makes a single HTTP POST attempt, signs it,
 *                        logs the result, and updates delivery state.
 *
 *   processRetries()   — Called by the /api/webhooks/process-retries route
 *                        (hit by a cron or any request acting as a heartbeat).
 *                        Finds overdue deliveries and re-dispatches them.
 *
 * ── Async / Serverless Strategy ─────────────────────────────────────────────
 *
 *  Serverless functions have tight execution windows (~10-30 s). We must
 *  never block the user-facing API response waiting for an external HTTP call.
 *
 *  Strategy: "Fire-and-Forget Internal Route"
 *
 *  1. The product/order route calls `triggerEvent()`, which:
 *     a. Creates a `webhook_deliveries` row (status = 'pending').
 *     b. Calls the internal `/api/webhooks/dispatch` route via a non-awaited
 *        `fetch()` using `{ signal: AbortSignal.timeout(1000) }`. This makes
 *        the network hop but does NOT wait for a response.
 *     c. Returns immediately — the user-facing response is sent.
 *
 *  2. The `/api/webhooks/dispatch` route runs in its own serverless invocation,
 *     fully isolated from the original request. It has its own time budget.
 *
 *  3. Retries are handled by a separate `/api/webhooks/process-retries` route
 *     that a lightweight cron (e.g., cron-job.org hitting a public URL) calls
 *     every minute. No paid queue infrastructure required.
 *
 * ── Retry Schedule (Exponential Backoff) ────────────────────────────────────
 *
 *  Attempt │ Delay before next attempt
 *  ────────┼──────────────────────────
 *    1     │ (immediate — fired on creation)
 *    2     │   5 minutes
 *    3     │  30 minutes
 *    4     │   2 hours
 *    5     │   8 hours
 *  > 5     │  PERMANENT FAILURE — status → 'failed', next_retry_at = NULL
 *
 *  On permanent failure the delivery row is preserved for audit purposes.
 *  Operators can inspect the last_error + logs and manually re-trigger if needed.
 */

import sql from "@/app/api/utils/sql";

// ─── Constants ────────────────────────────────────────────────────────────────

const MAX_ATTEMPTS = 5;

/**
 * Exponential backoff delays in seconds, indexed by attempt number (1-based).
 * attempt_count is the number of attempts ALREADY made when scheduling the next.
 * e.g. after 1st failure (attempt_count = 1) → wait 300 s (5 min).
 */
const BACKOFF_SECONDS = {
  1: 5 * 60, //  5 minutes
  2: 30 * 60, // 30 minutes
  3: 2 * 60 * 60, //  2 hours
  4: 8 * 60 * 60, //  8 hours
};

// ─── Cryptographic Signing ────────────────────────────────────────────────────

/**
 * Produces an HMAC-SHA256 hex-encoded signature.
 *
 * The signature is computed over the raw JSON string of the payload,
 * ensuring the recipient can verify integrity by re-computing the same
 * HMAC against the raw request body with their known secret.
 *
 * @param {string} secret      - The webhook config's `secret_token`.
 * @param {string} rawPayload  - The serialized JSON string that will be sent.
 * @returns {Promise<string>}  - Lowercase hex signature, e.g. "a3f9c2..."
 */
export async function signPayload(secret, rawPayload) {
  const enc = new TextEncoder();
  const keyData = enc.encode(secret);
  const msgData = enc.encode(rawPayload);

  const key = await crypto.subtle.importKey(
    "raw",
    keyData,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );

  const sigBuffer = await crypto.subtle.sign("HMAC", key, msgData);
  const sigBytes = Array.from(new Uint8Array(sigBuffer));
  return sigBytes.map((b) => b.toString(16).padStart(2, "0")).join("");
}

// ─── Internal Dispatch Utilities ─────────────────────────────────────────────

/**
 * Calculates the timestamp for the next retry attempt.
 *
 * @param {number} attemptCount - The number of attempts already made.
 * @returns {Date|null} - The Date to retry at, or null if max attempts exceeded.
 */
function getNextRetryAt(attemptCount) {
  const delaySec = BACKOFF_SECONDS[attemptCount];
  if (!delaySec) return null; // Exceeded backoff table → permanent failure
  return new Date(Date.now() + delaySec * 1000);
}

/**
 * Logs a single HTTP attempt to `webhook_logs`.
 *
 * @param {object} p
 */
async function logAttempt({
  webhookId,
  storeId,
  eventType,
  payload,
  responseStatus,
  responseBody,
  errorMessage,
}) {
  await sql`
    INSERT INTO webhook_logs (
      webhook_id, store_id, event_type, payload,
      response_status, response_body, error_message, attempted_at
    ) VALUES (
      ${webhookId},
      ${storeId},
      ${eventType},
      ${JSON.stringify(payload)},
      ${responseStatus ?? null},
      ${responseBody ?? null},
      ${errorMessage ?? null},
      NOW()
    )
  `;
}

// ─── Core Dispatcher ─────────────────────────────────────────────────────────

/**
 * Makes one HTTP POST attempt to the webhook's target URL.
 * Signs the payload, dispatches, logs the result, and advances
 * the delivery state machine.
 *
 * @param {string} deliveryId - The `webhook_deliveries.id` to process.
 * @returns {Promise<{ success: boolean }>}
 */
export async function dispatchOne(deliveryId) {
  // ── Fetch delivery + config atomically ─────────────────────────────────────
  const rows = await sql`
    SELECT
      d.id               AS delivery_id,
      d.webhook_id,
      d.store_id,
      d.event_type,
      d.payload,
      d.attempt_count,
      d.max_attempts,
      d.status,
      wc.target_url,
      wc.secret_token,
      wc.is_active       AS webhook_active
    FROM  webhook_deliveries d
    JOIN  webhook_configs wc ON wc.id = d.webhook_id
    WHERE d.id = ${deliveryId}
    LIMIT 1
  `;

  const delivery = rows[0];

  if (!delivery) {
    console.error(`[dispatchOne] Delivery ${deliveryId} not found.`);
    return { success: false };
  }

  // Skip if the webhook config was deactivated since this delivery was queued
  if (!delivery.webhook_active) {
    await sql`
      UPDATE webhook_deliveries
      SET    status = 'failed', last_error = 'Webhook config was deactivated.', updated_at = NOW()
      WHERE  id = ${deliveryId}
    `;
    return { success: false };
  }

  // ── Increment attempt counter ───────────────────────────────────────────────
  const attemptNumber = delivery.attempt_count + 1;

  await sql`
    UPDATE webhook_deliveries
    SET    attempt_count = ${attemptNumber},
           status        = 'retrying',
           updated_at    = NOW()
    WHERE  id = ${deliveryId}
  `;

  // ── Build and sign the payload ──────────────────────────────────────────────
  const envelope = {
    id: deliveryId,
    event: delivery.event_type,
    store_id: delivery.store_id,
    attempt: attemptNumber,
    created_at: new Date().toISOString(),
    data: delivery.payload,
  };

  const rawBody = JSON.stringify(envelope);
  const signature = await signPayload(delivery.secret_token, rawBody);

  // ── Make the HTTP call ──────────────────────────────────────────────────────
  let responseStatus = null;
  let responseBody = null;
  let errorMessage = null;
  let success = false;

  try {
    const res = await fetch(delivery.target_url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Webhook-Event": delivery.event_type,
        "X-Webhook-Delivery": deliveryId,
        "X-Signature": `sha256=${signature}`, // HMAC-SHA256 hex, prefixed for clarity
        "X-Timestamp": String(Math.floor(Date.now() / 1000)),
      },
      body: rawBody,
      signal: AbortSignal.timeout(10_000), // 10-second hard timeout per attempt
    });

    responseStatus = res.status;
    // Read up to 4 KB of response body for logging — avoid memory issues on huge responses
    const rawText = await res.text();
    responseBody = rawText.slice(0, 4096);
    success = res.ok; // 2xx = success
  } catch (err) {
    errorMessage = err?.message ?? "Unknown network error";
    success = false;
  }

  // ── Log the attempt ─────────────────────────────────────────────────────────
  await logAttempt({
    webhookId: delivery.webhook_id,
    storeId: delivery.store_id,
    eventType: delivery.event_type,
    payload: envelope,
    responseStatus,
    responseBody,
    errorMessage,
  });

  // ── Advance delivery state machine ──────────────────────────────────────────
  if (success) {
    await sql`
      UPDATE webhook_deliveries
      SET    status        = 'delivered',
             next_retry_at = NULL,
             last_error    = NULL,
             updated_at    = NOW()
      WHERE  id = ${deliveryId}
    `;
  } else {
    const nextRetryAt = getNextRetryAt(attemptNumber);
    const terminalFail = !nextRetryAt || attemptNumber >= delivery.max_attempts;
    const errorSummary =
      errorMessage ??
      `HTTP ${responseStatus}: ${(responseBody ?? "").slice(0, 200)}`;

    await sql`
      UPDATE webhook_deliveries
      SET    status        = ${terminalFail ? "failed" : "retrying"},
             next_retry_at = ${terminalFail ? null : nextRetryAt?.toISOString()},
             last_error    = ${errorSummary},
             updated_at    = NOW()
      WHERE  id = ${deliveryId}
    `;

    if (terminalFail) {
      console.warn(
        `[dispatchOne] Delivery ${deliveryId} permanently failed after ${attemptNumber} attempts.`,
      );
    }
  }

  return { success };
}

// ─── Event Trigger (Public Entry Point) ──────────────────────────────────────

/**
 * Called by product, order, or any other domain service after a state change.
 * Finds all active webhooks matching the event type for the tenant,
 * creates delivery rows, and fires the dispatcher without blocking.
 *
 * @param {object} opts
 * @param {string} opts.storeId    - Tenant boundary.
 * @param {string} opts.eventType  - e.g. "product.created", "order.placed"
 * @param {object} opts.payload    - The event-specific data object.
 */
export async function triggerEvent({ storeId, eventType, payload }) {
  if (!storeId) throw new Error("[triggerEvent] storeId is required.");
  if (!eventType) throw new Error("[triggerEvent] eventType is required.");

  // Fetch all active, matching webhook configs for this tenant
  const configs = await sql`
    SELECT id, secret_token
    FROM   webhook_configs
    WHERE  store_id   = ${storeId}
      AND  event_type = ${eventType}
      AND  is_active  = TRUE
  `;

  if (configs.length === 0) return; // No subscribers — nothing to do

  // Create a delivery record for each matching webhook
  const deliveryInserts = configs.map(
    (config) =>
      sql`
      INSERT INTO webhook_deliveries (webhook_id, store_id, event_type, payload, status, next_retry_at)
      VALUES (${config.id}, ${storeId}, ${eventType}, ${JSON.stringify(payload)}, 'pending', NOW())
      RETURNING id
    `,
  );

  const deliveryResults = await Promise.all(deliveryInserts);
  const deliveryIds = deliveryResults.map((r) => r[0]?.id).filter(Boolean);

  // Fire-and-forget: POST to the internal dispatch route without awaiting.
  // This returns the user-facing API response IMMEDIATELY.
  // The dispatch route runs in its own serverless invocation with its own time budget.
  const appUrl =
    process.env.NEXT_PUBLIC_CREATE_APP_URL ?? "http://localhost:3000";
  const dispatchSecret = process.env.AUTH_SECRET ?? "";

  for (const id of deliveryIds) {
    // AbortSignal.timeout(1000): we only wait 1s for the internal route to acknowledge.
    // We don't care about its response — just that the invocation was triggered.
    fetch(`${appUrl}/api/webhooks/dispatch`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Internal-Key": dispatchSecret, // Prevent public invocation of internal route
      },
      body: JSON.stringify({ deliveryId: id }),
      signal: AbortSignal.timeout(1_000),
    }).catch(() => {
      // Silently swallow — the retry processor will pick this up if it never fired
    });
  }
}

// ─── Retry Processor ─────────────────────────────────────────────────────────

/**
 * Processes all overdue deliveries. Called by the cron endpoint.
 * Fetches all rows in 'pending' or 'retrying' state where next_retry_at <= NOW()
 * and dispatches each one sequentially (to stay within serverless time limits).
 *
 * @param {number} [batchSize=20] - Max deliveries to process per invocation.
 * @returns {Promise<{ processed: number, succeeded: number, failed: number }>}
 */
export async function processRetries(batchSize = 20) {
  const overdue = await sql`
    SELECT id
    FROM   webhook_deliveries
    WHERE  status IN ('pending', 'retrying')
      AND  next_retry_at <= NOW()
    ORDER  BY next_retry_at ASC
    LIMIT  ${batchSize}
  `;

  let succeeded = 0;
  let failed = 0;

  for (const row of overdue) {
    const { success } = await dispatchOne(row.id);
    success ? succeeded++ : failed++;
  }

  return { processed: overdue.length, succeeded, failed };
}

// ─── Webhook Config CRUD ──────────────────────────────────────────────────────

export async function listWebhookConfigs({ storeId }) {
  if (!storeId) throw new Error("[listWebhookConfigs] storeId is required.");
  return sql`
    SELECT id, store_id, target_url, event_type, is_active, created_at, updated_at
    FROM   webhook_configs
    WHERE  store_id = ${storeId}
    ORDER  BY created_at DESC
  `;
}

export async function createWebhookConfig({ storeId, targetUrl, eventType }) {
  if (!storeId) throw new Error("[createWebhookConfig] storeId is required.");
  // Generate a cryptographically random secret for the tenant
  const secretBytes = crypto.getRandomValues(new Uint8Array(32));
  const secretToken = Array.from(secretBytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  const rows = await sql`
    INSERT INTO webhook_configs (store_id, target_url, event_type, secret_token)
    VALUES (${storeId}, ${targetUrl}, ${eventType}, ${secretToken})
    RETURNING id, store_id, target_url, event_type, secret_token, is_active, created_at
  `;
  return rows[0];
}

export async function updateWebhookConfig({ storeId, webhookId, updates }) {
  if (!storeId) throw new Error("[updateWebhookConfig] storeId is required.");
  const { targetUrl, eventType, isActive } = updates;
  const rows = await sql`
    UPDATE webhook_configs
    SET
      target_url = COALESCE(${targetUrl ?? null}, target_url),
      event_type = COALESCE(${eventType ?? null}, event_type),
      is_active  = COALESCE(${isActive ?? null}, is_active),
      updated_at = NOW()
    WHERE id       = ${webhookId}
      AND store_id = ${storeId}
    RETURNING id, store_id, target_url, event_type, is_active, updated_at
  `;
  return rows[0] ?? null;
}

export async function deleteWebhookConfig({ storeId, webhookId }) {
  if (!storeId) throw new Error("[deleteWebhookConfig] storeId is required.");
  const rows = await sql`
    DELETE FROM webhook_configs
    WHERE  id       = ${webhookId}
      AND  store_id = ${storeId}
    RETURNING id
  `;
  return rows.length > 0;
}

// ─── Log Queries ──────────────────────────────────────────────────────────────

export async function listDeliveryLogs({
  storeId,
  webhookId,
  status,
  page = 1,
  limit = 50,
}) {
  if (!storeId) throw new Error("[listDeliveryLogs] storeId is required.");

  const safeLimit = Math.min(Number(limit) || 50, 200);
  const safeOffset = (Math.max(Number(page) || 1, 1) - 1) * safeLimit;

  const conditions = ["d.store_id = $1"];
  const params = [storeId];
  let idx = 2;

  if (webhookId) {
    conditions.push(`d.webhook_id = $${idx++}`);
    params.push(webhookId);
  }
  if (status) {
    conditions.push(`d.status     = $${idx++}`);
    params.push(status);
  }

  const where = conditions.join(" AND ");

  const [deliveries, [{ total }]] = await sql.transaction([
    sql(
      `
      SELECT
        d.id, d.webhook_id, d.event_type, d.status,
        d.attempt_count, d.last_error, d.created_at, d.updated_at,
        wc.target_url
      FROM  webhook_deliveries d
      JOIN  webhook_configs wc ON wc.id = d.webhook_id
      WHERE ${where}
      ORDER BY d.created_at DESC
      LIMIT $${idx} OFFSET $${idx + 1}
    `,
      [...params, safeLimit, safeOffset],
    ),
    sql(
      `SELECT COUNT(*) AS total FROM webhook_deliveries d WHERE ${where}`,
      params,
    ),
  ]);

  return {
    deliveries,
    total: Number(total),
    page: Number(page),
    limit: safeLimit,
  };
}

export async function listAttemptLogs({ storeId, webhookId, limit = 100 }) {
  if (!storeId) throw new Error("[listAttemptLogs] storeId is required.");

  const conditions = ["store_id = $1"];
  const params = [storeId];
  let idx = 2;

  if (webhookId) {
    conditions.push(`webhook_id = $${idx++}`);
    params.push(webhookId);
  }

  return sql(
    `SELECT id, webhook_id, event_type, payload, response_status, response_body, error_message, attempted_at
     FROM   webhook_logs
     WHERE  ${conditions.join(" AND ")}
     ORDER  BY attempted_at DESC
     LIMIT  $${idx}`,
    [...params, Math.min(Number(limit) || 100, 500)],
  );
}
