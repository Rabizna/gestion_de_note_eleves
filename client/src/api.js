// client/src/api.js
export const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:4000";

export async function api(path, opts = {}) {
  const isAbsolute = /^https?:\/\//i.test(path);
  const url = isAbsolute ? path : `${BASE_URL}${path}`;

  const headers = new Headers(opts.headers || {});
  const body = opts.body;

  const isFormData = typeof FormData !== "undefined" && body instanceof FormData;
  const isBlob = typeof Blob !== "undefined" && body instanceof Blob;

  let finalBody = body;

  if (isFormData || isBlob) {
    // ne pas définir Content-Type
  } else if (body && typeof body === "object") {
    finalBody = JSON.stringify(body);
    if (!headers.has("Content-Type")) {
      headers.set("Content-Type", "application/json");
    }
  } else if (typeof body === "string") {
    if (!headers.has("Content-Type")) {
      headers.set("Content-Type", "application/json");
    }
  }

  const res = await fetch(url, {
    method: opts.method || "GET",
    credentials: "include",
    headers,
    body: finalBody,
  });

  const ct = res.headers.get("content-type") || "";
  let data = null;
  try {
    data = ct.includes("application/json") ? await res.json() : await res.text();
  } catch {}

  if (!res.ok) {
    const msg =
      (data && (data.message || data.error)) ||
      (typeof data === "string" && data) ||
      `Erreur API ${res.status}`;
    const err = new Error(msg);
    err.status = res.status;
    throw err;
  }
  return data ?? {};
}
