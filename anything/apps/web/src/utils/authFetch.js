/**
 * authFetch — authenticated fetch wrapper
 *
 * Fix 1A: eliminates the localStorage/cookie disconnect.
 *
 * JWT now lives exclusively in an HttpOnly cookie set by the login route.
 * Every admin API call must use this wrapper instead of manually reading
 * localStorage("admin_token") and injecting Authorization headers.
 *
 * The browser automatically sends the cookie on same-origin requests when
 * `credentials: "include"` is set — no JavaScript can read the token value.
 *
 * Usage:
 *   import { authFetch, authJson } from "@/utils/authFetch";
 *
 *   // Raw fetch (returns Response)
 *   const res = await authFetch("/api/admin/stats");
 *
 *   // JSON shorthand (throws on !res.ok, returns parsed data)
 *   const data = await authJson("/api/orders?page=1");
 *   const result = await authJson("/api/orders", { method: "POST", body: payload });
 */

const DEFAULT_OPTS = {
  credentials: "include", // sends HttpOnly cookie automatically
  headers: { "Content-Type": "application/json" },
};

/**
 * Drop-in replacement for fetch() that always includes auth credentials.
 * Merges caller options so you can still pass method, body, custom headers.
 */
export async function authFetch(url, opts = {}) {
  const { headers: extraHeaders = {}, ...rest } = opts;
  return fetch(url, {
    ...DEFAULT_OPTS,
    ...rest,
    headers: {
      ...DEFAULT_OPTS.headers,
      ...extraHeaders,
    },
  });
}

/**
 * Convenience helper: sends an authenticated request and parses JSON.
 * Throws a typed error if the response is not 2xx.
 *
 * @param {string}  url
 * @param {object}  [opts]         - Same options as fetch(). body can be object (auto-stringified).
 * @returns {Promise<any>}          The `data` field of { success, data } responses.
 */
export async function authJson(url, opts = {}) {
  const { body, ...rest } = opts;
  const res = await authFetch(url, {
    ...rest,
    ...(body !== undefined
      ? { body: typeof body === "string" ? body : JSON.stringify(body) }
      : {}),
  });

  let json;
  try {
    json = await res.json();
  } catch {
    throw new AuthFetchError(`Non-JSON response from ${url}`, res.status, null);
  }

  if (!res.ok) {
    throw new AuthFetchError(
      json?.error ?? `Request failed with status ${res.status}`,
      res.status,
      json,
    );
  }

  // Return the data payload directly for convenience
  return json?.data ?? json;
}

/**
 * Typed error class so callers can distinguish auth errors from network errors.
 */
export class AuthFetchError extends Error {
  constructor(message, status, body) {
    super(message);
    this.name = "AuthFetchError";
    this.status = status;
    this.body = body;
  }

  get isUnauthorized() {
    return this.status === 401;
  }
  get isForbidden() {
    return this.status === 403;
  }
  get isNotFound() {
    return this.status === 404;
  }
}

/**
 * React Query default queryFn factory.
 * Plug this into QueryClient defaultOptions for zero-boilerplate admin queries.
 *
 * Example:
 *   const queryClient = new QueryClient({
 *     defaultOptions: { queries: { queryFn: authQueryFn } }
 *   });
 *   // Then in components:
 *   useQuery({ queryKey: ["/api/admin/stats"] });
 */
export function authQueryFn({ queryKey }) {
  const [url, params] = queryKey;
  const fullUrl = params ? `${url}?${new URLSearchParams(params)}` : url;
  return authJson(fullUrl);
}
