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
