"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { WorkerTaskDetail } from "@/components/dashboard/worker-task-detail";
import { AppShellSkeleton } from "@/components/layout/app-shell";
import { useAuth } from "@/contexts/auth-context";

export default function DashboardTaskDetailPage() {
  const router = useRouter();
  const params = useParams();
  const taskId = typeof params.taskId === "string" ? params.taskId : "";
  const { ready, status, user } = useAuth();

  useEffect(() => {
    if (ready && status === "unauthenticated") {
      router.replace("/login");
    }
  }, [ready, status, router]);

  if (!ready || status !== "authenticated" || !user) {
    return <AppShellSkeleton headerTitle="Task" headerSubtitle="Loading task" />;
  }

  if (!taskId) {
    return (
      <p className="text-sm text-neutral-600">Invalid task.</p>
    );
  }

  return <WorkerTaskDetail taskId={taskId} />;
}
