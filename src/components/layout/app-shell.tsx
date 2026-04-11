"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { useAuth } from "@/contexts/auth-context";
import { canAccessAdminPanel, isGlobalSubAdmin } from "@/lib/auth/role-gates";
import { Skeleton } from "@/components/ui/skeleton";

type NavItem = {
  href: string;
  label: string;
  icon: typeof LayoutGridIcon;
  disabled?: boolean;
};

const baseNav: NavItem[] = [
  { href: "/dashboard", label: "Overview", icon: LayoutGridIcon },
  { href: "/dashboard/projects", label: "Projects", icon: FolderIcon },
  { href: "/dashboard/tasks", label: "Tasks", icon: CheckSquareIcon },
];

/**
 * Global sub-admin: delivery operations — same workspace routes as workers plus client preview.
 * (Full Admin UI stays ADMIN-only via `canAccessAdminPanel`.)
 */
const subAdminNav: NavItem[] = [
  { href: "/dashboard", label: "Delivery", icon: LayoutGridIcon },
  { href: "/dashboard/tasks", label: "Task queue", icon: CheckSquareIcon },
  { href: "/dashboard/projects", label: "Projects", icon: FolderIcon },
  { href: "/dashboard/client", label: "Client Workspace", icon: ReviewIcon },
];

function navItemActive(pathname: string, href: string): boolean {
  if (href === "/admin") {
    return pathname === "/admin";
  }
  if (href === "/admin/users") {
    return pathname === "/admin/users" || pathname.startsWith("/admin/users/");
  }
  if (href === "/admin/reviews") {
    return pathname === "/admin/reviews" || pathname.startsWith("/admin/reviews/");
  }
  if (href === "/admin/deliverables") {
    return pathname === "/admin/deliverables" || pathname.startsWith("/admin/deliverables/");
  }
  if (href === "/admin/billing") {
    return pathname === "/admin/billing" || pathname.startsWith("/admin/billing/");
  }
  if (href === "/admin/ops") {
    return pathname === "/admin/ops" || pathname.startsWith("/admin/ops/");
  }
  if (href === "/dashboard") {
    return pathname === "/dashboard" || pathname === "/dashboard/";
  }
  if (href === "/dashboard/projects") {
    return pathname.startsWith("/dashboard/projects");
  }
  if (href === "/dashboard/tasks") {
    return pathname === "/dashboard/tasks" || pathname.startsWith("/dashboard/tasks/");
  }
  if (href === "/admin/progress") {
    return pathname === "/admin/progress" || pathname.startsWith("/admin/progress/");
  }
  if (href === "/admin/workflow") {
    return pathname === "/admin/workflow" || pathname.startsWith("/admin/workflow/");
  }
  if (href === "/admin/git") {
    return pathname === "/admin/git" || pathname.startsWith("/admin/git/");
  }
  return pathname === href;
}

function LayoutGridIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
    </svg>
  );
}

function FolderIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" />
    </svg>
  );
}

function CheckSquareIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function ShieldIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
    </svg>
  );
}

function UsersIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" aria-hidden>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M18 7.5a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zM10.5 8.25a3 3 0 11-6 0 3 3 0 016 0zM4.314 18a5.25 5.25 0 0110.372 0M14.25 18h5.436a3.75 3.75 0 00-5.436-3.34"
      />
    </svg>
  );
}

function ReviewIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3h6m-8.25 9h9A2.25 2.25 0 0016.5 18V6A2.25 2.25 0 0014.25 3.75h-9A2.25 2.25 0 003 6v12a2.25 2.25 0 002.25 2.25zM16.5 14.25l2.69 2.69a1.5 1.5 0 010 2.12l-.53.53a1.5 1.5 0 01-2.12 0l-2.69-2.69" />
    </svg>
  );
}

function DeliverableIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5A3.375 3.375 0 0010.125 2.25H6.75A2.25 2.25 0 004.5 4.5v15A2.25 2.25 0 006.75 21.75h10.5a2.25 2.25 0 002.25-2.25V14.25z" />
    </svg>
  );
}

function BillingIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-9.75h4.125a1.875 1.875 0 010 3.75H10.5a1.875 1.875 0 000 3.75H15m-9-3.75h.008v.008H6v-.008zm12 0h.008v.008H18v-.008zM21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function OpsIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 3.75h1.5m-6.75 3h12m-14.25 4.5h16.5m-15 4.5h13.5M9 16.5h6m-7.5 3h9" />
    </svg>
  );
}

function ProgressIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 18h16.5M6.75 15.75v-3.75m4.5 3.75V9m4.5 6.75v-2.25m4.5 2.25V6.75" />
    </svg>
  );
}

function WorkflowIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 6.75A2.25 2.25 0 108.25 9h7.5a2.25 2.25 0 100-1.5h-7.5A2.25 2.25 0 006 6.75zm10.5 8.25a2.25 2.25 0 10-2.25 2.25H9.75a2.25 2.25 0 100 1.5h4.5A2.25 2.25 0 1016.5 15z" />
    </svg>
  );
}

function GitIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 6h4.5a2.25 2.25 0 012.25 2.25V9m0 6v.75A2.25 2.25 0 0112 18H7.5A2.25 2.25 0 015.25 15.75v-1.5A2.25 2.25 0 017.5 12H12m2.25-3h2.25A2.25 2.25 0 0118.75 11.25v4.5A2.25 2.25 0 0116.5 18h-2.25A2.25 2.25 0 0112 15.75v-4.5A2.25 2.25 0 0114.25 9z" />
    </svg>
  );
}

function isClientRole(globalRole: string | undefined): boolean {
  const r = String(globalRole ?? "").toUpperCase();
  return r === "CLIENT_OWNER";
}

function isFinanceRole(globalRole: string | undefined): boolean {
  const r = String(globalRole ?? "").toUpperCase();
  return r === "FINANCE";
}

function isAuditorRole(globalRole: string | undefined): boolean {
  const r = String(globalRole ?? "").toUpperCase();
  return r === "AUDITOR";
}

export function AppShell({
  children,
  headerTitle = "Overview",
  headerSubtitle = "Delivery workspace",
  headerClassName,
  mainClassName,
}: {
  children: ReactNode;
  headerTitle?: string;
  headerSubtitle?: string;
  /** Override header horizontal padding (default px-6). */
  headerClassName?: string;
  /** Override main padding (default p-6). */
  mainClassName?: string;
}) {
  const pathname = usePathname();
  const { user, signOut } = useAuth();
  const userEmail = user?.email ?? "";
  const showAdmin = canAccessAdminPanel(user?.role);
  const role = String(user?.role ?? "").toUpperCase();

  const nav: NavItem[] = isGlobalSubAdmin(role) ? [...subAdminNav] : [...baseNav];
  if (role === "ADMIN") {
    nav.push(
      { href: "/dashboard/client", label: "Client Workspace", icon: ReviewIcon },
      { href: "/dashboard/finance", label: "Finance Workspace", icon: BillingIcon },
      { href: "/dashboard/auditor", label: "Auditor Workspace", icon: ShieldIcon },
    );
  } else if (isClientRole(role)) {
    nav.push({ href: "/dashboard/client", label: "Client Workspace", icon: ReviewIcon });
  } else if (isFinanceRole(role)) {
    nav.push({ href: "/dashboard/finance", label: "Finance Workspace", icon: BillingIcon });
  } else if (isAuditorRole(role)) {
    nav.push({ href: "/dashboard/auditor", label: "Auditor Workspace", icon: ShieldIcon });
  }
  if (showAdmin) {
    nav.push(
      { href: "/admin", label: "Admin", icon: ShieldIcon },
      { href: "/admin/users", label: "Users", icon: UsersIcon },
      { href: "/admin/reviews", label: "Reviews", icon: ReviewIcon },
      { href: "/admin/deliverables", label: "Deliverables", icon: DeliverableIcon },
      { href: "/admin/billing", label: "Billing", icon: BillingIcon },
      { href: "/admin/progress", label: "Progress", icon: ProgressIcon },
      { href: "/admin/workflow", label: "Workflow", icon: WorkflowIcon },
      { href: "/admin/git", label: "Git", icon: GitIcon },
      { href: "/admin/ops", label: "Ops", icon: OpsIcon },
    );
  } else if (isGlobalSubAdmin(role)) {
    nav.push(
      { href: "/admin/users", label: "Users", icon: UsersIcon },
      { href: "/admin/ops", label: "Ops", icon: OpsIcon },
    );
  }

  return (
    <div className="flex min-h-full flex-1 bg-[var(--color-canvas)]">
      <aside className="pointer-events-auto fixed inset-y-0 left-0 z-40 flex w-[260px] flex-col border-r border-[var(--color-border)] bg-[var(--color-sidebar)]">
        <div className="flex h-14 items-center border-b border-[var(--color-border)] px-4">
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-[var(--color-fg)]">Eonpulse</p>
            <p className="truncate text-[11px] text-[var(--color-fg-muted)]">Workspace</p>
          </div>
        </div>
        <nav className="flex-1 space-y-0.5 p-3">
          {nav.map((item) => {
            const active = navItemActive(pathname, item.href);
            const base =
              "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors";
            if (item.disabled) {
              return (
                <span
                  key={item.href}
                  className={`${base} cursor-not-allowed text-[var(--color-fg-muted)] opacity-60`}
                  title="Coming soon"
                >
                  <item.icon className="h-5 w-5 shrink-0" />
                  {item.label}
                  <span className="ml-auto rounded bg-neutral-100 px-1.5 py-0.5 text-[10px] font-medium uppercase text-neutral-500">
                    Soon
                  </span>
                </span>
              );
            }
            /* Native <a> for workspace routes: avoids Turbopack/App Router soft-navigation stalls
               that show endless “Rendering…”; full load is fast and reliable. */
            const navClass = `${base} ${
              active
                ? "bg-neutral-900 text-white"
                : "text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900"
            }`;
            return (
              <a
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={navClass}
              >
                <item.icon className="h-5 w-5 shrink-0" />
                {item.label}
              </a>
            );
          })}
        </nav>
        <div className="border-t border-[var(--color-border)] p-3">
          <div className="rounded-lg border border-[var(--color-border)] bg-neutral-50 p-3">
            <p className="truncate text-xs font-medium text-[var(--color-fg)]">{userEmail}</p>
            <button
              type="button"
              onClick={() => void signOut()}
              className="mt-2 w-full rounded-md border border-neutral-200 bg-white py-1.5 text-xs font-medium text-neutral-800 shadow-sm transition hover:bg-neutral-100"
            >
              Sign out
            </button>
          </div>
        </div>
      </aside>
      <div className="flex flex-1 flex-col pl-[260px]">
        <header
          className={`sticky top-0 z-20 flex h-14 items-center justify-between border-b border-[var(--color-border)] bg-[var(--color-surface)]/95 backdrop-blur supports-[backdrop-filter]:bg-[var(--color-surface)]/80 ${headerClassName ?? "px-6"}`}
        >
          <div>
            <h1 className="text-sm font-semibold text-[var(--color-fg)]">{headerTitle}</h1>
            <p className="text-xs text-[var(--color-fg-muted)]">{headerSubtitle}</p>
          </div>
          <Link
            href="/"
            className="text-xs font-medium text-[var(--color-fg-muted)] transition hover:text-[var(--color-fg)]"
          >
            Home
          </Link>
        </header>
        <main className={mainClassName ?? "flex-1 p-6"}>{children}</main>
      </div>
    </div>
  );
}

export function AppShellSkeleton({
  headerTitle = "Loading...",
  headerSubtitle = "Preparing workspace",
}: {
  headerTitle?: string;
  headerSubtitle?: string;
}) {
  return (
    <div className="flex min-h-full flex-1 bg-[var(--color-canvas)]">
      <aside className="fixed inset-y-0 left-0 z-40 flex w-[260px] flex-col border-r border-[var(--color-border)] bg-[var(--color-sidebar)]">
        <div className="flex h-14 items-center border-b border-[var(--color-border)] px-4">
          <div className="min-w-0 flex-1 space-y-1">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-3 w-16" />
          </div>
        </div>
        <nav className="flex-1 space-y-2 p-3">
          <Skeleton className="h-10 w-full rounded-lg" />
          <Skeleton className="h-10 w-full rounded-lg" />
          <Skeleton className="h-10 w-full rounded-lg" />
          <Skeleton className="h-10 w-full rounded-lg" />
        </nav>
        <div className="border-t border-[var(--color-border)] p-3">
          <div className="rounded-lg border border-[var(--color-border)] bg-neutral-50 p-3 space-y-2">
            <Skeleton className="h-3 w-40" />
            <Skeleton className="h-8 w-full rounded-md" />
          </div>
        </div>
      </aside>

      <div className="flex flex-1 flex-col pl-[260px]">
        <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b border-[var(--color-border)] bg-[var(--color-surface)]/95 px-6">
          <div>
            <h1 className="text-sm font-semibold text-[var(--color-fg)]">{headerTitle}</h1>
            <p className="text-xs text-[var(--color-fg-muted)]">{headerSubtitle}</p>
          </div>
          <Skeleton className="h-3 w-12" />
        </header>
        <main className="flex-1 p-6">
          <div className="space-y-3">
            <Skeleton className="h-28 w-full rounded-xl" />
            <Skeleton className="h-28 w-full rounded-xl" />
            <Skeleton className="h-28 w-full rounded-xl" />
          </div>
        </main>
      </div>
    </div>
  );
}
