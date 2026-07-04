/**
 * Structured Logger
 *
 * Attaches a request ID to every log entry so you can trace a single
 * request across multiple log lines in production log aggregators.
 *
 * Usage:
 *   import { createLogger } from "@/app/api/utils/logger";
 *   const log = createLogger(request);
 *   log.info("Order created", { orderId, storeId });
 *   log.warn("Slow query", { ms: 450 });
 *   log.error("Payment failed", { error: err.message });
 *
 * In production, replace console.* with your log provider (Axiom, Logtail, etc.)
 */

import { randomUUID } from "crypto";

const IS_PROD = process.env.NODE_ENV === "production";

/**
 * Extracts or generates a request ID.
 * Checks X-Request-ID header first (set by upstream proxy), then generates.
 */
function getRequestId(request) {
  if (!request) return randomUUID().split("-")[0]; // 8-char short ID
  return (
    request.headers?.get?.("x-request-id") ??
    request.headers?.["x-request-id"] ??
    randomUUID().split("-")[0]
  );
}

/**
 * Creates a contextual logger bound to a specific request.
 * @param {Request|null} request
 * @param {object} [baseContext] - Additional context added to every log entry.
 */
export function createLogger(request = null, baseContext = {}) {
  const requestId = getRequestId(request);
  const path = request?.url
    ? (() => {
        try {
          return new URL(request.url).pathname;
        } catch {
          return "unknown";
        }
      })()
    : "internal";

  const base = { requestId, path, ...baseContext };

  function log(level, message, extra = {}) {
    const entry = {
      ...base,
      level,
      message,
      ts: new Date().toISOString(),
      ...extra,
    };

    if (IS_PROD) {
      // In production emit JSON for log aggregators
      // Replace this with: await logProvider.send(entry)
      console[level === "error" ? "error" : level === "warn" ? "warn" : "log"](
        JSON.stringify(entry),
      );
    } else {
      // Dev: readable format with colour
      const prefix = `[${entry.ts.slice(11, 23)}] [${requestId}] [${level.toUpperCase()}]`;
      const extraStr = Object.keys(extra).length
        ? " " + JSON.stringify(extra)
        : "";
      console[level === "error" ? "error" : level === "warn" ? "warn" : "log"](
        `${prefix} ${path} — ${message}${extraStr}`,
      );
    }
  }

  return {
    requestId,
    info: (msg, extra) => log("info", msg, extra),
    warn: (msg, extra) => log("warn", msg, extra),
    error: (msg, extra) => log("error", msg, extra),
    debug: (msg, extra) => {
      if (!IS_PROD) log("debug", msg, extra);
    },
    /** Wrap an async route handler to auto-log timing + errors */
    wrap(handler) {
      return async (...args) => {
        const start = Date.now();
        try {
          const result = await handler(...args);
          log("info", "Request completed", {
            ms: Date.now() - start,
            status: result?.status,
          });
          return result;
        } catch (err) {
          log("error", "Unhandled exception", {
            ms: Date.now() - start,
            error: err?.message,
            stack: err?.stack?.slice(0, 300),
          });
          throw err;
        }
      };
    },
  };
}

/**
 * Convenience function for logging outside of a request context.
 */
export const logger = createLogger(null, { context: "global" });
