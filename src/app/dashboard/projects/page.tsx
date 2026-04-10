"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { ProjectsPanel } from "@/components/dashboard/projects-panel";
import { AppShellSkeleton } from "@/components/layout/app-shell";
import { useAuth } from "@/contexts/auth-context";

export default function DashboardProjectsPage() {
  const router = useRouter();
  const { ready, status, user } = useAuth();

  useEffect(() => {
    if (ready && status === "unauthenticated") {
      router.replace("/login");
    }
  }, [ready, status, router]);

  if (!ready || status !== "authenticated" || !user) {
    return <AppShellSkeleton headerTitle="Projects" headerSubtitle="Loading projects" />;
  }

  return <ProjectsPanel />;
}
