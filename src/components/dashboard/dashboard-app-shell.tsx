"use client";

import { usePathname } from "next/navigation";
import { useMemo } from "react";
import { AppShell } from "@/components/layout/app-shell";

/**
 * Single shell for all /dashboard/* routes so the sidebar stays mounted and
 * client navigations (Overview ↔ Projects ↔ Tasks) stay smooth without stuck “Rendering…”.
 */
export function DashboardAppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const meta = useMemo(() => {
    if (pathname.startsWith("/dashboard/projects")) {
      return { title: "Projects", subtitle: "Workspaces and projects you belong to" };
    }
    if (pathname.startsWith("/dashboard/tasks/") && pathname !== "/dashboard/tasks") {
      return { title: "Task detail", subtitle: "Status, evidence, dependencies, and activity" };
    }
    if (pathname.startsWith("/dashboard/tasks")) {
      return { title: "Tasks", subtitle: "Assignments across your projects" };
    }
    return { title: "Overview", subtitle: "Your assignments, reviews, and project pipeline" };
  }, [pathname]);

  return (
    <AppShell
      headerTitle={meta.title}
      headerSubtitle={meta.subtitle}
      headerClassName="px-6"
      mainClassName="flex-1 px-6 py-8"
    >
      {children}
    </AppShell>
  );
}
