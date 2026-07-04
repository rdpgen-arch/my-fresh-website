/**
 * Authenticated API client for the mobile app.
 * All requests are automatically scoped to the logged-in merchant's store
 * via the JWT stored in SecureStore.
 */
import { useAuthStore } from "./auth/store";

const getBaseUrl = () => {
  return process.env.EXPO_PUBLIC_BASE_URL || "";
};

export const getAuthHeaders = () => {
  const auth = useAuthStore.getState().auth;
  if (!auth?.jwt) return {};
  return { Authorization: `Bearer ${auth.jwt}` };
};

const request = async (path, options = {}) => {
  const url = `${getBaseUrl()}${path}`;
  const headers = {
    "Content-Type": "application/json",
    ...getAuthHeaders(),
    ...(options.headers || {}),
  };

  const res = await fetch(url, { ...options, headers });

  if (!res.ok) {
    let errorMsg = `HTTP ${res.status}`;
    try {
      const body = await res.json();
      errorMsg = body?.error || body?.message || errorMsg;
    } catch (_) {}
    const err = new Error(errorMsg);
    err.status = res.status;
    throw err;
  }

  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch (_) {
    return text;
  }
};

export const api = {
  get: (path, params) => {
    const qs = params ? "?" + new URLSearchParams(params).toString() : "";
    return request(`${path}${qs}`);
  },
  post: (path, body) =>
    request(path, { method: "POST", body: JSON.stringify(body) }),
  patch: (path, body) =>
    request(path, { method: "PATCH", body: JSON.stringify(body) }),
  delete: (path) => request(path, { method: "DELETE" }),
};

/**
 * Upload an image to Uploadcare and return the CDN URL.
 * Uses the public key from env — no server round-trip needed.
 */
export const uploadImageToUploadcare = async (uri) => {
  const publicKey = process.env.EXPO_PUBLIC_UPLOADCARE_PUBLIC_KEY;
  if (!publicKey) throw new Error("Uploadcare public key not set");

  const formData = new FormData();
  const filename = uri.split("/").pop() || "photo.jpg";
  const match = /\.(\w+)$/.exec(filename);
  const type = match ? `image/${match[1].toLowerCase()}` : "image/jpeg";

  formData.append("file", { uri, name: filename, type });
  formData.append("UPLOADCARE_PUB_KEY", publicKey);
  formData.append("UPLOADCARE_STORE", "1");

  const res = await fetch("https://upload.uploadcare.com/base/", {
    method: "POST",
    body: formData,
    headers: { Accept: "application/json" },
  });

  if (!res.ok) throw new Error("Upload failed");
  const data = await res.json();
  return `https://ucarecdn.com/${data.file}/`;
};
