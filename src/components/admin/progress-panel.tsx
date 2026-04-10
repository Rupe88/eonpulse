"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";
import { ApiError } from "@/lib/api/http";
import { listMyProjects, type MyProjectRow } from "@/lib/api/workspace";
import {
  getPortfolioProgress,
  getProjectProgress,
  type PortfolioProgressPayload,
  type ProjectProgressPayload,
} from "@/lib/api/project-progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";

function errorMessage(e: unknown): string {
  if (e instanceof ApiError) return e.message;
  if (e instanceof Error) return e.message;
  return "Failed to load project progress";
}

function healthTone(health: ProjectProgressPayload["summary"]["health"]) {
  if (health === "HEALTHY") return "text-emerald-700 bg-emerald-50 border-emerald-200";
  if (health === "WATCH") return "text-amber-700 bg-amber-50 border-amber-200";
  return "text-red-700 bg-red-50 border-red-200";
}

export function ProgressPanel() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { accessToken } = useAuth();
  const token = accessToken ?? "";

  const [projects, setProjects] = useState<MyProjectRow[]>([]);
  const [projectId, setProjectId] = useState("");
  const [payload, setPayload] = useState<ProjectProgressPayload | null>(null);
  const [portfolio, setPortfolio] = useState<PortfolioProgressPayload | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingPortfolio, setLoadingPortfolio] = useState(false);
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copyStatus, setCopyStatus] = useState<"idle" | "copied" | "failed">("idle");
  const [portfolioFilters, setPortfolioFilters] = useState<{
    workspaceId: string;
    clientId: string;
    state: string;
    dueFrom: string;
    dueTo: string;
  }>({
    workspaceId: "",
    clientId: "",
    state: "",
    dueFrom: "",
    dueTo: "",
  });

  useEffect(() => {
    const next = {
      workspaceId: searchParams.get("workspaceId") ?? "",
      clientId: searchParams.get("clientId") ?? "",
      state: searchParams.get("state") ?? "",
      dueFrom: searchParams.get("dueFrom") ?? "",
      dueTo: searchParams.get("dueTo") ?? "",
    };
    setPortfolioFilters((prev) => {
      if (
        prev.workspaceId === next.workspaceId &&
        prev.clientId === next.clientId &&
        prev.state === next.state &&
        prev.dueFrom === next.dueFrom &&
        prev.dueTo === next.dueTo
      ) {
        return prev;
      }
      return next;
    });
  }, [searchParams]);

  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString());
    const apply = (key: string, value: string) => {
      if (value) params.set(key, value);
      else params.delete(key);
    };
    apply("workspaceId", portfolioFilters.workspaceId);
    apply("clientId", portfolioFilters.clientId);
    apply("state", portfolioFilters.state);
    apply("dueFrom", portfolioFilters.dueFrom);
    apply("dueTo", portfolioFilters.dueTo);
    const query = params.toString();
    const current = searchParams.toString();
    if (query === current) return;
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }, [portfolioFilters, pathname, router, searchParams]);

  useEffect(() => {
    if (!token) return;
    void (async () => {
      setLoadingProjects(true);
      try {
        const p = await listMyProjects(token);
        setProjects(p);
        setProjectId((prev) => prev || p[0]?.projectId || "");
      } catch (e) {
        setError(errorMessage(e));
      } finally {
        setLoadingProjects(false);
      }
    })();
  }, [token]);

  useEffect(() => {
    if (!token) return;
    void (async () => {
      setLoadingPortfolio(true);
      try {
        const res = await getPortfolioProgress(token, {
          workspaceId: portfolioFilters.workspaceId || undefined,
          clientId: portfolioFilters.clientId || undefined,
          state: portfolioFilters.state || undefined,
          dueFrom: portfolioFilters.dueFrom || undefined,
          dueTo: portfolioFilters.dueTo || undefined,
        });
        setPortfolio(res);
      } catch (e) {
        setError(errorMessage(e));
      } finally {
        setLoadingPortfolio(false);
      }
    })();
  }, [token, portfolioFilters]);

  useEffect(() => {
    if (!token || !projectId) return;
    void (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await getProjectProgress(projectId, token);
        setPayload(res);
      } catch (e) {
        setError(errorMessage(e));
      } finally {
        setLoading(false);
      }
    })();
  }, [token, projectId]);

  const milestoneRows = useMemo(() => payload?.milestones ?? [], [payload]);
  const maxTrend = Math.max(...(portfolio?.completionTrend.map((x) => x.completed) ?? [1]));

  function downloadCsv(filename: string, headers: string[], rows: Array<Array<string | number>>) {
    const csv = [
      headers.join(","),
      ...rows.map((r) => r.map((x) => `"${String(x).replace(/"/g, '""')}"`).join(",")),
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  function exportRankingCsv() {
    if (!portfolio) return;
    downloadCsv(
      `portfolio-project-ranking-${new Date().toISOString().slice(0, 10)}.csv`,
      ["Project", "Code", "Workspace", "Client", "State", "Health", "Risk Score", "Completion %", "Overdue", "Blockers", "Review Pending", "Payments Pending", "Approved 7d"],
      portfolio.projectRankings.map((r) => [
        r.name,
        r.code,
        r.workspace.name,
        r.client.name,
        r.state,
        r.health,
        r.riskScore,
        r.completionPct,
        r.overdueTasks,
        r.blockerThreads,
        r.reviewPending,
        r.paymentsPending,
        r.completed7d,
      ]),
    );
  }

  function exportThroughputCsv() {
    if (!portfolio) return;
    downloadCsv(
      `portfolio-team-throughput-${new Date().toISOString().slice(0, 10)}.csv`,
      ["Name", "Email", "Approved Tasks (7d)"],
      portfolio.teamThroughput.map((t) => [t.name, t.email, t.approvedTasks]),
    );
  }

  function resetPortfolioFilters() {
    setPortfolioFilters({
      workspaceId: "",
      clientId: "",
      state: "",
      dueFrom: "",
      dueTo: "",
    });
  }

  async function copyFilteredViewLink() {
    try {
      if (typeof window === "undefined") return;
      await navigator.clipboard.writeText(window.location.href);
      setCopyStatus("copied");
    } catch {
      setCopyStatus("failed");
    } finally {
      window.setTimeout(() => setCopyStatus("idle"), 1800);
    }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm">
        <h3 className="text-sm font-semibold text-neutral-900">Portfolio Overview</h3>
        <p className="mt-1 text-xs text-neutral-500">Multi-project health, throughput, risk ranking, and completion trend.</p>
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-7">
          <select
            value={portfolioFilters.workspaceId}
            onChange={(e) => setPortfolioFilters((p) => ({ ...p, workspaceId: e.target.value }))}
            className="rounded-md border border-neutral-300 px-3 py-2 text-sm"
          >
            <option value="">All workspaces</option>
            {(portfolio?.filters?.options?.workspaces ?? []).map((w) => (
              <option key={w.id} value={w.id}>
                {w.name}
              </option>
            ))}
          </select>
          <select
            value={portfolioFilters.clientId}
            onChange={(e) => setPortfolioFilters((p) => ({ ...p, clientId: e.target.value }))}
            className="rounded-md border border-neutral-300 px-3 py-2 text-sm"
          >
            <option value="">All clients</option>
            {(portfolio?.filters?.options?.clients ?? []).map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <select
            value={portfolioFilters.state}
            onChange={(e) => setPortfolioFilters((p) => ({ ...p, state: e.target.value }))}
            className="rounded-md border border-neutral-300 px-3 py-2 text-sm"
          >
            <option value="">All states</option>
            {(portfolio?.filters?.options?.states ?? []).map((state) => (
              <option key={state} value={state}>
                {state}
              </option>
            ))}
          </select>
          <input
            type="date"
            value={portfolioFilters.dueFrom}
            onChange={(e) => setPortfolioFilters((p) => ({ ...p, dueFrom: e.target.value }))}
            className="rounded-md border border-neutral-300 px-3 py-2 text-sm"
            aria-label="Due date from"
          />
          <input
            type="date"
            value={portfolioFilters.dueTo}
            onChange={(e) => setPortfolioFilters((p) => ({ ...p, dueTo: e.target.value }))}
            className="rounded-md border border-neutral-300 px-3 py-2 text-sm"
            aria-label="Due date to"
          />
          <button
            type="button"
            onClick={resetPortfolioFilters}
            className="rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm font-semibold text-neutral-700"
          >
            Reset filters
          </button>
          <button
            type="button"
            onClick={() => void copyFilteredViewLink()}
            className="rounded-md border border-neutral-900 bg-neutral-900 px-3 py-2 text-sm font-semibold text-white"
          >
            {copyStatus === "copied"
              ? "Link copied"
              : copyStatus === "failed"
                ? "Copy failed"
                : "Copy filtered view"}
          </button>
        </div>
        {loadingPortfolio ? (
          <div className="mt-4">
            <PortfolioSkeleton />
          </div>
        ) : portfolio ? (
          <div className="mt-4 space-y-4">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
              {[
                ["Projects", portfolio.summary.projectsCount],
                ["Total Tasks", portfolio.summary.totalTasks],
                ["Approved", portfolio.summary.approvedTasks],
                ["Open", portfolio.summary.openTasks],
                ["Overdue", portfolio.summary.overdueTasks],
                ["Avg Completion %", portfolio.summary.avgCompletionPct],
                ["Avg Risk Score", portfolio.summary.avgRiskScore],
              ].map(([label, value]) => (
                <article key={label} className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
                  <p className="text-2xl font-semibold tabular-nums text-neutral-900">{value}</p>
                  <p className="mt-1 text-xs text-neutral-500">{label}</p>
                </article>
              ))}
            </div>

            <div className="grid gap-4 lg:grid-cols-3">
              <div className="rounded-xl border border-neutral-200 p-4 lg:col-span-2">
                <h4 className="text-sm font-semibold text-neutral-900">Portfolio Completion Trend (14d)</h4>
                <div className="mt-3 flex h-40 items-end gap-1">
                  {portfolio.completionTrend.map((p) => (
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
              <div className="rounded-xl border border-neutral-200 p-4">
                <h4 className="text-sm font-semibold text-neutral-900">Top Risk Projects</h4>
                <ul className="mt-3 space-y-2">
                  {portfolio.topRisks.map((r) => (
                    <li key={r.id} className="rounded-md border border-neutral-100 bg-neutral-50 px-3 py-2">
                      <p className="text-sm font-medium text-neutral-900">{r.name} ({r.code})</p>
                      <p className="mt-0.5 text-xs text-neutral-600">
                        Risk {r.riskScore} · Overdue {r.overdueTasks} · Blockers {r.blockerThreads}
                      </p>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <div className="rounded-xl border border-neutral-200 p-4">
                <div className="flex items-center justify-between gap-2">
                  <h4 className="text-sm font-semibold text-neutral-900">Project Ranking (Risk First)</h4>
                  <button
                    type="button"
                    onClick={exportRankingCsv}
                    className="rounded-md border border-neutral-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-neutral-700"
                  >
                    Export CSV
                  </button>
                </div>
                <div className="mt-3 overflow-x-auto">
                  <table className="w-full min-w-[760px] text-left text-sm">
                    <thead className="border-b border-neutral-200 bg-neutral-50 text-xs font-semibold uppercase tracking-wide text-neutral-500">
                      <tr>
                        <th className="px-3 py-2">Project</th>
                        <th className="px-3 py-2">Health</th>
                        <th className="px-3 py-2">Completion</th>
                        <th className="px-3 py-2">Overdue</th>
                        <th className="px-3 py-2">Blockers</th>
                        <th className="px-3 py-2">7d Throughput</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-100">
                      {portfolio.projectRankings.map((r) => (
                        <tr key={r.id} className="hover:bg-neutral-50/70">
                          <td className="px-3 py-2">
                            <p className="font-medium text-neutral-900">{r.name} ({r.code})</p>
                            <p className="text-xs text-neutral-500">{r.workspace.name} · {r.client.name}</p>
                          </td>
                          <td className="px-3 py-2">
                            <span className={`rounded-full border px-2 py-0.5 text-xs font-semibold ${healthTone(r.health)}`}>
                              {r.health.replace("_", " ")}
                            </span>
                          </td>
                          <td className="px-3 py-2 tabular-nums text-neutral-700">{r.completionPct}%</td>
                          <td className="px-3 py-2 tabular-nums text-neutral-700">{r.overdueTasks}</td>
                          <td className="px-3 py-2 tabular-nums text-neutral-700">{r.blockerThreads}</td>
                          <td className="px-3 py-2 tabular-nums text-neutral-700">{r.completed7d}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              <div className="rounded-xl border border-neutral-200 p-4">
                <div className="flex items-center justify-between gap-2">
                  <h4 className="text-sm font-semibold text-neutral-900">Team Throughput (7d)</h4>
                  <button
                    type="button"
                    onClick={exportThroughputCsv}
                    className="rounded-md border border-neutral-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-neutral-700"
                  >
                    Export CSV
                  </button>
                </div>
                <div className="mt-3 overflow-x-auto">
                  <table className="w-full min-w-[420px] text-left text-sm">
                    <thead className="border-b border-neutral-200 bg-neutral-50 text-xs font-semibold uppercase tracking-wide text-neutral-500">
                      <tr>
                        <th className="px-3 py-2">Member</th>
                        <th className="px-3 py-2">Email</th>
                        <th className="px-3 py-2">Approved Tasks</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-100">
                      {portfolio.teamThroughput.map((t) => (
                        <tr key={t.userId} className="hover:bg-neutral-50/70">
                          <td className="px-3 py-2 font-medium text-neutral-900">{t.name}</td>
                          <td className="px-3 py-2 text-neutral-600">{t.email}</td>
                          <td className="px-3 py-2 tabular-nums text-neutral-700">{t.approvedTasks}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </section>

      <section className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-end gap-3">
          <div className="w-full max-w-sm">
            <label htmlFor="project-progress" className="mb-1 block text-xs font-semibold uppercase tracking-wide text-neutral-500">
              Project
            </label>
            <select
              id="project-progress"
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              disabled={loadingProjects || projects.length === 0}
              className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
            >
              <option value="">{projects.length ? "Select project" : "No project available"}</option>
              {projects.map((p) => (
                <option key={p.projectId} value={p.projectId}>
                  {p.name} ({p.code})
                </option>
              ))}
            </select>
          </div>
          {payload?.summary ? (
            <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${healthTone(payload.summary.health)}`}>
              Health: {payload.summary.health.replace("_", " ")} (Risk {payload.summary.riskScore}/100)
            </span>
          ) : null}
        </div>

        {error ? <p className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p> : null}
      </section>

      {loading ? (
        <ProgressSkeleton />
      ) : payload ? (
        <>
          <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8">
            {[
              ["Total Tasks", payload.summary.totalTasks],
              ["Approved", payload.summary.approvedTasks],
              ["Open", payload.summary.openTasks],
              ["Completion %", payload.summary.completionPct],
              ["Overdue", payload.summary.overdueTasks],
              ["Blockers", payload.summary.blockerThreads],
              ["Review Pending", payload.summary.reviewPending],
              ["Payments Pending", payload.summary.paymentsPending],
            ].map(([label, value]) => (
              <article key={label} className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
                <p className="text-2xl font-semibold tabular-nums text-neutral-900">{value}</p>
                <p className="mt-1 text-xs text-neutral-500">{label}</p>
              </article>
            ))}
          </section>

          <section className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm">
            <h3 className="text-sm font-semibold text-neutral-900">Milestone Progress</h3>
            <p className="mt-1 text-xs text-neutral-500">Task completion, overdue pressure, and billing gate context per milestone.</p>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[980px] text-left text-sm">
                <thead className="border-b border-neutral-200 bg-neutral-50 text-xs font-semibold uppercase tracking-wide text-neutral-500">
                  <tr>
                    <th className="px-3 py-2">Milestone</th>
                    <th className="px-3 py-2">State</th>
                    <th className="px-3 py-2">Tasks</th>
                    <th className="px-3 py-2">Approved</th>
                    <th className="px-3 py-2">Overdue</th>
                    <th className="px-3 py-2">Completion</th>
                    <th className="px-3 py-2">Payment Gate</th>
                    <th className="px-3 py-2">Billing</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {milestoneRows.map((m) => (
                    <tr key={m.id} className="hover:bg-neutral-50/70">
                      <td className="px-3 py-2 font-medium text-neutral-900">{m.orderNo}. {m.name}</td>
                      <td className="px-3 py-2 text-neutral-700">{m.state}</td>
                      <td className="px-3 py-2 tabular-nums text-neutral-700">{m.totalTasks}</td>
                      <td className="px-3 py-2 tabular-nums text-neutral-700">{m.approvedTasks}</td>
                      <td className="px-3 py-2 tabular-nums text-neutral-700">{m.overdueTasks}</td>
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-2">
                          <div className="h-2 w-28 overflow-hidden rounded-full bg-neutral-100">
                            <div className="h-full rounded-full bg-neutral-900" style={{ width: `${m.completionPct}%` }} />
                          </div>
                          <span className="text-xs tabular-nums text-neutral-700">{m.completionPct}%</span>
                        </div>
                      </td>
                      <td className="px-3 py-2 text-neutral-700">{m.paymentGateMode}</td>
                      <td className="px-3 py-2 text-neutral-700">
                        {m.billingAmount ? `${m.billingAmount} (${m.paymentDueDays ?? 0}d)` : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {milestoneRows.length === 0 ? (
              <p className="mt-4 rounded-md border border-dashed border-neutral-200 bg-neutral-50 px-3 py-4 text-sm text-neutral-500">
                No milestones configured yet for this project.
              </p>
            ) : null}
          </section>
        </>
      ) : loadingProjects ? (
        <div className="flex justify-center py-12">
          <Spinner />
        </div>
      ) : null}
    </div>
  );
}

function ProgressSkeleton() {
  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
            <Skeleton className="h-7 w-12" />
            <Skeleton className="mt-2 h-3 w-20" />
          </div>
        ))}
      </div>
      <div className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm space-y-2">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-3 w-64" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    </div>
  );
}

function PortfolioSkeleton() {
  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
            <Skeleton className="h-7 w-12" />
            <Skeleton className="mt-2 h-3 w-20" />
          </div>
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
          <Skeleton className="h-4 w-48" />
          <Skeleton className="mt-3 h-32 w-full" />
        </div>
        <div className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
          <Skeleton className="h-4 w-36" />
          <Skeleton className="mt-3 h-8 w-full" />
          <Skeleton className="mt-2 h-8 w-full" />
          <Skeleton className="mt-2 h-8 w-full" />
        </div>
      </div>
    </div>
  );
}
