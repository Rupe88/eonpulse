"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { AdminPanel } from "@/components/admin/admin-panel";
import { AppShell, AppShellSkeleton } from "@/components/layout/app-shell";
import { Spinner } from "@/components/ui/spinner";
import { replaceOrHardNavigate } from "@/lib/auth/navigate-after-auth";
import { canAccessAdminPanel, isGlobalSubAdmin } from "@/lib/auth/role-gates";
import { useAuth } from "@/contexts/auth-context";

export default function AdminPage() {
  const { ready, user, status } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!ready) return;
    if (status !== "authenticated" || !user) {
      replaceOrHardNavigate(router, "/login?next=%2Fadmin", "/admin");
      return;
    }
    if (!canAccessAdminPanel(user.role)) {
      if (isGlobalSubAdmin(user.role)) {
        router.replace("/admin/users");
      } else {
        router.replace("/dashboard");
      }
    }
  }, [ready, status, user, router]);

  if (!ready) {
    return <AppShellSkeleton headerTitle="Admin" headerSubtitle="Loading admin workspace" />;
  }

  if (status !== "authenticated" || !user) {
    return (
      <div className="flex min-h-full flex-1 flex-col items-center justify-center gap-4 bg-[var(--color-canvas)] px-4">
        <Spinner />
        <p className="text-center text-sm text-neutral-600">
          You need to be signed in to open the admin area. If this page doesn’t redirect, use the button below.
        </p>
        <Link
          href="/login?next=%2Fadmin"
          className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800"
        >
          Sign in
        </Link>
      </div>
    );
  }

  if (!canAccessAdminPanel(user.role)) {
    if (isGlobalSubAdmin(user.role)) {
      return (
        <div className="flex min-h-full flex-1 flex-col items-center justify-center gap-3 bg-[var(--color-canvas)] px-4">
          <Spinner />
          <p className="text-sm text-neutral-600">Opening user management…</p>
        </div>
      );
    }
    return (
      <div className="flex min-h-full flex-1 flex-col items-center justify-center gap-6 bg-[var(--color-canvas)] px-4">
        <div className="max-w-md rounded-xl border border-neutral-200 bg-white p-8 text-center shadow-sm">
          <h1 className="text-lg font-semibold text-neutral-900">Admin access required</h1>
          <p className="mt-2 text-sm text-neutral-600">
            Your account ({user.email}) doesn’t have permission to open the full admin workspace. Ask a global{" "}
            <strong>Admin</strong> if you need workspace setup, or sign in with an admin account.
          </p>
          <Link
            href="/dashboard"
            className="mt-6 inline-flex rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800"
          >
            Go to dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <AppShell
      headerTitle="Admin"
      headerSubtitle="Create workspaces, clients, projects, and planning hierarchy"
      headerClassName="px-6"
      mainClassName="flex-1 px-6 py-8"
    >
      <AdminPanel />
    </AppShell>
  );
}
