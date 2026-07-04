/**
 * GET /api/health
 *
 * Lightweight health check for:
 *  - UptimeRobot / Betterstack monitoring
 *  - Docker HEALTHCHECK
 *  - Load balancer probes
 *
 * Returns 200 when the server is up and can reach the database.
 * Returns 503 if the DB is unreachable.
 */

import sql from "@/app/api/utils/sql";

export const dynamic = "force-dynamic";

export async function GET() {
  const start = Date.now();
  let dbOk = false;
  let dbMs = null;
  let dbError = null;

  try {
    const t = Date.now();
    await sql`SELECT 1`;
    dbMs = Date.now() - t;
    dbOk = true;
  } catch (err) {
    dbError = err?.message ?? "Database unreachable";
  }

  const totalMs = Date.now() - start;
  const status = dbOk ? "healthy" : "degraded";

  return Response.json(
    {
      status,
      uptime: process.uptime?.() ?? null,
      db: { ok: dbOk, ms: dbMs, error: dbError },
      totalMs,
      ts: new Date().toISOString(),
      version: process.env.npm_package_version ?? "unknown",
      env: process.env.NODE_ENV,
    },
    { status: dbOk ? 200 : 503 },
  );
}
