"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Spinner } from "@/components/ui/spinner";
import { taskStateLabel } from "@/components/dashboard/task-state-label";
import { ApiError } from "@/lib/api/http";
import { listMyAssignmentsAllProjects, type MyTaskRow } from "@/lib/api/my-tasks-aggregate";
import { listMyAssignments } from "@/lib/api/tasks-assignments";
import { listMyProjects, type MyProjectRow } from "@/lib/api/workspace";
import { useAuth } from "@/contexts/auth-context";
import { tokenStorage } from "@/lib/auth/storage";

function resolveAccessToken(contextToken: string | null): string | null {
  if (contextToken) return contextToken;
  if (typeof window === "undefined") return null;
  return tokenStorage.getAccessToken();
}

function formatDue(d: string | null): string {
  if (!d) return "—";
  try {
    return new Date(d).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return "—";
  }
}

const ALL = "__all__";

export function TasksPanel() {
  const { accessToken } = useAuth();
  const [projects, setProjects] = useState<MyProjectRow[]>([]);
  const [projectFilter, setProjectFilter] = useState<string>(ALL);
  const [rows, setRows] = useState<MyTaskRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadProjects = useCallback(async () => {
    const token = resolveAccessToken(accessToken);
    if (!token) return;
    try {
      const list = await listMyProjects(token);
      setProjects(list);
    } catch {
      /* task load may still work for “all” */
    }
  }, [accessToken]);

  const loadTasks = useCallback(async () => {
    const token = resolveAccessToken(accessToken);
    if (!token) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      if (projectFilter === ALL) {
        const merged = await listMyAssignmentsAllProjects(token);
        setRows(merged);
      } else {
        const list = await listMyAssignments(projectFilter, token);
        const meta = projects.find((p) => p.projectId === projectFilter);
        setRows(
          list.map((r) => ({
            ...r,
            projectId: projectFilter,
            projectName: meta?.name ?? "—",
            projectCode: meta?.code ?? "—",
          })),
        );
      }
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Failed to load tasks");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [accessToken, projectFilter, projects]);

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
    void loadTasks();
  }, [loadTasks]);

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
          Tasks assigned to you. Filter by project or view everything in one list. Milestone and section show where each
          item lives in the plan.
        </p>

        <div className="flex flex-col gap-2 sm:max-w-md">
          <label htmlFor="task-project-filter" className="text-xs font-medium text-neutral-600">
            Project
          </label>
          <select
            id="task-project-filter"
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
        </div>

        {error ? (
          <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">{error}</p>
        ) : null}

        {loading ? (
          <div className="flex justify-center py-16">
            <Spinner />
          </div>
        ) : sortedRows.length === 0 ? (
          <section className="card-elevated p-8 text-center">
            <p className="text-sm font-medium text-neutral-900">No assignments</p>
            <p className="mt-2 text-sm text-neutral-500">
              Nothing assigned to you in this scope yet. Check Projects or ask a project admin.
            </p>
            <Link
              href="/dashboard/projects"
              className="mt-4 inline-block text-sm font-medium text-neutral-900 underline underline-offset-2 hover:text-neutral-700"
            >
              View projects
            </Link>
          </section>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-neutral-200 bg-white shadow-sm">
            <table className="w-full min-w-[960px] text-left text-sm">
              <thead className="border-b border-neutral-200 bg-neutral-50 text-xs font-semibold uppercase tracking-wide text-neutral-500">
                <tr>
                  <th className="px-4 py-3">Task</th>
                  <th className="px-4 py-3">State</th>
                  {projectFilter === ALL ? <th className="px-4 py-3">Project</th> : null}
                  <th className="px-4 py-3">Milestone</th>
                  <th className="px-4 py-3">Section</th>
                  <th className="px-4 py-3">Due</th>
                  <th className="px-4 py-3 text-right">Open</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {sortedRows.map((row) => (
                  <tr key={row.assignmentId} className="hover:bg-neutral-50/80">
                    <td className="px-4 py-3 font-medium text-neutral-900">{row.task.title}</td>
                    <td className="px-4 py-3 text-neutral-700">{taskStateLabel(row.task.state)}</td>
                    {projectFilter === ALL ? (
                      <td className="px-4 py-3 text-neutral-600">
                        {row.projectName}{" "}
                        <span className="font-mono text-xs text-neutral-500">({row.projectCode})</span>
                      </td>
                    ) : null}
                    <td className="px-4 py-3 text-neutral-600">{row.task.milestone.name}</td>
                    <td className="px-4 py-3 text-neutral-600">{row.task.section.name}</td>
                    <td className="px-4 py-3 tabular-nums text-neutral-600">{formatDue(row.task.dueDate)}</td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/dashboard/tasks/${row.task.id}`}
                        className="text-sm font-medium text-neutral-900 underline underline-offset-2 hover:text-neutral-700"
                      >
                        Work
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
