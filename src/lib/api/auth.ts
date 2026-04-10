import { authUrl } from "./config";
import { parseResponse } from "./http";
import type {
  AuthUser,
  LogoutResponse,
  RequestOtpResponse,
  TokenPair,
} from "./auth.types";

/**
 * POST /auth/request-otp — sends OTP to email (creates user if new).
 */
export async function requestOtp(email: string): Promise<RequestOtpResponse> {
  const res = await fetch(authUrl("/auth/request-otp"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: email.trim().toLowerCase() }),
  });
  return parseResponse<RequestOtpResponse>(res);
}

/**
 * POST /auth/register — create account with password (default role: worker).
 */
export async function register(body: {
  email: string;
  password: string;
  name?: string;
}): Promise<TokenPair> {
  const res = await fetch(authUrl("/auth/register"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: body.email.trim().toLowerCase(),
      password: body.password,
      ...(body.name?.trim() ? { name: body.name.trim() } : {}),
    }),
  });
  return parseResponse<TokenPair>(res);
}

/**
 * POST /auth/login — email + password (users who set a password).
 */
export async function loginWithPassword(
  email: string,
  password: string,
): Promise<TokenPair> {
  const res = await fetch(authUrl("/auth/login"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: email.trim().toLowerCase(),
      password,
    }),
  });
  return parseResponse<TokenPair>(res);
}

/**
 * POST /auth/verify-otp — exchanges email + 6-digit code for tokens.
 */
export async function verifyOtp(
  email: string,
  code: string,
): Promise<TokenPair> {
  const res = await fetch(authUrl("/auth/verify-otp"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: email.trim().toLowerCase(),
      code: code.trim(),
    }),
  });
  return parseResponse<TokenPair>(res);
}

/**
 * POST /auth/refresh — new access + refresh; send refresh in body (cookie optional on server).
 */
export async function refreshTokens(refreshToken: string): Promise<TokenPair> {
  const res = await fetch(authUrl("/auth/refresh"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refreshToken: refreshToken.trim() }),
  });
  return parseResponse<TokenPair>(res);
}

/**
 * POST /auth/logout — revokes refresh session; include refresh in body when not using cookies.
 */
export async function logout(refreshToken: string): Promise<LogoutResponse> {
  const res = await fetch(authUrl("/auth/logout"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refreshToken: refreshToken.trim() }),
  });
  return parseResponse<LogoutResponse>(res);
}

/**
 * GET /auth/me — current user from access JWT.
 */
export async function getMe(accessToken: string): Promise<AuthUser> {
  const res = await fetch(authUrl("/auth/me"), {
    method: "GET",
    headers: {
      Authorization: `Bearer ${accessToken.trim()}`,
      Accept: "application/json",
    },
  });
  return parseResponse<AuthUser>(res);
}
