"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { ProjectsPanel } from "@/components/dashboard/projects-panel";
import { Spinner } from "@/components/ui/spinner";
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
    return (
      <div className="flex min-h-full flex-1 items-center justify-center bg-[var(--color-canvas)]">
        <Spinner />
      </div>
    );
  }

  return <ProjectsPanel />;
}
