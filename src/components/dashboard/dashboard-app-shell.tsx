"use client";

import { usePathname } from "next/navigation";
import { useMemo } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { useAuth } from "@/contexts/auth-context";
import { isGlobalSubAdmin } from "@/lib/auth/role-gates";

/**
 * Single shell for all /dashboard/* routes so the sidebar stays mounted and
 * client navigations (Overview ↔ Projects ↔ Tasks) stay smooth without stuck “Rendering…”.
 */
export function DashboardAppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user } = useAuth();
  const subAdmin = isGlobalSubAdmin(user?.role);
  const meta = useMemo(() => {
    if (pathname.startsWith("/dashboard/projects")) {
      return { title: "Projects", subtitle: "Workspaces and projects you belong to" };
    }
    if (pathname.startsWith("/dashboard/tasks/") && pathname !== "/dashboard/tasks") {
      return {
        title: "Task detail",
        subtitle: subAdmin
          ? "Rework, send to client review, evidence — delivery actions"
          : "Status, evidence, dependencies, and activity",
      };
    }
    if (pathname.startsWith("/dashboard/tasks")) {
      return {
        title: subAdmin ? "Task queue" : "Tasks",
        subtitle: subAdmin
          ? "All assignments in the project — open a task to act as lead"
          : "Assignments across your projects",
      };
    }
    return {
      title: subAdmin ? "Delivery" : "Overview",
      subtitle: subAdmin
        ? "Internal review queue and routing — assign work in Admin when needed"
        : "Your assignments, reviews, and project pipeline",
    };
  }, [pathname, subAdmin]);

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
