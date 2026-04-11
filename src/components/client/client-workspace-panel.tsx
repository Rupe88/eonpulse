"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/contexts/auth-context";
import { ApiError } from "@/lib/api/http";
import { listMyProjects, type MyProjectRow } from "@/lib/api/workspace";
import { getClientDashboard, type ClientDashboardPayload } from "@/lib/api/dashboard-client";
import { submitPayment } from "@/lib/api/billing";
import { clientApproveTask, clientCommentOnTask, listReviewQueue, type ReviewQueueItem } from "@/lib/api/reviews";
import { Spinner } from "@/components/ui/spinner";

function em(e: unknown): string {
  if (e instanceof ApiError) return e.message;
  if (e instanceof Error) return e.message;
  return "Something went wrong";
}

function formatMoney(amount: string): string {
  const n = Number(amount);
  if (Number.isNaN(n)) return amount;
  return new Intl.NumberFormat(undefined, { style: "currency", currency: "USD" }).format(n);
}

function friendlyInvoiceState(state: string): string {
  return state.replace(/_/g, " ");
}

function friendlyMilestoneState(state: string): string {
  return state.replace(/_/g, " ");
}

function taskStateLabel(state: string): string {
  const map: Record<string, string> = {
    READY_FOR_CLIENT_REVIEW: "Awaiting your review",
    CLIENT_COMMENTED: "Changes requested",
    APPROVED: "Approved",
    IN_PROGRESS: "In progress",
    IN_INTERNAL_REVIEW: "Internal review",
    REWORK_REQUESTED: "Rework in progress",
    FIX_IN_PROGRESS: "Fix in progress",
    BACKLOG: "Planned",
    ASSIGNED: "Assigned",
    BLOCKED: "Blocked",
  };
  return map[state] ?? state.replace(/_/g, " ");
}

function invoiceNeedsPayment(state: string): boolean {
  return state === "INVOICE_SENT" || state === "AWAITING_PAYMENT" || state === "OVERDUE";
}

function buildSummaryText(d: ClientDashboardPayload): string {
  const lines: string[] = [];
  lines.push(`Project: ${d.project?.name ?? "—"} (${d.project?.code ?? ""})`);
  lines.push(
    `Progress: ${d.projectProgress.percentComplete}% (${d.projectProgress.basis === "tasks" ? "by tasks" : "by milestones"})`,
  );
  if (d.currentMilestone) {
    lines.push(
      `Current milestone: ${d.currentMilestone.name} — ${friendlyMilestoneState(d.currentMilestone.state)}`,
    );
  }
  lines.push(`Pending approvals: ${d.pendingApprovalCount}`);
  lines.push(`Pending payments: ${d.pendingPaymentCount}`);
  lines.push("");
  lines.push("Invoices:");
  for (const inv of d.invoices) {
    lines.push(
      `  ${inv.invoiceNumber}  ${formatMoney(inv.amount)}  due ${new Date(inv.dueAt).toLocaleDateString()}  ${friendlyInvoiceState(inv.state)}`,
    );
  }
  lines.push("");
  lines.push(`Next suggested action: ${d.nextAction.title}`);
  if (d.nextAction.subtitle) lines.push(`  ${d.nextAction.subtitle}`);
  return lines.join("\n");
}

export function ClientWorkspacePanel() {
  const { accessToken, user } = useAuth();
  const token = accessToken ?? "";
  const [projects, setProjects] = useState<MyProjectRow[]>([]);
  const [projectId, setProjectId] = useState("");
  const [dashboard, setDashboard] = useState<ClientDashboardPayload | null>(null);
  const [tasks, setTasks] = useState<ReviewQueueItem[]>([]);
  const [commentBody, setCommentBody] = useState("");
  const [activeTaskId, setActiveTaskId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [payAmount, setPayAmount] = useState("");
  const [payRef, setPayRef] = useState("");
  const [payNote, setPayNote] = useState("");
  const [payInvoiceId, setPayInvoiceId] = useState<string | null>(null);
  const [payBusy, setPayBusy] = useState(false);
  const [loading, setLoading] = useState(false);

  const reviewRef = useRef<HTMLDivElement | null>(null);
  const invoicesRef = useRef<HTMLDivElement | null>(null);

  const loadAll = useCallback(async () => {
    if (!token || !projectId) return;
    setError(null);
    const [d, queue] = await Promise.all([
      getClientDashboard(projectId, token),
      listReviewQueue(token, projectId, "client", "false"),
    ]);
    setDashboard(d);
    const reviewable = queue.filter(
      (q) =>
        q.taskId &&
        q.task &&
        (q.task.state === "READY_FOR_CLIENT_REVIEW" || q.task.state === "CLIENT_COMMENTED"),
    );
    setTasks(reviewable);
    setActiveTaskId((prev) => {
      const still = reviewable.some((q) => q.taskId === prev);
      return still ? prev : reviewable[0]?.taskId ?? "";
    });
  }, [token, projectId]);

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
    if (!token || !projectId) {
      setDashboard(null);
      setTasks([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setDashboard(null);
    setTasks([]);
    setOk(null);
    void (async () => {
      try {
        setError(null);
        await loadAll();
      } catch (e) {
        setError(em(e));
        setDashboard(null);
        setTasks([]);
      } finally {
        setLoading(false);
      }
    })();
  }, [token, projectId, loadAll]);

  const activeTask = useMemo(
    () => tasks.find((t) => t.taskId === activeTaskId),
    [tasks, activeTaskId],
  );

  const canRequestChanges = activeTask?.task?.state === "READY_FOR_CLIENT_REVIEW";

  async function onComment() {
    if (!token || !activeTaskId || !commentBody.trim()) return;
    try {
      setError(null);
      setOk(null);
      setLoading(true);
      await clientCommentOnTask(token, activeTaskId, commentBody.trim());
      setOk("Your feedback was sent to the delivery team.");
      setCommentBody("");
      await loadAll();
    } catch (e) {
      setError(em(e));
    } finally {
      setLoading(false);
    }
  }

  async function onApprove() {
    if (!token || !activeTaskId) return;
    try {
      setError(null);
      setOk(null);
      setLoading(true);
      await clientApproveTask(token, activeTaskId, "Approved from client workspace");
      setOk("Thank you — this work is approved.");
      await loadAll();
    } catch (e) {
      setError(em(e));
    } finally {
      setLoading(false);
    }
  }

  async function onPay(invoiceId: string, defaultAmount: string) {
    if (!token) return;
    const amt = Number(payAmount || defaultAmount);
    if (!Number.isFinite(amt) || amt <= 0) {
      setError("Enter a valid payment amount.");
      return;
    }
    try {
      setPayBusy(true);
      setLoading(true);
      setError(null);
      setOk(null);
      await submitPayment(token, invoiceId, {
        amount: amt,
        transactionRef: payRef.trim() || undefined,
        note: payNote.trim() || undefined,
      });
      setOk("Payment submitted. Your finance contact will verify it shortly.");
      setPayInvoiceId(null);
      setPayAmount("");
      setPayRef("");
      setPayNote("");
      await loadAll();
    } catch (e) {
      setError(em(e));
    } finally {
      setPayBusy(false);
      setLoading(false);
    }
  }

  function downloadSummary() {
    if (!dashboard) return;
    const blob = new Blob([buildSummaryText(dashboard)], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `project-summary-${dashboard.project?.code ?? projectId}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function scrollToReview() {
    reviewRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function scrollToInvoices() {
    invoicesRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  const globalRole = String(user?.role ?? "").toUpperCase();
  const isOpsView = globalRole === "ADMIN" || globalRole === "SUB_ADMIN";
  const isPureClient = dashboard?.viewer === "CLIENT";

  const next = dashboard?.nextAction;

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      {isOpsView ? (
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          <span className="font-semibold">Operations preview.</span> You see the same summary the client sees. Use it only
          to support their workflow.
        </p>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <label className="flex min-w-[240px] flex-col gap-1">
          <span className="text-xs font-medium text-neutral-600">Project</span>
          <select
            value={projectId}
            onChange={(e) => setProjectId(e.target.value)}
            className="input-field text-sm"
          >
            <option value="">Select project</option>
            {projects.map((p) => (
              <option key={p.projectId} value={p.projectId}>
                {p.name} ({p.code})
              </option>
            ))}
          </select>
        </label>
        {dashboard ? (
          <button
            type="button"
            onClick={() => downloadSummary()}
            className="rounded-lg border border-neutral-300 bg-white px-4 py-2 text-sm font-medium text-neutral-800 shadow-sm hover:bg-neutral-50"
          >
            Download summary
          </button>
        ) : null}
      </div>

      {error ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p>
      ) : null}
      {ok ? (
        <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">{ok}</p>
      ) : null}

      {loading && !dashboard && projectId ? (
        <div className="flex min-h-[240px] flex-col items-center justify-center gap-3 rounded-2xl border border-neutral-200 bg-white py-16 shadow-sm">
          <Spinner />
          <p className="text-sm text-neutral-500">Loading your project overview…</p>
        </div>
      ) : null}

      {!loading && !dashboard && projectId && !error ? (
        <p className="text-sm text-neutral-500">No data for this project.</p>
      ) : null}

      {dashboard && next ? (
        <section className="rounded-2xl border border-neutral-200 bg-gradient-to-br from-neutral-50 to-white p-6 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Next step</p>
          <h2 className="mt-1 text-xl font-semibold text-neutral-900">{next.title}</h2>
          {next.subtitle ? <p className="mt-2 text-sm leading-relaxed text-neutral-600">{next.subtitle}</p> : null}

          <div className="mt-5 flex flex-wrap gap-2">
            {next.kind === "PAY_INVOICE" && next.invoiceId ? (
              <>
                <button
                  type="button"
                  onClick={() => {
                    setPayInvoiceId(next.invoiceId!);
                    setPayAmount(next.amount ?? "");
                    scrollToInvoices();
                  }}
                  className="rounded-lg bg-neutral-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-neutral-800"
                >
                  View invoice and pay
                </button>
                <button
                  type="button"
                  onClick={() => scrollToInvoices()}
                  className="rounded-lg border border-neutral-300 bg-white px-4 py-2.5 text-sm font-medium text-neutral-800 hover:bg-neutral-50"
                >
                  Open invoice list
                </button>
              </>
            ) : null}
            {next.kind === "REVIEW_TASKS" ? (
              <button
                type="button"
                onClick={() => scrollToReview()}
                className="rounded-lg bg-neutral-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-neutral-800"
              >
                Review work
              </button>
            ) : null}
            {next.kind === "REVIEW_MILESTONE" ? (
              <p className="text-sm text-neutral-600">
                Check the <strong>Milestones</strong> section below for items marked “sent to client review”, or ask your
                delivery contact for a walkthrough.
              </p>
            ) : null}
            {next.kind === "NONE" && isPureClient ? (
              <p className="text-sm text-neutral-600">No urgent actions right now.</p>
            ) : null}
          </div>
        </section>
      ) : null}

      {dashboard ? (
        <>
          <div className="grid gap-4 lg:grid-cols-2">
            <section className="card-elevated flex flex-col justify-between p-6">
              <div>
                <h3 className="text-sm font-semibold text-neutral-900">Overall progress</h3>
                <p className="mt-1 text-xs text-neutral-500">
                  {dashboard.projectProgress.basis === "tasks"
                    ? "Share of project tasks marked complete."
                    : "Share of milestones completed (no tasks yet in this project)."}
                </p>
              </div>
              <div className="mt-6 flex items-end gap-4">
                <p className="text-5xl font-semibold tabular-nums text-neutral-900">
                  {dashboard.projectProgress.percentComplete}
                  <span className="text-2xl font-medium text-neutral-400">%</span>
                </p>
                <div className="pb-1 text-xs text-neutral-600">
                  {dashboard.projectProgress.basis === "tasks" ? (
                    <>
                      {dashboard.projectProgress.completedTasks} / {dashboard.projectProgress.totalTasks} tasks
                    </>
                  ) : (
                    <>
                      {dashboard.projectProgress.completedMilestones} / {dashboard.projectProgress.totalMilestones}{" "}
                      milestones
                    </>
                  )}
                </div>
              </div>
            </section>

            <section className="card-elevated p-6">
              <h3 className="text-sm font-semibold text-neutral-900">Current milestone</h3>
              {dashboard.currentMilestone ? (
                <>
                  <p className="mt-3 text-lg font-medium text-neutral-900">{dashboard.currentMilestone.name}</p>
                  <p className="mt-1 text-sm text-neutral-600">
                    {friendlyMilestoneState(dashboard.currentMilestone.state)}
                  </p>
                </>
              ) : (
                <p className="mt-3 text-sm text-neutral-500">No active milestone yet.</p>
              )}
            </section>
          </div>

          <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Metric label="Pending your approval" value={dashboard.pendingApprovalCount} hint="Reviews + milestone sign-offs" />
            <Metric label="Payment due" value={dashboard.pendingPaymentCount} hint="Outstanding invoices" />
            <Metric label="In client review" value={dashboard.pendingClientReviewTasks} hint="Tasks waiting for you" />
            {!isPureClient && dashboard.openBlockerThreads !== undefined ? (
              <Metric label="Open blockers (internal)" value={dashboard.openBlockerThreads} hint="Not shown to clients" />
            ) : (
              <Metric label="Latest deliverables" value={dashboard.deliverables.length} hint="Files shared with you" />
            )}
          </section>

          {dashboard.project ? (
            <p className="text-sm text-neutral-600">
              <span className="font-medium text-neutral-900">{dashboard.project.name}</span>{" "}
              <span className="text-neutral-400">({dashboard.project.code})</span>
              {dashboard.project.dueDate ? (
                <span className="ml-2 text-neutral-500">
                  · Target {new Date(dashboard.project.dueDate).toLocaleDateString()}
                </span>
              ) : null}
            </p>
          ) : null}

          {dashboard.milestones.length > 0 ? (
            <section className="card-elevated p-6">
              <h3 className="text-sm font-semibold text-neutral-900">Milestones</h3>
              <ul className="mt-3 divide-y divide-neutral-100 rounded-xl border border-neutral-100">
                {dashboard.milestones.map((m) => (
                  <li key={m.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm">
                    <span className="font-medium text-neutral-900">
                      {m.orderNo}. {m.name}
                    </span>
                    <span className="rounded-md bg-neutral-100 px-2 py-0.5 text-xs font-medium text-neutral-700">
                      {friendlyMilestoneState(m.state)}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {dashboard.deliverables.length > 0 ? (
            <section className="card-elevated p-6">
              <h3 className="text-sm font-semibold text-neutral-900">Latest deliverables</h3>
              <ul className="mt-4 space-y-3">
                {dashboard.deliverables.map((d) => (
                  <li
                    key={d.id}
                    className="flex flex-col gap-2 rounded-xl border border-neutral-100 bg-neutral-50/50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <p className="font-medium text-neutral-900">{d.title}</p>
                      <p className="text-xs text-neutral-500">
                        {d.contextLabel} · Updated {new Date(d.updatedAt).toLocaleString()}
                      </p>
                      {d.summary ? <p className="mt-1 text-sm text-neutral-600">{d.summary}</p> : null}
                    </div>
                    <div className="flex shrink-0 gap-2">
                      {d.latestVersion ? (
                        <a
                          href={d.latestVersion.fileUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="rounded-lg border border-neutral-300 bg-white px-3 py-2 text-xs font-semibold text-neutral-800 hover:bg-neutral-50"
                        >
                          Download (v{d.latestVersion.versionNo})
                        </a>
                      ) : (
                        <span className="text-xs text-neutral-400">No file yet</span>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          <section ref={invoicesRef} className="card-elevated scroll-mt-24 p-6">
            <h3 className="text-sm font-semibold text-neutral-900">Invoice history</h3>
            {dashboard.invoices.length === 0 ? (
              <p className="mt-3 text-sm text-neutral-500">No invoices yet.</p>
            ) : (
              <div className="mt-4 overflow-x-auto">
                <table className="w-full min-w-[640px] text-left text-sm">
                  <thead className="border-b border-neutral-200 text-xs font-semibold uppercase tracking-wide text-neutral-500">
                    <tr>
                      <th className="py-2 pr-3">Invoice</th>
                      <th className="py-2 pr-3">Milestone</th>
                      <th className="py-2 pr-3">Amount</th>
                      <th className="py-2 pr-3">Due</th>
                      <th className="py-2 pr-3">Status</th>
                      <th className="py-2 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100">
                    {dashboard.invoices.map((inv) => (
                      <tr key={inv.id} id={`invoice-${inv.id}`}>
                        <td className="py-3 pr-3 font-mono text-xs text-neutral-800">{inv.invoiceNumber}</td>
                        <td className="py-3 pr-3 text-neutral-700">{inv.milestoneName}</td>
                        <td className="py-3 pr-3 tabular-nums text-neutral-900">{formatMoney(inv.amount)}</td>
                        <td className="py-3 pr-3 text-neutral-600">{new Date(inv.dueAt).toLocaleDateString()}</td>
                        <td className="py-3 pr-3 text-neutral-600">{friendlyInvoiceState(inv.state)}</td>
                        <td className="py-3 text-right">
                          {invoiceNeedsPayment(inv.state) ? (
                            <button
                              type="button"
                              onClick={() => {
                                setPayInvoiceId(inv.id);
                                setPayAmount(inv.amount);
                              }}
                              className="text-xs font-semibold text-neutral-900 underline underline-offset-2 hover:text-neutral-600"
                            >
                              Pay now
                            </button>
                          ) : (
                            <span className="text-xs text-neutral-400">—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {payInvoiceId ? (
              <div className="mt-6 rounded-xl border border-neutral-200 bg-neutral-50 p-4">
                <p className="text-sm font-medium text-neutral-900">Submit payment</p>
                <p className="mt-1 text-xs text-neutral-600">
                  Enter the amount you are paying and any reference your bank shows (wire id, check #, etc.).
                </p>
                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  <label className="flex flex-col gap-1 text-xs font-medium text-neutral-600">
                    Amount
                    <input
                      className="input-field text-sm"
                      value={payAmount}
                      onChange={(e) => setPayAmount(e.target.value)}
                      inputMode="decimal"
                    />
                  </label>
                  <label className="flex flex-col gap-1 text-xs font-medium text-neutral-600">
                    Reference (optional)
                    <input
                      className="input-field text-sm"
                      value={payRef}
                      onChange={(e) => setPayRef(e.target.value)}
                    />
                  </label>
                  <label className="flex flex-col gap-1 text-xs font-medium text-neutral-600 sm:col-span-1">
                    Note (optional)
                    <input
                      className="input-field text-sm"
                      value={payNote}
                      onChange={(e) => setPayNote(e.target.value)}
                    />
                  </label>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={payBusy}
                    onClick={() => payInvoiceId && void onPay(payInvoiceId, payAmount)}
                    className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                  >
                    {payBusy ? "Submitting…" : "Submit payment"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setPayInvoiceId(null);
                      setPayRef("");
                      setPayNote("");
                    }}
                    className="rounded-lg border border-neutral-300 bg-white px-4 py-2 text-sm font-medium text-neutral-800"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : null}
          </section>

          {dashboard.recentClientComments.length > 0 ? (
            <section className="card-elevated p-6">
              <h3 className="text-sm font-semibold text-neutral-900">Recent messages</h3>
              <p className="mt-1 text-xs text-neutral-500">Comments visible to you and the delivery team.</p>
              <ul className="mt-4 space-y-3">
                {dashboard.recentClientComments.map((c) => (
                  <li key={c.id} className="rounded-lg border border-neutral-100 bg-white px-4 py-3 text-sm text-neutral-700">
                    <p className="whitespace-pre-wrap">{c.body}</p>
                    <p className="mt-2 text-xs text-neutral-400">{new Date(c.createdAt).toLocaleString()}</p>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </>
      ) : null}

      <section ref={reviewRef} className="card-elevated scroll-mt-24 p-6">
        <h3 className="text-sm font-semibold text-neutral-900">Review &amp; respond</h3>
        <p className="mt-1 text-sm text-neutral-600">
          Approve work or request changes. This is the only place you need for task-level client review.
        </p>
        {tasks.length === 0 ? (
          <p className="mt-4 text-sm text-neutral-500">Nothing is waiting for your review.</p>
        ) : (
          <div className="mt-4 space-y-4">
            <select
              value={activeTaskId}
              onChange={(e) => setActiveTaskId(e.target.value)}
              className="input-field w-full max-w-lg text-sm"
            >
              {tasks.map((t) => (
                <option key={t.id} value={t.taskId ?? ""}>
                  {t.task?.title ?? "Work item"} — {t.task ? taskStateLabel(t.task.state) : ""}
                </option>
              ))}
            </select>
            {activeTask ? (
              <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-4">
                <p className="text-sm font-medium text-neutral-900">{activeTask.task?.title ?? "Work item"}</p>
                {canRequestChanges ? (
                  <textarea
                    value={commentBody}
                    onChange={(e) => setCommentBody(e.target.value)}
                    placeholder="Request changes or add a short comment"
                    className="input-field mt-3 min-h-[96px] w-full text-sm"
                    rows={3}
                  />
                ) : (
                  <p className="mt-3 text-sm text-neutral-600">
                    The team is addressing your feedback. You can <strong>approve</strong> when the update meets your
                    expectations.
                  </p>
                )}
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={!canRequestChanges || loading}
                    onClick={() => void onComment()}
                    className="rounded-lg border border-neutral-300 bg-white px-4 py-2 text-sm font-semibold text-neutral-800 hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Request changes
                  </button>
                  <button
                    type="button"
                    disabled={loading}
                    onClick={() => void onApprove()}
                    className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-semibold text-white hover:bg-neutral-800 disabled:opacity-50"
                  >
                    Approve
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

function Metric({ label, value, hint }: { label: string; value: number; hint?: string }) {
  return (
    <div className="card-elevated p-5">
      <p className="text-3xl font-semibold tabular-nums text-neutral-900">{value}</p>
      <p className="mt-1 text-xs font-medium text-neutral-600">{label}</p>
      {hint ? <p className="mt-1 text-[11px] text-neutral-400">{hint}</p> : null}
    </div>
  );
}
