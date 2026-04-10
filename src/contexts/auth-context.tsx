"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import * as authApi from "@/lib/api/auth";
import type { AuthUser } from "@/lib/api/auth.types";
import { getJwtExp } from "@/lib/auth/jwt-decode";
import { registerRefreshHandler } from "@/lib/auth/refresh-registry";
import { tokenStorage } from "@/lib/auth/storage";

export type AuthStatus =
  | "idle"
  | "loading"
  | "authenticated"
  | "unauthenticated";

type AuthContextValue = {
  status: AuthStatus;
  user: AuthUser | null;
  /** True after first bootstrap attempt (safe to show login vs redirect). */
  ready: boolean;
  requestOtp: (email: string) => Promise<void>;
  verifyOtp: (email: string, code: string) => Promise<void>;
  registerWithPassword: (email: string, password: string, name?: string) => Promise<void>;
  loginWithPassword: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  /** Refresh tokens and reload /me (e.g. after access expiry). */
  refreshSession: () => Promise<boolean>;
  /** Current access token for other API modules (null if logged out). */
  accessToken: string | null;
  lastError: string | null;
  clearError: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

async function loadUser(accessToken: string): Promise<AuthUser> {
  return authApi.getMe(accessToken);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>("idle");
  const [user, setUser] = useState<AuthUser | null>(null);
  const [ready, setReady] = useState(false);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [lastError, setLastError] = useState<string | null>(null);

  const clearError = useCallback(() => setLastError(null), []);

  const applyTokens = useCallback((pair: { accessToken: string; refreshToken: string }) => {
    tokenStorage.setTokens(pair);
    setAccessToken(pair.accessToken);
  }, []);

  const bootstrap = useCallback(async () => {
    const rt = tokenStorage.getRefreshToken();
    let at = tokenStorage.getAccessToken();

    // No session: skip network — avoids slow spinners when API is down or cold
    if (!at && !rt) {
      setUser(null);
      setAccessToken(null);
      setStatus("unauthenticated");
      setReady(true);
      return;
    }

    setStatus("loading");
    try {
      if (at) {
        try {
          const me = await loadUser(at);
          setUser(me);
          setAccessToken(at);
          setStatus("authenticated");
          return;
        } catch {
          at = null;
        }
      }

      if (rt) {
        const pair = await authApi.refreshTokens(rt);
        applyTokens(pair);
        const me = await loadUser(pair.accessToken);
        setUser(me);
        setStatus("authenticated");
        return;
      }

      setUser(null);
      setAccessToken(null);
      setStatus("unauthenticated");
    } catch {
      tokenStorage.clear();
      setUser(null);
      setAccessToken(null);
      setStatus("unauthenticated");
    } finally {
      setReady(true);
    }
  }, [applyTokens]);

  useEffect(() => {
    void bootstrap();
  }, [bootstrap]);

  const requestOtp = useCallback(async (email: string) => {
    clearError();
    await authApi.requestOtp(email);
  }, [clearError]);

  const verifyOtp = useCallback(
    async (email: string, code: string) => {
      clearError();
      setStatus("loading");
      try {
        const pair = await authApi.verifyOtp(email, code);
        applyTokens(pair);
        setUser(pair.user);
        setStatus("authenticated");
      } catch (e) {
        setStatus("unauthenticated");
        throw e;
      }
    },
    [applyTokens, clearError],
  );

  const registerWithPassword = useCallback(
    async (email: string, password: string, name?: string) => {
      clearError();
      setStatus("loading");
      try {
        const pair = await authApi.register({ email, password, name });
        applyTokens(pair);
        setUser(pair.user);
        setStatus("authenticated");
      } catch (e) {
        setStatus("unauthenticated");
        throw e;
      }
    },
    [applyTokens, clearError],
  );

  const loginWithPassword = useCallback(
    async (email: string, password: string) => {
      clearError();
      setStatus("loading");
      try {
        const pair = await authApi.loginWithPassword(email, password);
        applyTokens(pair);
        setUser(pair.user);
        setStatus("authenticated");
      } catch (e) {
        setStatus("unauthenticated");
        throw e;
      }
    },
    [applyTokens, clearError],
  );

  const refreshSession = useCallback(async (): Promise<boolean> => {
    const rt = tokenStorage.getRefreshToken();
    if (!rt) return false;
    try {
      const pair = await authApi.refreshTokens(rt);
      applyTokens(pair);
      setUser(pair.user);
      setStatus("authenticated");
      return true;
    } catch {
      tokenStorage.clear();
      setUser(null);
      setAccessToken(null);
      setStatus("unauthenticated");
      return false;
    }
  }, [applyTokens]);

  const signOut = useCallback(async () => {
    clearError();
    const rt = tokenStorage.getRefreshToken();
    try {
      if (rt) {
        await authApi.logout(rt);
      }
    } catch {
      /* still clear local session */
    }
    tokenStorage.clear();
    setUser(null);
    setAccessToken(null);
    setStatus("unauthenticated");
  }, [clearError]);

  /** Register refresh for apiGet 401 retry. */
  useEffect(() => {
    registerRefreshHandler(async () => refreshSession());
    return () => registerRefreshHandler(null);
  }, [refreshSession]);

  /**
   * Proactive refresh ~90s before access JWT expires (default ~15m) so sessions stay valid;
   * each refresh rotates refresh token while `JWT_REFRESH_TTL` (e.g. 30d) remains valid server-side.
   */
  useEffect(() => {
    if (status !== "authenticated" || !accessToken) return;

    const exp = getJwtExp(accessToken);
    let timer: number | undefined;
    let interval: number | undefined;

    if (exp) {
      const msUntilRefresh = exp * 1000 - Date.now() - 90_000;
      const delay = Math.max(30_000, msUntilRefresh);
      timer = window.setTimeout(() => {
        void refreshSession();
      }, delay);
    } else {
      interval = window.setInterval(() => {
        void refreshSession();
      }, 10 * 60 * 1000);
    }

    return () => {
      if (timer !== undefined) window.clearTimeout(timer);
      if (interval !== undefined) window.clearInterval(interval);
    };
  }, [status, accessToken, refreshSession]);

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      user,
      ready,
      requestOtp,
      verifyOtp,
      registerWithPassword,
      loginWithPassword,
      signOut,
      refreshSession,
      accessToken,
      lastError,
      clearError,
    }),
    [
      status,
      user,
      ready,
      requestOtp,
      verifyOtp,
      registerWithPassword,
      loginWithPassword,
      signOut,
      refreshSession,
      accessToken,
      lastError,
      clearError,
    ],
  );

  return (
    <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
}
