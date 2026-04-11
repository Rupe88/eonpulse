"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AppShell, AppShellSkeleton } from "@/components/layout/app-shell";
import { BillingPanel } from "@/components/admin/billing-panel";
import { Spinner } from "@/components/ui/spinner";
import { replaceOrHardNavigate } from "@/lib/auth/navigate-after-auth";
import { canAccessAdminPanel } from "@/lib/auth/role-gates";
import { useAuth } from "@/contexts/auth-context";

export default function AdminBillingPage() {
  const { ready, user, status } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!ready) return;
    if (status !== "authenticated" || !user) {
      replaceOrHardNavigate(router, "/login?next=%2Fadmin%2Fbilling", "/admin/billing");
      return;
    }
    if (!canAccessAdminPanel(user.role)) {
      router.replace("/dashboard");
    }
  }, [ready, status, user, router]);

  if (!ready) return <AppShellSkeleton headerTitle="Billing" headerSubtitle="Loading billing module" />;

  if (status !== "authenticated" || !user) {
    return (
      <div className="flex min-h-full flex-1 flex-col items-center justify-center gap-4 bg-[var(--color-canvas)] px-4">
        <Spinner />
        <Link href="/login?next=%2Fadmin%2Fbilling" className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800">
          Sign in
        </Link>
      </div>
    );
  }
  if (!canAccessAdminPanel(user.role)) return null;

  return (
    <AppShell headerTitle="Billing" headerSubtitle="Invoices, payments, verification and overdue tracking" headerClassName="px-6" mainClassName="flex-1 px-6 py-8">
      <BillingPanel />
    </AppShell>
  );
}
