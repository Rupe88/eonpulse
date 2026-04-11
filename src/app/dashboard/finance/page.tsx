"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { AppShell, AppShellSkeleton } from "@/components/layout/app-shell";
import { useAuth } from "@/contexts/auth-context";
import { BillingPanel } from "@/components/admin/billing-panel";
import { canAccessFinanceWorkspace } from "@/lib/auth/role-gates";

export default function FinanceDashboardPage() {
  const { ready, status, user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!ready) return;
    if (status !== "authenticated" || !user) {
      router.replace("/login?next=%2Fdashboard%2Ffinance");
      return;
    }
    if (!canAccessFinanceWorkspace(user.role)) {
      router.replace("/dashboard");
    }
  }, [ready, status, user, router]);

  if (!ready) {
    return (
      <AppShellSkeleton
        headerTitle="Finance Workspace"
        headerSubtitle="Loading billing queue"
      />
    );
  }

  if (status !== "authenticated" || !user || !canAccessFinanceWorkspace(user.role)) {
    return null;
  }

  return (
    <AppShell
      headerTitle="Finance Workspace"
      headerSubtitle="Invoice queue, verification queue and overdue handling"
      headerClassName="px-6"
      mainClassName="flex-1 px-6 py-8"
    >
      <BillingPanel />
    </AppShell>
  );
}
