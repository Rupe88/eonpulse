"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { taskStateLabel } from "@/components/dashboard/task-state-label";
import { ApiError } from "@/lib/api/http";
import { getProjectOverview } from "@/lib/api/dashboard-internal";
import type { ProjectOverviewPayload } from "@/lib/api/dashboard-internal";
import { listMyAssignments, listMyReviewAssignments } from "@/lib/api/tasks-assignments";
import type { AssignmentTaskPayload } from "@/lib/api/tasks-assignments";
import { listMyProjects } from "@/lib/api/workspace";
import type { MyProjectRow } from "@/lib/api/workspace";
import { useAuth } from "@/contexts/auth-context";
import { tokenStorage } from "@/lib/auth/storage";

const STORAGE_KEY = "eonpulse_selected_project_id";

function projectIdFromUrl(): string | null {
  if (typeof window === "undefined") return null;
  return new URLSearchParams(window.location.search).get("project");
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

function resolveAccessToken(contextToken: string | null): string | null {
  if (contextToken) return contextToken;
  if (typeof window === "undefined") return null;
  return tokenStorage.getAccessToken();
}

export function WorkerOverview() {
  const router = useRouter();
  const { user, accessToken } = useAuth();

  const [projects, setProjects] = useState<MyProjectRow[]>([]);
  const [projectId, setProjectId] = useState<string | null>(null);
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [overview, setOverview] = useState<ProjectOverviewPayload | null>(null);
  const [assignments, setAssignments] = useState<AssignmentTaskPayload[]>([]);
  const [reviews, setReviews] = useState<AssignmentTaskPayload[]>([]);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const loadProjects = useCallback(async () => {
    const token = resolveAccessToken(accessToken);
    if (!token) {
      setLoadingProjects(false);
      return;
    }
    setLoadingProjects(true);
    setLoadError(null);
    try {
      const list = await listMyProjects(token);
      setProjects(list);
      const fromUrl = projectIdFromUrl();
      const fromStorage =
        typeof window !== "undefined" ? window.sessionStorage.getItem(STORAGE_KEY) : null;
      const initial =
        (fromUrl && list.some((p) => p.projectId === fromUrl) ? fromUrl : null) ??
        (fromStorage && list.some((p) => p.projectId === fromStorage) ? fromStorage : null) ??
        list[0]?.projectId ??
        null;
      setProjectId(initial);
      if (initial && typeof window !== "undefined") {
        window.sessionStorage.setItem(STORAGE_KEY, initial);
      }
    } catch (e) {
      setLoadError(e instanceof ApiError ? e.message : "Failed to load projects");
    } finally {
      setLoadingProjects(false);
    }
  }, [accessToken]);

  useEffect(() => {
    void loadProjects();
  }, [loadProjects]);

  const loadProjectDetail = useCallback(
    async (pid: string) => {
      const token = resolveAccessToken(accessToken);
      if (!token) return;
      setLoadingDetail(true);
      setOverview(null);
      setAssignments([]);
      setReviews([]);
      setLoadError(null);
      try {
        const [a, r, o] = await Promise.all([
          listMyAssignments(pid, token),
          listMyReviewAssignments(pid, token),
          getProjectOverview(pid, token),
        ]);
        setAssignments(a);
        setReviews(r);
        setOverview(o);
      } catch (e: unknown) {
        setLoadError(e instanceof ApiError ? e.message : "Failed to load overview");
      } finally {
        setLoadingDetail(false);
      }
    },
    [accessToken],
  );

  useEffect(() => {
    if (!projectId) return;
    if (!resolveAccessToken(accessToken)) return;
    void loadProjectDetail(projectId);
  }, [projectId, accessToken, loadProjectDetail]);

  function onProjectChange(nextId: string) {
    setProjectId(nextId);
    if (typeof window !== "undefined") {
      window.sessionStorage.setItem(STORAGE_KEY, nextId);
    }
    const params = new URLSearchParams();
    params.set("project", nextId);
    router.replace(`/dashboard?${params.toString()}`, { scroll: false });
  }

  const selected = projects.find((p) => p.projectId === projectId);
  const maxStatus = Math.max(...(overview?.statusBreakdown.map((x) => x.count) ?? [1]));
  const maxTrend = Math.max(...(overview?.completionTrend.map((x) => x.completed) ?? [1]));

  return (
    <div className="w-full max-w-none space-y-8">
        <p className="text-sm leading-relaxed text-neutral-600">
          Pick a project to see your tasks, review queue, and pipeline metrics. Browse all projects on{" "}
          <Link href="/dashboard/projects" className="font-medium text-neutral-900 underline underline-offset-2 hover:text-neutral-700">
            Projects
          </Link>{" "}
          and all assignments on{" "}
          <Link href="/dashboard/tasks" className="font-medium text-neutral-900 underline underline-offset-2 hover:text-neutral-700">
            Tasks
          </Link>
          . Admins manage workspaces from Admin.
        </p>

        <section className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-end">
          <div className="flex w-full flex-col gap-1.5 sm:w-72">
            <label htmlFor="project" className="text-xs font-medium text-neutral-600">
              Project
            </label>
            <select
              id="project"
              className="input-field"
              disabled={loadingProjects || projects.length === 0}
              value={projectId ?? ""}
              onChange={(e) => onProjectChange(e.target.value)}
            >
              {projects.length === 0 ? (
                <option value="">No projects yet</option>
              ) : (
                projects.map((p) => (
                  <option key={p.projectId} value={p.projectId}>
                    {p.name} ({p.code}) · {p.role}
                  </option>
                ))
              )}
            </select>
          </div>
        </section>

        {loadError ? (
          <p className="rounded-lg border border-neutral-200 bg-neutral-50 px-4 py-3 text-sm text-neutral-800">
            {loadError}
          </p>
        ) : null}

        {loadingProjects ? (
          <OverviewSkeleton />
        ) : projects.length === 0 ? (
          <section className="card-elevated p-8 text-center">
            <p className="text-sm font-medium text-neutral-900">No projects</p>
            <p className="mt-2 text-sm text-neutral-500">
              When you’re added to a project, it will appear here. Admins can set things up from Admin.
            </p>
          </section>
        ) : (
          <>
            {selected ? (
              <p className="text-xs text-neutral-500">
                Workspace: <span className="font-medium text-neutral-700">{selected.workspaceName}</span>
                {" · "}
                Project state: <span className="font-medium text-neutral-700">{selected.state}</span>
              </p>
            ) : null}

            {loadingDetail ? (
              <OverviewSkeleton />
            ) : (
              <>
                {overview ? (
                  <>
                    <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
                      {[
                        { label: "Total Tasks", value: overview.kpis.totalTasks },
                        { label: "Open Tasks", value: overview.kpis.openTasks },
                        { label: "Due Today", value: overview.kpis.dueTodayTasks },
                        { label: "Overdue", value: overview.kpis.overdueTasks },
                        { label: "Completed (7d)", value: overview.kpis.completedThisWeek },
                        { label: "Milestones Active", value: overview.kpis.milestonesInProgress },
                        { label: "Pending Payments", value: overview.kpis.pendingPayments },
                      ].map((kpi) => (
                        <div key={kpi.label} className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
                          <p className="text-2xl font-semibold tabular-nums text-neutral-900">{kpi.value}</p>
                          <p className="mt-1 text-xs font-medium text-neutral-500">{kpi.label}</p>
                        </div>
                      ))}
                    </section>

                    <section className="grid gap-4 lg:grid-cols-2">
                      <div className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
                        <h3 className="text-sm font-semibold text-neutral-900">Task Status Distribution</h3>
                        <p className="mt-1 text-xs text-neutral-500">Current project workload by state</p>
                        <div className="mt-4 space-y-2">
                          {overview.statusBreakdown.map((row) => (
                            <div key={row.state}>
                              <div className="mb-1 flex items-center justify-between text-xs">
                                <span className="text-neutral-600">{taskStateLabel(row.state)}</span>
                                <span className="font-medium tabular-nums text-neutral-800">{row.count}</span>
                              </div>
                              <div className="h-2 rounded-full bg-neutral-100">
                                <div
                                  className="h-2 rounded-full bg-neutral-900"
                                  style={{ width: `${maxStatus === 0 ? 0 : (row.count / maxStatus) * 100}%` }}
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
                        <h3 className="text-sm font-semibold text-neutral-900">Completion Trend (14 Days)</h3>
                        <p className="mt-1 text-xs text-neutral-500">Approved tasks over time</p>
                        <div className="mt-4">
                          <div className="flex h-40 items-end gap-1">
                            {overview.completionTrend.map((p) => (
                              <div key={p.day} className="flex flex-1 flex-col items-center justify-end gap-1">
                                <div
                                  className="w-full rounded-t bg-neutral-900/80"
                                  style={{ height: `${maxTrend === 0 ? 4 : Math.max((p.completed / maxTrend) * 140, 4)}px` }}
                                  title={`${p.day}: ${p.completed}`}
                                />
                                <span className="text-[10px] text-neutral-400">{p.day.slice(5)}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </section>

                    <section className="grid gap-4 lg:grid-cols-3">
                      <div className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm lg:col-span-2">
                        <h3 className="text-sm font-semibold text-neutral-900">Recent Activity</h3>
                        <p className="mt-1 text-xs text-neutral-500">Latest task updates in this project</p>
                        {overview.recentTasks.length === 0 ? (
                          <p className="mt-4 text-sm text-neutral-500">No recent task activity.</p>
                        ) : (
                          <ul className="mt-4 space-y-2">
                            {overview.recentTasks.map((t) => (
                              <li key={t.id} className="rounded-lg border border-neutral-100 bg-neutral-50 px-3 py-2">
                                <p className="text-sm font-medium text-neutral-900">{t.title}</p>
                                <p className="mt-0.5 text-xs text-neutral-600">
                                  {taskStateLabel(t.state)} · {t.section.milestone.name} / {t.section.name} · Updated{" "}
                                  {new Date(t.updatedAt).toLocaleDateString()}
                                </p>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>

                      <div className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
                        <h3 className="text-sm font-semibold text-neutral-900">Quick Actions</h3>
                        <div className="mt-3 space-y-2">
                          <a href="/admin" className="block rounded-md border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm font-medium text-neutral-800 hover:bg-neutral-100">
                            Open Admin Setup
                          </a>
                          <a href="/dashboard/tasks" className="block rounded-md border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm font-medium text-neutral-800 hover:bg-neutral-100">
                            View All Tasks
                          </a>
                          <a href="/dashboard/projects" className="block rounded-md border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm font-medium text-neutral-800 hover:bg-neutral-100">
                            Browse Projects
                          </a>
                        </div>
                        {overview.project ? (
                          <div className="mt-4 rounded-md border border-neutral-100 bg-neutral-50 p-3">
                            <p className="text-xs text-neutral-500">Current Project</p>
                            <p className="text-sm font-semibold text-neutral-900">
                              {overview.project.name} ({overview.project.code})
                            </p>
                            <p className="mt-1 text-xs text-neutral-600">
                              Client: {overview.project.client.name} · State: {overview.project.state}
                            </p>
                          </div>
                        ) : null}
                      </div>
                    </section>
                  </>
                ) : null}

                <section>
                  <h3 className="mb-3 text-sm font-semibold text-neutral-900">My tasks</h3>
                  <AssignmentsTable rows={assignments} empty="No tasks assigned to you in this project." />
                </section>

                <section>
                  <h3 className="mb-3 text-sm font-semibold text-neutral-900">Review queue</h3>
                  <p className="mb-3 text-xs text-neutral-500">Tasks where you’re set as internal reviewer.</p>
                  <AssignmentsTable rows={reviews} empty="No review assignments." />
                </section>
              </>
            )}

            <section className="card-elevated border-dashed p-6">
              <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Session</p>
              <p className="mt-1 text-sm text-neutral-700">
                Signed in as{" "}
                <span className="font-medium text-neutral-900">{user?.email ?? "—"}</span> · Role{" "}
                <span className="font-medium">{user?.role ?? "—"}</span>
              </p>
            </section>
          </>
        )}
    </div>
  );
}

function OverviewSkeleton() {
  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
            <Skeleton className="h-8 w-14" />
            <Skeleton className="mt-2 h-3 w-24" />
          </div>
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
          <Skeleton className="h-4 w-48" />
          <Skeleton className="mt-2 h-3 w-36" />
          <div className="mt-4 space-y-2">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
          </div>
        </div>
        <div className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
          <Skeleton className="h-4 w-44" />
          <Skeleton className="mt-2 h-3 w-32" />
          <Skeleton className="mt-4 h-40 w-full" />
        </div>
      </div>
    </div>
  );
}

function AssignmentsTable({
  rows,
  empty,
}: {
  rows: AssignmentTaskPayload[];
  empty: string;
}) {
  if (rows.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-neutral-200 bg-neutral-50/80 px-4 py-6 text-center text-sm text-neutral-500">
        {empty}
      </p>
    );
  }
  return (
    <div className="overflow-x-auto rounded-xl border border-neutral-200 bg-white shadow-sm">
      <table className="w-full min-w-[640px] text-left text-sm">
        <thead className="border-b border-neutral-200 bg-neutral-50 text-xs font-semibold uppercase tracking-wide text-neutral-500">
          <tr>
            <th className="px-4 py-3">Task</th>
            <th className="px-4 py-3">State</th>
            <th className="px-4 py-3">Milestone</th>
            <th className="px-4 py-3">Section</th>
            <th className="px-4 py-3">Due</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-neutral-100">
          {rows.map((row) => (
            <tr key={row.assignmentId} className="hover:bg-neutral-50/80">
              <td className="px-4 py-3 font-medium text-neutral-900">{row.task.title}</td>
              <td className="px-4 py-3 text-neutral-700">{taskStateLabel(row.task.state)}</td>
              <td className="px-4 py-3 text-neutral-600">{row.task.milestone.name}</td>
              <td className="px-4 py-3 text-neutral-600">{row.task.section.name}</td>
              <td className="px-4 py-3 tabular-nums text-neutral-600">{formatDue(row.task.dueDate)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
