/** Global roles from GET /auth/me — used for route and shell gating. */

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

export function canAccessAdminPanel(role: string | undefined): boolean {
  const r = String(role ?? "").toUpperCase();
  return r === "ADMIN" || r === "SUB_ADMIN";
}
