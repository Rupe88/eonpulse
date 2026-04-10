/**
 * Nest API base URL (no trailing slash).
 * Supports both direct hosts and path-based proxies.
 * Example values:
 * - NEXT_PUBLIC_API_URL=http://localhost:4000
 * - NEXT_PUBLIC_API_URL=http://64.227.182.187/pm-api
 */
export function getApiBaseUrl(): string {
  const raw =
    process.env.NEXT_PUBLIC_API_URL?.trim() || "http://localhost:4000";
  return raw.replace(/\/$/, "");
}

export function authUrl(path: string): string {
  const base = getApiBaseUrl();
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${base}${p}`;
}
