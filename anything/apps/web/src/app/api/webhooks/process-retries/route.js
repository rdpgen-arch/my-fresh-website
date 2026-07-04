/**
 * POST /api/webhooks/process-retries  — Retry processor (cron endpoint)
 *
 * Called by an external cron service (e.g. cron-job.org) every 60 seconds.
 * Finds all overdue `webhook_deliveries` rows and re-dispatches them.
 *
 * ── Setup instructions ───────────────────────────────────────────────────────
 *  1. Set CRON_SECRET in your environment variables (any long random string).
 *  2. Configure cron-job.org (free tier) to POST to:
 *       https://<your-domain>/api/webhooks/process-retries
 *     with header:  X-Cron-Secret: <your CRON_SECRET value>
 *     every 1 minute.
 *
 * ── Behavior ─────────────────────────────────────────────────────────────────
 *  - Processes up to 20 overdue deliveries per invocation (safe batch size).
 *  - Each delivery is dispatched sequentially to control memory usage.
 *  - Returns a summary of { processed, succeeded, failed } for monitoring.
 */

import { processRetries } from "@/app/api/services/webhook.service";

export async function POST(request) {
  // ── Cron secret guard ──────────────────────────────────────────────────────
  const cronSecret = process.env.CRON_SECRET ?? "";
  const provided = request.headers.get("x-cron-secret") ?? "";

  // If no cron secret is configured, deny all requests as a safety default
  if (!cronSecret) {
    console.error(
      "[process-retries] CRON_SECRET is not configured. Denying request.",
    );
    return Response.json(
      { error: "Cron secret not configured on server." },
      { status: 500 },
    );
  }

  if (provided !== cronSecret) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  // ── Run retry batch ────────────────────────────────────────────────────────
  try {
    const result = await processRetries(20);
    console.info("[process-retries] Batch complete:", result);
    return Response.json({ ok: true, ...result }, { status: 200 });
  } catch (err) {
    console.error("[process-retries] Fatal error:", err);
    return Response.json(
      { error: "Retry processing failed." },
      { status: 500 },
    );
  }
}

// GET for quick health check (no auth — returns nothing sensitive)
export async function GET() {
  return Response.json({ status: "Webhook retry processor is online." });
}
