import { apiGet, apiPatch } from "./client";

export function listAuditLogs(accessToken: string, page = 1, pageSize = 20) {
  return apiGet<any[]>(`/admin-ops/audit-logs?page=${page}&pageSize=${pageSize}`, accessToken);
}

export function listSessions(accessToken: string, page = 1, pageSize = 20, userId?: string) {
  const sp = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
  if (userId) sp.set("userId", userId);
  return apiGet<any[]>(`/admin-ops/sessions?${sp.toString()}`, accessToken);
}

export function revokeSession(accessToken: string, sessionId: string) {
  return apiPatch(`/admin-ops/sessions/${encodeURIComponent(sessionId)}/revoke`, accessToken, {});
}

export function revokeUserSessions(accessToken: string, userId: string) {
  return apiPatch(`/admin-ops/users/${encodeURIComponent(userId)}/sessions/revoke-all`, accessToken, {});
}

export function listDevices(accessToken: string, page = 1, pageSize = 20, userId?: string) {
  const sp = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
  if (userId) sp.set("userId", userId);
  return apiGet<any[]>(`/admin-ops/devices?${sp.toString()}`, accessToken);
}

export function listLoginAttempts(accessToken: string, page = 1, pageSize = 20, email?: string, success?: string) {
  const sp = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
  if (email) sp.set("email", email);
  if (success) sp.set("success", success);
  return apiGet<any[]>(`/admin-ops/login-attempts?${sp.toString()}`, accessToken);
}

export function listOutboxEvents(accessToken: string, page = 1, pageSize = 20, status?: string) {
  const sp = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
  if (status) sp.set("status", status);
  return apiGet<any[]>(`/admin-ops/outbox-events?${sp.toString()}`, accessToken);
}

export function retryOutboxEvent(accessToken: string, eventId: string) {
  return apiPatch(`/admin-ops/outbox-events/${encodeURIComponent(eventId)}/retry`, accessToken, {});
}

export function listNotifications(accessToken: string, page = 1, pageSize = 20, userId?: string, status?: string) {
  const sp = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
  if (userId) sp.set("userId", userId);
  if (status) sp.set("status", status);
  return apiGet<any[]>(`/admin-ops/notifications?${sp.toString()}`, accessToken);
}

export function resendNotification(accessToken: string, notificationId: string) {
  return apiPatch(`/admin-ops/notifications/${encodeURIComponent(notificationId)}/resend`, accessToken, {});
}

export function listIdempotencyKeys(accessToken: string, page = 1, pageSize = 20, projectId?: string, scope?: string) {
  const sp = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
  if (projectId) sp.set("projectId", projectId);
  if (scope) sp.set("scope", scope);
  return apiGet<any[]>(`/admin-ops/idempotency-keys?${sp.toString()}`, accessToken);
}
