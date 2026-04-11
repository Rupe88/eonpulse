"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Spinner } from "@/components/ui/spinner";
import { taskStateLabel } from "@/components/dashboard/task-state-label";
import { ApiError } from "@/lib/api/http";
import { SubAdminUnassignedTasksBlock } from "@/components/dashboard/sub-admin-unassigned-tasks";
import { listWorkerQueue, type WorkerQueueRow } from "@/lib/api/worker-tasks";
import { listMyProjects, type MyProjectRow } from "@/lib/api/workspace";
import { useAuth } from "@/contexts/auth-context";
import { tokenStorage } from "@/lib/auth/storage";

type QueueRowWithProject = WorkerQueueRow & {
  projectId: string;
  projectName: string;
  projectCode: string;
};

const ALL = "__all__";

const STATE_OPTIONS: { value: string; label: string }[] = [
  { value: "", label: "All states" },
  { value: "ASSIGNED", label: "Assigned" },
  { value: "IN_PROGRESS", label: "In progress" },
  { value: "IN_INTERNAL_REVIEW", label: "In internal review" },
  { value: "REWORK_REQUESTED", label: "Rework requested" },
  { value: "READY_FOR_CLIENT_REVIEW", label: "Ready for client review" },
  { value: "CLIENT_COMMENTED", label: "Client commented" },
  { value: "FIX_IN_PROGRESS", label: "Fix in progress" },
];

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
 * Project-wide assignment queue for sub-admins (elevated worker queue — all assignees in project).
 */
export function SubAdminTasksPanel() {
  const { accessToken } = useAuth();
  const [projects, setProjects] = useState<MyProjectRow[]>([]);
  const [projectFilter, setProjectFilter] = useState<string>(ALL);
  const [stateFilter, setStateFilter] = useState("");
  const [rows, setRows] = useState<QueueRowWithProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadProjects = useCallback(async () => {
    const token = resolveToken(accessToken);
    if (!token) return;
    try {
      const list = await listMyProjects(token);
      setProjects(list);
    } catch {
      /* queue may still load */
    }
  }, [accessToken]);

  const loadQueue = useCallback(async () => {
    const token = resolveToken(accessToken);
    if (!token) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      if (projectFilter === ALL) {
        const chunks = await Promise.all(
          projects.map(async (p) => {
            const list = await listWorkerQueue(token, {
              projectId: p.projectId,
              ...(stateFilter ? { state: stateFilter } : {}),
            });
            return list.map((r) => ({
              ...r,
              projectId: p.projectId,
              projectName: p.name,
              projectCode: p.code,
            }));
          }),
        );
        setRows(chunks.flat());
      } else {
        const p = projects.find((x) => x.projectId === projectFilter);
        const list = await listWorkerQueue(token, {
          projectId: projectFilter,
          ...(stateFilter ? { state: stateFilter } : {}),
        });
        setRows(
          list.map((r) => ({
            ...r,
            projectId: projectFilter,
            projectName: p?.name ?? "—",
            projectCode: p?.code ?? "—",
          })),
        );
      }
    } catch (e) {
      setError(em(e));
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [accessToken, projectFilter, projects, stateFilter]);

  useEffect(() => {
    void loadProjects();
  }, [loadProjects]);

  useEffect(() => {
    if (projectFilter !== ALL && projects.length > 0) {
      const ok = projects.some((p) => p.projectId === projectFilter);
      if (!ok) setProjectFilter(ALL);
    }
  }, [projects, projectFilter]);

  useEffect(() => {
    if (projectFilter === ALL && projects.length === 0) {
      setRows([]);
      setLoading(false);
      return;
    }
    void loadQueue();
  }, [loadQueue, projectFilter, projects.length, stateFilter]);

  const sortedRows = useMemo(() => {
    return [...rows].sort((a, b) => {
      const da = a.task.dueDate ? new Date(a.task.dueDate).getTime() : Infinity;
      const db = b.task.dueDate ? new Date(b.task.dueDate).getTime() : Infinity;
      return da - db;
    });
  }, [rows]);

  return (
    <div className="w-full max-w-none space-y-8">
      <p className="text-sm leading-relaxed text-neutral-600">
        Project-wide task assignments. Open a task to <strong>request internal rework</strong> or{" "}
        <strong>send to client review</strong> when it is in internal review. Use <strong>Assign work</strong> after
        picking a project — no Admin access required.
      </p>

      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
        <label className="flex min-w-[200px] flex-col gap-1">
          <span className="text-xs font-medium text-neutral-600">Project</span>
          <select
            className="input-field"
            value={projectFilter}
            onChange={(e) => setProjectFilter(e.target.value)}
          >
            <option value={ALL}>All projects</option>
            {projects.map((p) => (
              <option key={p.projectId} value={p.projectId}>
                {p.name} ({p.code})
              </option>
            ))}
          </select>
        </label>
        <label className="flex min-w-[200px] flex-col gap-1">
          <span className="text-xs font-medium text-neutral-600">Task state</span>
          <select className="input-field" value={stateFilter} onChange={(e) => setStateFilter(e.target.value)}>
            {STATE_OPTIONS.map((o) => (
              <option key={o.value || "all"} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      {projectFilter === ALL ? (
        <p className="rounded-lg border border-neutral-200 bg-neutral-50 px-4 py-3 text-sm text-neutral-700">
          Select a <strong>single project</strong> above to assign tasks that have no executor yet.
        </p>
      ) : (
        <SubAdminUnassignedTasksBlock projectId={projectFilter} onAssigned={() => void loadQueue()} />
      )}

      {error ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">{error}</p>
      ) : null}

      {loading ? (
        <div className="flex justify-center py-16">
          <Spinner />
        </div>
      ) : projectFilter === ALL && projects.length === 0 ? (
        <p className="text-sm text-neutral-500">No projects available.</p>
      ) : sortedRows.length === 0 ? (
        <section className="card-elevated p-8 text-center text-sm text-neutral-600">
          No assignment rows in this scope. Tasks without an executor do not appear here — use <strong>Assign work</strong>{" "}
          above when a project is selected.
        </section>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-neutral-200 bg-white shadow-sm">
          <table className="w-full min-w-[960px] text-left text-sm">
            <thead className="border-b border-neutral-200 bg-neutral-50 text-xs font-semibold uppercase tracking-wide text-neutral-500">
              <tr>
                <th className="px-4 py-3">Task</th>
                <th className="px-4 py-3">State</th>
                <th className="px-4 py-3">Assignee</th>
                {projectFilter === ALL ? <th className="px-4 py-3">Project</th> : null}
                <th className="px-4 py-3">Milestone</th>
                <th className="px-4 py-3">Section</th>
                <th className="px-4 py-3 text-right">Open</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {sortedRows.map((row) => (
                  <tr key={row.id} className="hover:bg-neutral-50/80">
                    <td className="px-4 py-3 font-medium text-neutral-900">{row.task.title}</td>
                    <td className="px-4 py-3 text-neutral-700">{taskStateLabel(row.task.state)}</td>
                    <td className="px-4 py-3 text-neutral-600">{row.user.name || row.user.email}</td>
                    {projectFilter === ALL ? (
                      <td className="px-4 py-3 text-neutral-600">
                        {row.projectName}{" "}
                        <span className="font-mono text-xs text-neutral-500">({row.projectCode})</span>
                      </td>
                    ) : null}
                    <td className="px-4 py-3 text-neutral-600">{row.task.section.milestone.name}</td>
                    <td className="px-4 py-3 text-neutral-600">{row.task.section.name}</td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/dashboard/tasks/${row.taskId}`}
                        className="font-medium text-neutral-900 underline underline-offset-2 hover:text-neutral-700"
                      >
                        Open
                      </Link>
                    </td>
                  </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
