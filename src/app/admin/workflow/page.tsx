"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AppShell, AppShellSkeleton } from "@/components/layout/app-shell";
import { WorkflowPanel } from "@/components/admin/workflow-panel";
import { Spinner } from "@/components/ui/spinner";
import { replaceOrHardNavigate } from "@/lib/auth/navigate-after-auth";
import { useAuth } from "@/contexts/auth-context";

function canAccessAdmin(role: string | undefined): boolean {
  const r = String(role ?? "").toUpperCase();
  return r === "ADMIN" || r === "SUB_ADMIN";
}

export default function AdminWorkflowPage() {
  const { ready, user, status } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!ready) return;
    if (status !== "authenticated" || !user) {
      replaceOrHardNavigate(router, "/login?next=%2Fadmin%2Fworkflow", "/admin/workflow");
      return;
    }
    if (!canAccessAdmin(user.role)) router.replace("/dashboard");
  }, [ready, status, user, router]);

  if (!ready) return <AppShellSkeleton headerTitle="Workflow" headerSubtitle="Loading workflow governance" />;

  if (status !== "authenticated" || !user) {
    return (
      <div className="flex min-h-full flex-1 flex-col items-center justify-center gap-4 bg-[var(--color-canvas)] px-4">
        <Spinner />
        <Link href="/login?next=%2Fadmin%2Fworkflow" className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800">
          Sign in
        </Link>
      </div>
    );
  }
  if (!canAccessAdmin(user.role)) return null;

  return (
    <AppShell
      headerTitle="Workflow Governance"
      headerSubtitle="Safe state transitions, closability checks, and milestone unlock controls"
      headerClassName="px-6"
      mainClassName="flex-1 px-6 py-8"
    >
      <WorkflowPanel />
    </AppShell>
  );
}
