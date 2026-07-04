/**
 * Standardized API Response Factory
 * All API routes must use these helpers to ensure consistent response shapes.
 *
 * Success shape:  { success: true,  data: T,      meta?: M }
 * Error shape:    { success: false, error: string, code: string }
 */

const json = (body, status = 200) => Response.json(body, { status });

export const apiResponse = {
  // ─── 2xx ───────────────────────────────────────────────────
  ok(data, meta = undefined) {
    const body = { success: true, data };
    if (meta) body.meta = meta;
    return json(body, 200);
  },

  /** Alias for ok() — use when the intent is "here is data" not "action succeeded" */
  success(data, meta = undefined) {
    return apiResponse.ok(data, meta);
  },

  created(data) {
    return json({ success: true, data }, 201);
  },

  noContent() {
    return new Response(null, { status: 204 });
  },

  // ─── 4xx ───────────────────────────────────────────────────
  badRequest(message = "Bad request", details = undefined) {
    const body = { success: false, error: message, code: "BAD_REQUEST" };
    if (details) body.details = details;
    return json(body, 400);
  },

  unauthorized(message = "Authentication required") {
    return json({ success: false, error: message, code: "UNAUTHORIZED" }, 401);
  },

  forbidden(message = "You do not have permission to perform this action") {
    return json({ success: false, error: message, code: "FORBIDDEN" }, 403);
  },

  notFound(message = "Resource not found") {
    return json({ success: false, error: message, code: "NOT_FOUND" }, 404);
  },

  conflict(message = "Resource already exists") {
    return json({ success: false, error: message, code: "CONFLICT" }, 409);
  },

  // ─── 5xx ───────────────────────────────────────────────────
  internalError(message = "An unexpected error occurred") {
    return json(
      { success: false, error: message, code: "INTERNAL_ERROR" },
      500,
    );
  },
};
