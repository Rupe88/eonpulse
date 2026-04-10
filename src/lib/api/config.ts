/**
 * Nest API base URL (no trailing slash).
 * Use same-origin proxy in production to avoid mixed-content/CORS issues.
 * Example values:
 * - NEXT_PUBLIC_API_URL=/api/backend
 * - NEXT_PUBLIC_API_URL=http://localhost:4000
 */
export function getApiBaseUrl(): string {
  const raw = process.env.NEXT_PUBLIC_API_URL?.trim() || "/api/backend";
  return raw.replace(/\/$/, "");
}

export function authUrl(path: string): string {
  const base = getApiBaseUrl();
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${base}${p}`;
}
