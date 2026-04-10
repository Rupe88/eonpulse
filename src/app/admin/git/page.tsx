"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AppShell, AppShellSkeleton } from "@/components/layout/app-shell";
import { GitPanel } from "@/components/admin/git-panel";
import { Spinner } from "@/components/ui/spinner";
import { replaceOrHardNavigate } from "@/lib/auth/navigate-after-auth";
import { useAuth } from "@/contexts/auth-context";

function canAccessAdmin(role: string | undefined): boolean {
  const r = String(role ?? "").toUpperCase();
  return r === "ADMIN" || r === "SUB_ADMIN";
}

export default function AdminGitPage() {
  const { ready, user, status } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!ready) return;
    if (status !== "authenticated" || !user) {
      replaceOrHardNavigate(router, "/login?next=%2Fadmin%2Fgit", "/admin/git");
      return;
    }
    if (!canAccessAdmin(user.role)) router.replace("/dashboard");
  }, [ready, status, user, router]);

  if (!ready) return <AppShellSkeleton headerTitle="Git Integration" headerSubtitle="Loading git mapping module" />;

  if (status !== "authenticated" || !user) {
    return (
      <div className="flex min-h-full flex-1 flex-col items-center justify-center gap-4 bg-[var(--color-canvas)] px-4">
        <Spinner />
        <Link href="/login?next=%2Fadmin%2Fgit" className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800">
          Sign in
        </Link>
      </div>
    );
  }
  if (!canAccessAdmin(user.role)) return null;

  return (
    <AppShell
      headerTitle="Git Integration"
      headerSubtitle="Map repos, issue keys, branches, PRs, releases, and commits"
      headerClassName="px-6"
      mainClassName="flex-1 px-6 py-8"
    >
      <GitPanel />
    </AppShell>
  );
}
