"use client";

import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/contexts/auth-context";
import { ApiError } from "@/lib/api/http";
import { listMyProjects, type MyProjectRow } from "@/lib/api/workspace";
import { getClientDashboard } from "@/lib/api/dashboard-client";
import { clientApproveTask, clientCommentOnTask } from "@/lib/api/reviews";
import { listReviewQueue, type ReviewQueueItem } from "@/lib/api/reviews";

function em(e: unknown): string {
  if (e instanceof ApiError) return e.message;
  if (e instanceof Error) return e.message;
  return "Something went wrong";
}

export function ClientWorkspacePanel() {
  const { accessToken, user } = useAuth();
  const token = accessToken ?? "";
  const [projects, setProjects] = useState<MyProjectRow[]>([]);
  const [projectId, setProjectId] = useState("");
  const [dashboard, setDashboard] = useState<Awaited<ReturnType<typeof getClientDashboard>> | null>(null);
  const [tasks, setTasks] = useState<ReviewQueueItem[]>([]);
  const [commentBody, setCommentBody] = useState("");
  const [activeTaskId, setActiveTaskId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    void (async () => {
      try {
        const p = await listMyProjects(token);
        setProjects(p);
        setProjectId((prev) => prev || p[0]?.projectId || "");
      } catch (e) {
        setError(em(e));
      }
    })();
  }, [token]);

  useEffect(() => {
    if (!token || !projectId) return;
    void (async () => {
      try {
        setError(null);
        const [d, queue] = await Promise.all([
          getClientDashboard(projectId, token),
          listReviewQueue(token, projectId, "client", "false"),
        ]);
        setDashboard(d);
        const reviewable = queue.filter((q) => q.taskId && q.task);
        setTasks(reviewable);
        setActiveTaskId((prev) => prev || reviewable[0]?.taskId || "");
      } catch (e) {
        setError(em(e));
      }
    })();
  }, [token, projectId]);

  const activeTask = useMemo(
    () => tasks.find((t) => t.taskId === activeTaskId),
    [tasks, activeTaskId],
  );

  async function onComment() {
    if (!token || !activeTaskId || !commentBody.trim()) return;
    try {
      setError(null);
      setOk(null);
      await clientCommentOnTask(token, activeTaskId, commentBody.trim());
      setOk("Comment sent to delivery team.");
      setCommentBody("");
      const d = await getClientDashboard(projectId, token);
      setDashboard(d);
    } catch (e) {
      setError(em(e));
    }
  }

  async function onApprove() {
    if (!token || !activeTaskId) return;
    try {
      setError(null);
      setOk(null);
      await clientApproveTask(token, activeTaskId, "Approved from client workspace");
      setOk("Task approved.");
      const [d, queue] = await Promise.all([
        getClientDashboard(projectId, token),
        listReviewQueue(token, projectId, "client", "false"),
      ]);
      setDashboard(d);
      const reviewable = queue.filter((q) => q.taskId && q.task);
      setTasks(reviewable);
      setActiveTaskId(reviewable[0]?.taskId ?? "");
    } catch (e) {
      setError(em(e));
    }
  }

  const globalRole = String(user?.role ?? "").toUpperCase();
  const isOpsView = globalRole === "ADMIN" || globalRole === "SUB_ADMIN";

  return (
    <div className="space-y-6">
      {isOpsView ? (
        <p className="rounded-lg border border-neutral-200 bg-neutral-50 px-4 py-3 text-sm text-neutral-700">
          <span className="font-semibold text-neutral-900">Operations view.</span> You can see client metrics and act on
          client review actions where you are a project member. Use only when supporting the client workflow.
        </p>
      ) : null}
      <div className="flex items-center gap-2">
        <select
          value={projectId}
          onChange={(e) => setProjectId(e.target.value)}
          className="rounded-md border border-neutral-300 px-3 py-2 text-sm"
        >
          <option value="">Select project</option>
          {projects.map((p) => (
            <option key={p.projectId} value={p.projectId}>
              {p.name} ({p.code})
            </option>
          ))}
        </select>
      </div>

      {error ? <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}
      {ok ? <p className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{ok}</p> : null}

      {dashboard ? (
        <>
          <section className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
            <h3 className="text-sm font-semibold text-neutral-900">Project snapshot</h3>
            {dashboard.project ? (
              <p className="mt-2 text-sm text-neutral-700">
                <span className="font-medium text-neutral-900">{dashboard.project.name}</span>{" "}
                <span className="text-neutral-500">({dashboard.project.code})</span>
                <span className="ml-2 rounded-md bg-neutral-100 px-2 py-0.5 text-xs font-medium text-neutral-700">
                  {dashboard.project.state.replace(/_/g, " ")}
                </span>
                {dashboard.project.dueDate ? (
                  <span className="ml-2 text-xs text-neutral-600">
                    Target {new Date(dashboard.project.dueDate).toLocaleDateString()}
                  </span>
                ) : null}
              </p>
            ) : (
              <p className="mt-2 text-sm text-neutral-500">No project metadata.</p>
            )}
            {dashboard.pendingClientReviewTasks > 0 ? (
              <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950">
                <span className="font-semibold">Next action:</span> You have{" "}
                <strong>{dashboard.pendingClientReviewTasks}</strong> task
                {dashboard.pendingClientReviewTasks === 1 ? "" : "s"} waiting for client review — use the section
                below to comment or approve.
              </p>
            ) : (
              <p className="mt-3 text-xs text-neutral-500">No client-review queue items right now.</p>
            )}
          </section>

          <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Metric label="Pending client reviews" value={dashboard.pendingClientReviewTasks} />
            <Metric label="Open blocker threads" value={dashboard.openBlockerThreads} />
            <Metric label="Recent deliverables" value={dashboard.deliverables.length} />
            <Metric label="Recent invoices" value={dashboard.invoices.length} />
          </section>

          {dashboard.milestones.length > 0 ? (
            <section className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
              <h3 className="text-sm font-semibold text-neutral-900">Milestones</h3>
              <ul className="mt-3 divide-y divide-neutral-100 border border-neutral-100 rounded-lg text-sm">
                {dashboard.milestones.map((m) => (
                  <li key={m.id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2.5">
                    <span className="font-medium text-neutral-900">
                      {m.orderNo}. {m.name}
                    </span>
                    <span className="rounded-md bg-neutral-100 px-2 py-0.5 text-xs font-medium text-neutral-700">
                      {m.state.replace(/_/g, " ")}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {dashboard.invoices.length > 0 ? (
            <section className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
              <h3 className="text-sm font-semibold text-neutral-900">Invoices</h3>
              <div className="mt-3 overflow-x-auto">
                <table className="w-full min-w-[480px] text-left text-sm">
                  <thead className="border-b border-neutral-200 text-xs font-semibold uppercase tracking-wide text-neutral-500">
                    <tr>
                      <th className="py-2 pr-3">Invoice</th>
                      <th className="py-2 pr-3">Amount</th>
                      <th className="py-2 pr-3">Due</th>
                      <th className="py-2">State</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100">
                    {dashboard.invoices.map((inv) => (
                      <tr key={inv.id}>
                        <td className="py-2 pr-3 font-mono text-xs text-neutral-800">{inv.invoiceNumber}</td>
                        <td className="py-2 pr-3 tabular-nums text-neutral-800">{inv.amount}</td>
                        <td className="py-2 pr-3 text-neutral-600">{new Date(inv.dueAt).toLocaleDateString()}</td>
                        <td className="py-2 text-neutral-600">{inv.state.replace(/_/g, " ")}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          ) : null}
        </>
      ) : null}

      <section className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
        <h3 className="text-sm font-semibold text-neutral-900">Reviewable tasks</h3>
        {tasks.length === 0 ? (
          <p className="mt-2 text-sm text-neutral-500">No tasks waiting for your review.</p>
        ) : (
          <div className="mt-3 space-y-3">
            <select
              value={activeTaskId}
              onChange={(e) => setActiveTaskId(e.target.value)}
              className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
            >
              {tasks.map((t) => (
                <option key={t.id} value={t.taskId ?? ""}>
                  {t.task?.title ?? "Task"} ({t.task?.state ?? "UNKNOWN"})
                </option>
              ))}
            </select>
            {activeTask ? (
              <div className="rounded-md border border-neutral-200 bg-neutral-50 p-3">
                <p className="text-sm font-medium text-neutral-900">{activeTask.task?.title ?? "Task"}</p>
                <p className="mt-1 text-xs text-neutral-600">
                  Queue type: {activeTask.isInternal ? "Internal" : "Client"} review
                </p>
                <textarea
                  value={commentBody}
                  onChange={(e) => setCommentBody(e.target.value)}
                  placeholder="Request changes or leave feedback"
                  className="mt-3 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
                  rows={3}
                />
                <div className="mt-3 flex gap-2">
                  <button onClick={() => void onComment()} className="rounded-md border border-neutral-200 bg-white px-3 py-2 text-xs font-semibold text-neutral-700">
                    Request changes
                  </button>
                  <button onClick={() => void onApprove()} className="rounded-md border border-neutral-900 bg-neutral-900 px-3 py-2 text-xs font-semibold text-white">
                    Approve task
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        )}
      </section>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
      <p className="text-2xl font-semibold tabular-nums text-neutral-900">{value}</p>
      <p className="mt-1 text-xs font-medium text-neutral-500">{label}</p>
    </div>
  );
}
