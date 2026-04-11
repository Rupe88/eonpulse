"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { Spinner } from "@/components/ui/spinner";
import { taskStateLabel } from "@/components/dashboard/task-state-label";
import { ApiError } from "@/lib/api/http";
import { SubAdminUnassignedTasksBlock } from "@/components/dashboard/sub-admin-unassigned-tasks";
import { listWorkerQueue } from "@/lib/api/worker-tasks";
import { listMyProjects } from "@/lib/api/workspace";
import type { MyProjectRow } from "@/lib/api/workspace";
import { useAuth } from "@/contexts/auth-context";
import { tokenStorage } from "@/lib/auth/storage";

const STORAGE_KEY = "eonpulse_subadmin_project_id";

function resolveToken(contextToken: string | null): string | null {
  if (contextToken) return contextToken;
  if (typeof window === "undefined") return null;
  return tokenStorage.getAccessToken();
}

function em(e: unknown): string {
  if (e instanceof ApiError) return e.message;
  if (e instanceof Error) return e.message;
  return "Something went wrong";
}

/**
 * Sub-admin (global role) home: delivery control — route internal review, rework, and client handoff.
 * Does not replace Admin for workspace setup; focuses on operational queues.
 */
export function SubAdminDashboard() {
  const router = useRouter();
  const { accessToken } = useAuth();
  const [projects, setProjects] = useState<MyProjectRow[]>([]);
  const [projectId, setProjectId] = useState<string | null>(null);
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [loadingQueues, setLoadingQueues] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [internalReview, setInternalReview] = useState<Awaited<ReturnType<typeof listWorkerQueue>>>([]);

  const loadProjects = useCallback(async () => {
    const token = resolveToken(accessToken);
    if (!token) {
      setLoadingProjects(false);
      return;
    }
    setLoadingProjects(true);
    setError(null);
    try {
      const list = await listMyProjects(token);
      setProjects(list);
      const stored =
        typeof window !== "undefined" ? window.sessionStorage.getItem(STORAGE_KEY) : null;
      const initial =
        (stored && list.some((p) => p.projectId === stored) ? stored : null) ??
        list[0]?.projectId ??
        null;
      setProjectId(initial);
      if (initial && typeof window !== "undefined") {
        window.sessionStorage.setItem(STORAGE_KEY, initial);
      }
    } catch (e) {
      setError(em(e));
    } finally {
      setLoadingProjects(false);
    }
  }, [accessToken]);

  useEffect(() => {
    void loadProjects();
  }, [loadProjects]);

  const loadQueues = useCallback(async () => {
    const token = resolveToken(accessToken);
    if (!token || !projectId) {
      setInternalReview([]);
      return;
    }
    setLoadingQueues(true);
    setError(null);
    try {
      const ir = await listWorkerQueue(token, {
        projectId,
        state: "IN_INTERNAL_REVIEW",
      });
      setInternalReview(ir);
    } catch (e) {
      setError(em(e));
      setInternalReview([]);
    } finally {
      setLoadingQueues(false);
    }
  }, [accessToken, projectId]);

  useEffect(() => {
    void loadQueues();
  }, [loadQueues]);

  function onProjectChange(next: string) {
    setProjectId(next);
    if (typeof window !== "undefined") {
      window.sessionStorage.setItem(STORAGE_KEY, next);
    }
    const params = new URLSearchParams();
    params.set("project", next);
    router.replace(`/dashboard?${params.toString()}`, { scroll: false });
  }

  const selected = projects.find((p) => p.projectId === projectId);

  return (
    <div className="w-full max-w-none space-y-8">
      <div className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm">
        <p className="text-sm font-semibold text-neutral-900">Sub-admin · Delivery operations</p>
        <p className="mt-2 text-sm leading-relaxed text-neutral-600">
          You can <strong>assign work</strong> to any worker or delivery lead in the workspace (they are added to the
          project automatically if needed), monitor <strong>internal review</strong>, and from each task page{" "}
          <strong>request rework</strong> or <strong>send work to client review</strong>. Workspace setup and billing
          stay in Admin.
        </p>
        <p className="mt-3 text-xs text-neutral-500">
          Open a task in internal review to see lead actions (rework / send to client).
        </p>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex w-full flex-col gap-1.5 sm:w-80">
          <label htmlFor="subadmin-project" className="text-xs font-medium text-neutral-600">
            Project
          </label>
          <select
            id="subadmin-project"
            className="input-field"
            disabled={loadingProjects || projects.length === 0}
            value={projectId ?? ""}
            onChange={(e) => onProjectChange(e.target.value)}
          >
            {projects.length === 0 ? (
              <option value="">No projects</option>
            ) : (
              projects.map((p) => (
                <option key={p.projectId} value={p.projectId}>
                  {p.name} ({p.code})
                </option>
              ))
            )}
          </select>
        </div>
        <Link
          href="/dashboard/tasks"
          className="text-sm font-medium text-neutral-900 underline underline-offset-2 hover:text-neutral-700"
        >
          Open full task queue →
        </Link>
      </div>

      {projectId ? (
        <SubAdminUnassignedTasksBlock projectId={projectId} onAssigned={() => void loadQueues()} />
      ) : null}

      {error ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">{error}</p>
      ) : null}

      {selected ? (
        <p className="text-xs text-neutral-500">
          Workspace: <span className="font-medium text-neutral-700">{selected.workspaceName}</span>
        </p>
      ) : null}

      <section className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-sm font-semibold text-neutral-900">Internal review queue</h2>
          <span className="text-xs text-neutral-500">{loadingQueues ? "Loading…" : `${internalReview.length} task(s)`}</span>
        </div>
        <p className="mt-1 text-xs text-neutral-500">
          Tasks in <strong>In internal review</strong> — open one to request rework or send to client review.
        </p>
        {loadingQueues && internalReview.length === 0 ? (
          <div className="flex justify-center py-12">
            <Spinner />
          </div>
        ) : internalReview.length === 0 ? (
          <p className="mt-4 text-sm text-neutral-500">No tasks in internal review for this project.</p>
        ) : (
          <ul className="mt-4 divide-y divide-neutral-100 border border-neutral-100 rounded-lg">
            {internalReview.slice(0, 12).map((row) => (
              <li key={row.id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2.5 text-sm">
                <div className="min-w-0">
                  <p className="font-medium text-neutral-900">{row.task.title}</p>
                  <p className="text-xs text-neutral-500">
                    {row.task.section.milestone.name} / {row.task.section.name} · {taskStateLabel(row.task.state)} ·
                    Assignee: {row.user.name || row.user.email}
                  </p>
                </div>
                <Link
                  href={`/dashboard/tasks/${row.taskId}`}
                  className="shrink-0 text-sm font-medium text-neutral-900 underline underline-offset-2"
                >
                  Open
                </Link>
              </li>
            ))}
          </ul>
        )}
        {internalReview.length > 12 ? (
          <p className="mt-3 text-xs text-neutral-500">Showing 12 of {internalReview.length}. See all in Task queue.</p>
        ) : null}
      </section>
    </div>
  );
}
