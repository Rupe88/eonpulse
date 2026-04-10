"use client";

import { DashboardAppShell } from "@/components/dashboard/dashboard-app-shell";
import { useAuth } from "@/contexts/auth-context";

/**
 * Shared dashboard chrome: one AppShell for /dashboard/* when signed in.
 * Always renders `{children}` so Next never leaves the route slot empty during auth bootstrap
 * (empty slot + client Link was contributing to stuck “Rendering…” in dev).
 */
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { ready, status, user } = useAuth();

  if (!ready || status !== "authenticated" || !user) {
    return <>{children}</>;
  }

  return <DashboardAppShell>{children}</DashboardAppShell>;
}
