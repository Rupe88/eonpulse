/** Global roles from GET /auth/me — used for route and shell gating. */

export function isGlobalSubAdmin(role: string | undefined): boolean {
  return String(role ?? "").toUpperCase() === "SUB_ADMIN";
}

export function canAccessClientWorkspace(role: string | undefined): boolean {
  const r = String(role ?? "").toUpperCase();
  return r === "CLIENT_OWNER" || r === "ADMIN" || r === "SUB_ADMIN";
}

export function canAccessFinanceWorkspace(role: string | undefined): boolean {
  const r = String(role ?? "").toUpperCase();
  return r === "FINANCE" || r === "ADMIN" || r === "SUB_ADMIN";
}

export function canAccessAuditorWorkspace(role: string | undefined): boolean {
  const r = String(role ?? "").toUpperCase();
  return r === "AUDITOR" || r === "ADMIN" || r === "SUB_ADMIN";
}

/** Full workspace Admin UI (create clients, projects, hierarchy) — global Admin only. */
export function canAccessAdminPanel(role: string | undefined): boolean {
  return String(role ?? "").toUpperCase() === "ADMIN";
}

/**
 * Users management and Ops (audit, sessions, …) — backend allows global Admin and Sub-admin.
 * Sub-admins cannot use the rest of `/admin/*` (planning, billing UI, etc.).
 */
export function canAccessAdminSupportModules(role: string | undefined): boolean {
  const r = String(role ?? "").toUpperCase();
  return r === "ADMIN" || r === "SUB_ADMIN";
}
