"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { SubAdminDashboard } from "@/components/dashboard/sub-admin-dashboard";
import { WorkerOverview } from "@/components/dashboard/worker-overview";
import { isGlobalSubAdmin } from "@/lib/auth/role-gates";
import { AppShellSkeleton } from "@/components/layout/app-shell";
import { useAuth } from "@/contexts/auth-context";

export default function DashboardPage() {
  const router = useRouter();
  const { ready, status, user } = useAuth();

  useEffect(() => {
    if (ready && status === "unauthenticated") {
      router.replace("/login");
    }
  }, [ready, status, router]);

  useEffect(() => {
    if (!ready || status !== "authenticated" || !user) return;
    const role = String(user.role ?? "").toUpperCase();
    if (role === "CLIENT_OWNER") router.replace("/dashboard/client");
    if (role === "FINANCE") router.replace("/dashboard/finance");
    if (role === "AUDITOR") router.replace("/dashboard/auditor");
  }, [ready, status, user, router]);

  if (!ready || status !== "authenticated" || !user) {
    return <AppShellSkeleton headerTitle="Overview" headerSubtitle="Loading dashboard" />;
  }

  const role = String(user.role ?? "").toUpperCase();
  if (role === "CLIENT_OWNER" || role === "FINANCE" || role === "AUDITOR") return null;

  if (isGlobalSubAdmin(user.role)) {
    return <SubAdminDashboard />;
  }

  return <WorkerOverview />;
}
