"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { AppShell, AppShellSkeleton } from "@/components/layout/app-shell";
import { useAuth } from "@/contexts/auth-context";
import { AuditorPanel } from "@/components/auditor/auditor-panel";
import { canAccessAuditorWorkspace } from "@/lib/auth/role-gates";

export default function AuditorDashboardPage() {
  const { ready, status, user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!ready) return;
    if (status !== "authenticated" || !user) {
      router.replace("/login?next=%2Fdashboard%2Fauditor");
      return;
    }
    if (!canAccessAuditorWorkspace(user.role)) {
      router.replace("/dashboard");
    }
  }, [ready, status, user, router]);

  if (!ready) {
    return (
      <AppShellSkeleton
        headerTitle="Auditor Workspace"
        headerSubtitle="Loading traceability view"
      />
    );
  }

  if (status !== "authenticated" || !user || !canAccessAuditorWorkspace(user.role)) {
    return null;
  }

  return (
    <AppShell
      headerTitle="Auditor Workspace"
      headerSubtitle="Read-only review, approval and deliverable traceability"
      headerClassName="px-6"
      mainClassName="flex-1 px-6 py-8"
    >
      <AuditorPanel />
    </AppShell>
  );
}
