"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { AppShell, AppShellSkeleton } from "@/components/layout/app-shell";
import { useAuth } from "@/contexts/auth-context";
import { ClientWorkspacePanel } from "@/components/client/client-workspace-panel";
import { canAccessClientWorkspace } from "@/lib/auth/role-gates";

export default function ClientDashboardPage() {
  const { ready, status, user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!ready) return;
    if (status !== "authenticated" || !user) {
      router.replace("/login?next=%2Fdashboard%2Fclient");
      return;
    }
    if (!canAccessClientWorkspace(user.role)) {
      router.replace("/dashboard");
    }
  }, [ready, status, user, router]);

  if (!ready) {
    return (
      <AppShellSkeleton
        headerTitle="Client Workspace"
        headerSubtitle="Loading client dashboard"
      />
    );
  }

  if (status !== "authenticated" || !user || !canAccessClientWorkspace(user.role)) {
    return null;
  }

  return (
    <AppShell
      headerTitle="Client Workspace"
      headerSubtitle="Approvals, comments, invoices and delivery updates"
      headerClassName="px-6"
      mainClassName="flex-1 px-6 py-8"
    >
      <ClientWorkspacePanel />
    </AppShell>
  );
}
