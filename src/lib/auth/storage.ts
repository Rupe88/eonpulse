/**
 * Session-only persistence (tab close clears). Use same keys everywhere.
 */
const ACCESS = "eonpulse_access_token";
const REFRESH = "eonpulse_refresh_token";

export const tokenStorage = {
  getAccessToken(): string | null {
    if (typeof window === "undefined") return null;
    return sessionStorage.getItem(ACCESS);
  },
  getRefreshToken(): string | null {
    if (typeof window === "undefined") return null;
    return sessionStorage.getItem(REFRESH);
  },
  setTokens(pair: { accessToken: string; refreshToken: string }): void {
    sessionStorage.setItem(ACCESS, pair.accessToken);
    sessionStorage.setItem(REFRESH, pair.refreshToken);
  },
  clear(): void {
    sessionStorage.removeItem(ACCESS);
    sessionStorage.removeItem(REFRESH);
  },
};
