import { getRefreshHandler } from "@/lib/auth/refresh-registry";
import { tokenStorage } from "@/lib/auth/storage";
import { getApiBaseUrl } from "./config";
import { parseResponse } from "./http";

function joinUrl(path: string): string {
  const base = getApiBaseUrl();
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${base}${p}`;
}

/**
 * Authenticated GET with one automatic retry: 401 → refresh session → retry with new access token.
 */
export async function apiGet<T>(path: string, accessToken: string): Promise<T> {
  const attempt = (token: string) =>
    fetch(joinUrl(path), {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
    });

  let res = await attempt(accessToken);

  if (res.status === 401) {
    const refresh = getRefreshHandler();
    if (refresh) {
      const ok = await refresh();
      if (ok) {
        const next = tokenStorage.getAccessToken();
        if (next) {
          res = await attempt(next);
        }
      }
    }
  }

  return parseResponse<T>(res);
}

/**
 * Authenticated JSON POST with 401 → refresh → retry once.
 */
export async function apiPost<T>(
  path: string,
  accessToken: string,
  body: unknown,
): Promise<T> {
  const attempt = (token: string) =>
    fetch(joinUrl(path), {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(body),
    });

  let res = await attempt(accessToken);

  if (res.status === 401) {
    const refresh = getRefreshHandler();
    if (refresh) {
      const ok = await refresh();
      if (ok) {
        const next = tokenStorage.getAccessToken();
        if (next) {
          res = await attempt(next);
        }
      }
    }
  }

  return parseResponse<T>(res);
}

function postMultipartXhr(
  path: string,
  accessToken: string,
  formData: FormData,
  onProgress?: (percent: number) => void,
): Promise<Response> {
  const url = joinUrl(path);
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", url);
    xhr.setRequestHeader("Authorization", `Bearer ${accessToken}`);
    xhr.setRequestHeader("Accept", "application/json");
    xhr.responseType = "text";

    xhr.upload.onprogress = (ev) => {
      if (!onProgress) return;
      if (ev.lengthComputable && ev.total > 0) {
        onProgress(Math.min(100, Math.round((100 * ev.loaded) / ev.total)));
      }
    };

    xhr.onload = () => {
      const ct = xhr.getResponseHeader("Content-Type") || "application/json";
      resolve(
        new Response(xhr.responseText, {
          status: xhr.status,
          statusText: xhr.statusText,
          headers: { "Content-Type": ct },
        }),
      );
    };
    xhr.onerror = () => reject(new Error("Network error"));
    xhr.send(formData);
  });
}

/**
 * Authenticated multipart POST (e.g. file upload). Do not set Content-Type — the browser sets the boundary.
 * Optional `onUploadProgress` reports 0–100 while the request body is sent (XHR; use for large files).
 */
export async function apiPostMultipart<T>(
  path: string,
  accessToken: string,
  formData: FormData,
  onUploadProgress?: (percent: number) => void,
): Promise<T> {
  let res = await postMultipartXhr(path, accessToken, formData, onUploadProgress);

  if (res.status === 401) {
    const refresh = getRefreshHandler();
    if (refresh) {
      const ok = await refresh();
      if (ok) {
        const next = tokenStorage.getAccessToken();
        if (next) {
          res = await postMultipartXhr(path, next, formData, onUploadProgress);
        }
      }
    }
  }

  return parseResponse<T>(res);
}

/**
 * Authenticated JSON PATCH with 401 -> refresh -> retry once.
 */
export async function apiPatch<T>(
  path: string,
  accessToken: string,
  body: unknown,
): Promise<T> {
  const attempt = (token: string) =>
    fetch(joinUrl(path), {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(body),
    });

  let res = await attempt(accessToken);

  if (res.status === 401) {
    const refresh = getRefreshHandler();
    if (refresh) {
      const ok = await refresh();
      if (ok) {
        const next = tokenStorage.getAccessToken();
        if (next) {
          res = await attempt(next);
        }
      }
    }
  }

  return parseResponse<T>(res);
}
