"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { Spinner } from "@/components/ui/spinner";
import { taskStateLabel } from "@/components/dashboard/task-state-label";
import { nextStatesForWorker } from "@/components/dashboard/worker-state-transitions";
import { ApiError } from "@/lib/api/http";
import {
  getWorkerTask,
  getWorkerTaskTimeline,
  patchTaskChecklistItem,
  patchWorkerTaskState,
  postWorkerEvidenceLink,
  type WorkerTaskDetail,
  type WorkerTaskTimeline,
} from "@/lib/api/worker-tasks";
import {
  submitTaskInternalReview,
  requestInternalRework,
  sendTaskToClientReview,
} from "@/lib/api/reviews";
import { listProjectMembers, type ProjectMemberOption } from "@/lib/api/workspace";
import { useAuth } from "@/contexts/auth-context";
import { tokenStorage } from "@/lib/auth/storage";

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

function projectRoleLabel(role: string): string {
  const m: Record<string, string> = {
    ADMIN: "Admin",
    SUB_ADMIN: "Sub-admin",
    WORKER: "Worker",
    CLIENT_OWNER: "Client",
    FINANCE: "Finance",
    AUDITOR: "Auditor",
  };
  return m[role] ?? role;
}

function memberOptionLabel(m: ProjectMemberOption, currentUserId: string | null | undefined): string {
  const display = m.name?.trim() || m.email;
  const role = projectRoleLabel(m.role);
  const you = m.userId === currentUserId ? " · You" : "";
  return `${display} · ${role}${you}`;
}

export function WorkerTaskDetail({ taskId }: { taskId: string }) {
  const router = useRouter();
  const { accessToken, user } = useAuth();
  const [task, setTask] = useState<WorkerTaskDetail | null>(null);
  const [timeline, setTimeline] = useState<WorkerTaskTimeline | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [nextState, setNextState] = useState("");
  const [busy, setBusy] = useState(false);
  const [evidenceUrl, setEvidenceUrl] = useState("");
  const [evidenceLabel, setEvidenceLabel] = useState("");
  const [reviewerId, setReviewerId] = useState("");
  const [projectMembers, setProjectMembers] = useState<ProjectMemberOption[]>([]);
  const [projectMembersLoading, setProjectMembersLoading] = useState(false);
  const [projectMembersError, setProjectMembersError] = useState<string | null>(null);
  const [reworkNote, setReworkNote] = useState("");
  const [reviewBusy, setReviewBusy] = useState(false);
  const [checklistBusyId, setChecklistBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const token = resolveToken(accessToken);
    if (!token) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const [t, tl] = await Promise.all([
        getWorkerTask(token, taskId),
        getWorkerTaskTimeline(token, taskId),
      ]);
      setTask(t);
      setTimeline(tl);
      const options = nextStatesForWorker(t.state, t.viewer);
      setNextState(options[0] ?? "");
    } catch (e) {
      setError(em(e));
      setTask(null);
      setTimeline(null);
    } finally {
      setLoading(false);
    }
  }, [accessToken, taskId]);

  useEffect(() => {
    void load();
  }, [load]);

  const showSubmitInternal =
    !!task?.viewer?.canSubmitInternalReview &&
    (task?.state === "ASSIGNED" ||
      task?.state === "IN_PROGRESS" ||
      task?.state === "FIX_IN_PROGRESS");

  const showManageInternal =
    !!task &&
    task.state === "IN_INTERNAL_REVIEW" &&
    task.viewer.canManageInternalReview;

  const showInternalWaiting =
    !!task &&
    task.state === "IN_INTERNAL_REVIEW" &&
    !task.viewer.canManageInternalReview;

  useEffect(() => {
    if (!showSubmitInternal || !task) {
      if (!showSubmitInternal) {
        setProjectMembers([]);
        setProjectMembersError(null);
        setProjectMembersLoading(false);
      }
      return;
    }
    const pid = task.section.milestone.projectId;
    const token = resolveToken(accessToken);
    if (!token) return;
    let cancelled = false;
    setProjectMembersLoading(true);
    setProjectMembersError(null);
    void listProjectMembers(token, pid)
      .then((rows) => {
        if (!cancelled) {
          setProjectMembers(rows);
          setReviewerId("");
        }
      })
      .catch((e) => {
        if (!cancelled) setProjectMembersError(em(e));
      })
      .finally(() => {
        if (!cancelled) setProjectMembersLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [showSubmitInternal, task, accessToken]);

  async function onTransition() {
    const token = resolveToken(accessToken);
    if (!token || !nextState) return;
    setBusy(true);
    setError(null);
    try {
      await patchWorkerTaskState(token, taskId, {
        state: nextState,
        note: note.trim() || undefined,
      });
      setNote("");
      await load();
    } catch (e) {
      setError(em(e));
    } finally {
      setBusy(false);
    }
  }

  async function onSubmitInternalReview() {
    const token = resolveToken(accessToken);
    if (!token) return;
    setReviewBusy(true);
    setError(null);
    try {
      const rid = reviewerId.trim();
      await submitTaskInternalReview(token, taskId, rid || undefined);
      setReviewerId("");
      await load();
    } catch (e) {
      setError(em(e));
    } finally {
      setReviewBusy(false);
    }
  }

  async function onRequestInternalRework() {
    const token = resolveToken(accessToken);
    if (!token || !reworkNote.trim()) return;
    setReviewBusy(true);
    setError(null);
    try {
      await requestInternalRework(token, taskId, reworkNote.trim());
      setReworkNote("");
      await load();
    } catch (e) {
      setError(em(e));
    } finally {
      setReviewBusy(false);
    }
  }

  async function onSendToClient() {
    const token = resolveToken(accessToken);
    if (!token) return;
    setReviewBusy(true);
    setError(null);
    try {
      await sendTaskToClientReview(token, taskId);
      await load();
    } catch (e) {
      setError(em(e));
    } finally {
      setReviewBusy(false);
    }
  }

  async function onToggleChecklistItem(itemId: string, done: boolean) {
    const token = resolveToken(accessToken);
    if (!token) return;
    setChecklistBusyId(itemId);
    setError(null);
    try {
      await patchTaskChecklistItem(token, itemId, { done });
      await load();
    } catch (e) {
      setError(em(e));
    } finally {
      setChecklistBusyId(null);
    }
  }

  async function onEvidenceLink(e: React.FormEvent) {
    e.preventDefault();
    const token = resolveToken(accessToken);
    if (!token || !evidenceUrl.trim()) return;
    setBusy(true);
    setError(null);
    try {
      await postWorkerEvidenceLink(token, taskId, {
        fileUrl: evidenceUrl.trim(),
        label: evidenceLabel.trim() || undefined,
      });
      setEvidenceUrl("");
      setEvidenceLabel("");
      await load();
    } catch (err) {
      setError(em(err));
    } finally {
      setBusy(false);
    }
  }

  if (loading && !task) {
    return (
      <div className="flex justify-center py-20">
        <Spinner />
      </div>
    );
  }

  if (error && !task) {
    return (
      <div className="space-y-4">
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">{error}</p>
        <button
          type="button"
          onClick={() => router.push("/dashboard/tasks")}
          className="text-sm font-medium text-neutral-900 underline"
        >
          Back to tasks
        </button>
      </div>
    );
  }

  if (!task) return null;

  const nextOptions = nextStatesForWorker(task.state, task.viewer);
  const unmetDeps = task.dependencies.filter((d) => d.dependsOnTask.state !== "APPROVED");

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">Task</p>
          <h1 className="mt-1 text-2xl font-semibold text-neutral-900">{task.title}</h1>
          <p className="mt-2 text-sm text-neutral-600">
            {task.section.milestone.name} · {task.section.name} · {taskStateLabel(task.state)}
          </p>
        </div>
        <Link href="/dashboard/tasks" className="text-sm font-medium text-neutral-700 underline underline-offset-2 hover:text-neutral-900">
          ← All tasks
        </Link>
      </div>

      {error ? (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">{error}</p>
      ) : null}

      {task.description ? (
        <section className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-neutral-900">Description</h2>
          <p className="mt-2 whitespace-pre-wrap text-sm text-neutral-700">{task.description}</p>
        </section>
      ) : null}

      {task.subtasks?.length ? (
        <section className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-neutral-900">Subtasks</h2>
          <p className="mt-1 text-xs text-neutral-500">Breakdown work items under this task. Open each to update status.</p>
          <ul className="mt-3 divide-y divide-neutral-100 border border-neutral-100 rounded-lg">
            {task.subtasks.map((st) => (
              <li key={st.id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2.5 text-sm">
                <Link
                  href={`/dashboard/tasks/${st.id}`}
                  className="font-medium text-neutral-900 underline underline-offset-2 hover:text-neutral-700"
                >
                  {st.title}
                </Link>
                <span className="text-neutral-600">
                  {taskStateLabel(st.state)}
                  {st.dueDate ? ` · Due ${new Date(st.dueDate).toLocaleDateString()}` : ""}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {task.checklistItems?.length ? (
        <section className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-neutral-900">Checklist</h2>
          <p className="mt-1 text-xs text-neutral-500">Check off steps as you complete them.</p>
          <ul className="mt-3 space-y-2">
            {task.checklistItems.map((item) => (
              <li key={item.id} className="flex items-start gap-3 rounded-lg border border-neutral-100 bg-neutral-50/80 px-3 py-2">
                <input
                  type="checkbox"
                  className="mt-1 h-4 w-4 shrink-0 rounded border-neutral-300"
                  checked={item.done}
                  disabled={checklistBusyId === item.id || busy || reviewBusy}
                  onChange={(e) => void onToggleChecklistItem(item.id, e.target.checked)}
                  aria-busy={checklistBusyId === item.id}
                />
                <span
                  className={`text-sm ${item.done ? "text-neutral-500 line-through" : "text-neutral-800"}`}
                >
                  {item.label}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {unmetDeps.length > 0 ? (
        <section className="rounded-xl border border-amber-200 bg-amber-50/80 p-5">
          <h2 className="text-sm font-semibold text-amber-900">Dependencies not approved</h2>
          <ul className="mt-2 list-inside list-disc text-sm text-amber-950">
            {unmetDeps.map((d) => (
              <li key={d.id}>
                {d.dependsOnTask.title} — {taskStateLabel(d.dependsOnTask.state)}
              </li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-amber-800">You cannot move to In progress until upstream tasks are approved.</p>
        </section>
      ) : null}

      {showSubmitInternal ? (
        <section className="card-elevated p-5">
          <h2 className="text-sm font-semibold text-neutral-900">Submit for internal review</h2>
          <p className="mt-1 text-sm text-neutral-600">
            Opens an internal review request and moves the task to <strong>In internal review</strong>. Optionally
            route it to a specific teammate; otherwise it stays in the review queue for whoever is available.
          </p>
          <div className="mt-5 flex flex-col gap-4 sm:flex-row sm:items-end">
            <label className="flex min-w-0 flex-1 flex-col gap-2">
              <span className="text-xs font-medium text-neutral-600">Preferred reviewer</span>
              <select
                className="input-field"
                value={reviewerId}
                onChange={(e) => setReviewerId(e.target.value)}
                disabled={busy || reviewBusy || projectMembersLoading}
                aria-busy={projectMembersLoading}
              >
                <option value="">
                  {projectMembersLoading ? "Loading team…" : "Anyone available (queue)"}
                </option>
                {projectMembers.map((m) => (
                  <option key={m.userId} value={m.userId}>
                    {memberOptionLabel(m, user?.userId)}
                  </option>
                ))}
              </select>
              {projectMembersError ? (
                <span className="text-xs text-red-700">{projectMembersError}</span>
              ) : (
                <span className="text-xs text-neutral-500">
                  {projectMembers.length > 0
                    ? `${projectMembers.length} people on this project.`
                    : !projectMembersLoading && !projectMembersError
                      ? "No other members listed — submit to the queue or add people to the project."
                      : null}
                </span>
              )}
            </label>
            <button
              type="button"
              disabled={busy || reviewBusy || projectMembersLoading}
              onClick={() => void onSubmitInternalReview()}
              className="btn-primary inline-flex min-h-[42px] shrink-0 items-center justify-center px-5 disabled:opacity-40"
            >
              {reviewBusy ? "Submitting…" : "Submit for internal review"}
            </button>
          </div>
        </section>
      ) : null}

      {showManageInternal ? (
        <section className="card-elevated p-5">
          <h2 className="text-sm font-semibold text-neutral-900">Internal review (lead)</h2>
          <p className="mt-1 text-sm text-neutral-600">
            Approve to send to the client, or request rework for the assignee.
          </p>
          <div className="mt-5 flex flex-col gap-6">
            <div>
              <label className="flex flex-col gap-2">
                <span className="text-xs font-medium text-neutral-600">Rework note</span>
                <textarea
                  className="input-field min-h-[88px] resize-y"
                  value={reworkNote}
                  onChange={(e) => setReworkNote(e.target.value)}
                  placeholder="What needs to change before client review?"
                />
              </label>
              <button
                type="button"
                disabled={busy || reviewBusy || !reworkNote.trim()}
                onClick={() => void onRequestInternalRework()}
                className="btn-secondary mt-3 min-h-[42px] disabled:opacity-40"
              >
                {reviewBusy ? "Sending…" : "Request internal rework"}
              </button>
            </div>
            <div className="border-t border-neutral-200 pt-6">
              <button
                type="button"
                disabled={busy || reviewBusy}
                onClick={() => void onSendToClient()}
                className="btn-primary min-h-[42px] disabled:opacity-40"
              >
                {reviewBusy ? "Updating…" : "Approve & send to client review"}
              </button>
            </div>
          </div>
        </section>
      ) : null}

      {showInternalWaiting ? (
        <section className="rounded-xl border border-neutral-200 bg-neutral-50 p-5">
          <h2 className="text-sm font-semibold text-neutral-900">Waiting on internal review</h2>
          <p className="mt-1 text-sm text-neutral-600">
            A project lead will either send this to client review or request rework. You will be notified when the
            state changes.
          </p>
        </section>
      ) : null}

      <section className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-neutral-900">Update status</h2>
        <p className="mt-1 text-xs text-neutral-500">
          Valid transitions only; server enforces workflow rules. Use <strong>Submit for internal review</strong> above
          when handing off for internal QA (creates a review record).
        </p>
        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
          <label className="flex min-w-[200px] flex-col gap-1">
            <span className="text-xs font-medium text-neutral-600">Next state</span>
            <select
              className="input-field"
              value={nextState}
              onChange={(e) => setNextState(e.target.value)}
              disabled={nextOptions.length === 0 || busy || reviewBusy}
            >
              {nextOptions.length === 0 ? (
                <option value="">No transitions (terminal or restricted)</option>
              ) : (
                nextOptions.map((s) => (
                  <option key={s} value={s}>
                    {taskStateLabel(s)}
                  </option>
                ))
              )}
            </select>
          </label>
          <label className="flex min-w-0 flex-1 flex-col gap-1">
            <span className="text-xs font-medium text-neutral-600">Note (optional)</span>
            <input
              className="input-field"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Audit note for this transition"
            />
          </label>
          <button
            type="button"
            disabled={busy || reviewBusy || !nextState || nextOptions.length === 0}
            onClick={() => void onTransition()}
            className="inline-flex min-h-[40px] items-center justify-center rounded-md bg-neutral-900 px-4 py-2 text-sm font-semibold text-white hover:bg-neutral-800 disabled:opacity-40"
          >
            {busy ? "Applying…" : "Apply transition"}
          </button>
        </div>
      </section>

      <section className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-neutral-900">Evidence link</h2>
        <p className="mt-1 text-xs text-neutral-500">Attach a URL to designs, docs, or demos.</p>
        <form onSubmit={onEvidenceLink} className="mt-4 grid gap-3 sm:grid-cols-2">
          <input
            className="input-field sm:col-span-2"
            value={evidenceUrl}
            onChange={(e) => setEvidenceUrl(e.target.value)}
            placeholder="https://…"
            type="url"
            required
          />
          <input
            className="input-field"
            value={evidenceLabel}
            onChange={(e) => setEvidenceLabel(e.target.value)}
            placeholder="Label (optional)"
          />
          <div className="flex items-end">
            <button
              type="submit"
              disabled={busy || reviewBusy}
              className="w-full rounded-md border border-neutral-200 bg-neutral-50 py-2 text-sm font-semibold text-neutral-900 hover:bg-neutral-100 disabled:opacity-40"
            >
              Add link
            </button>
          </div>
        </form>
        {task.evidence.length > 0 ? (
          <ul className="mt-4 space-y-2 border-t border-neutral-100 pt-4 text-sm">
            {task.evidence.map((ev) => (
              <li key={ev.id}>
                <a href={ev.fileUrl} target="_blank" rel="noreferrer" className="font-medium text-neutral-900 underline">
                  {ev.label || ev.fileUrl}
                </a>
                <span className="ml-2 text-xs text-neutral-500">
                  {new Date(ev.createdAt).toLocaleString()}
                </span>
              </li>
            ))}
          </ul>
        ) : null}
      </section>

      {task.gitLinks.length > 0 ? (
        <section className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-neutral-900">Git</h2>
          <ul className="mt-3 space-y-3">
            {task.gitLinks.map((g) => (
              <li key={g.id} className="rounded-lg border border-neutral-100 bg-neutral-50 px-3 py-2 text-sm">
                <p className="font-mono text-xs text-neutral-600">repo: {g.repoId}</p>
                {g.issueKey ? <p className="text-neutral-800">Issue: {g.issueKey}</p> : null}
                {g.workingBranch ? <p className="text-neutral-700">Branch: {g.workingBranch}</p> : null}
                {g.pullRequestUrl ? (
                  <a href={g.pullRequestUrl} className="text-blue-700 underline" target="_blank" rel="noreferrer">
                    Pull request
                  </a>
                ) : null}
                {g.commitRefs?.length ? (
                  <p className="mt-1 text-xs text-neutral-500">
                    {g.commitRefs.length} commit ref(s)
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {timeline ? (
        <section className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-neutral-900">Activity timeline</h2>
          <div className="mt-4 space-y-6">
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Comments</h3>
              {timeline.comments.length === 0 ? (
                <p className="mt-2 text-sm text-neutral-500">No comments yet.</p>
              ) : (
                <ul className="mt-2 space-y-2">
                  {timeline.comments.map((c) => (
                    <li key={c.id} className="rounded-lg border border-neutral-100 bg-neutral-50 px-3 py-2 text-sm">
                      <p className="text-neutral-900">{c.body}</p>
                      <p className="mt-1 text-xs text-neutral-500">
                        {c.author.email} · {new Date(c.createdAt).toLocaleString()}
                        {c.isBlocker ? " · Blocker" : ""}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-neutral-500">Reviews</h3>
              {timeline.reviews.length === 0 ? (
                <p className="mt-2 text-sm text-neutral-500">No review requests.</p>
              ) : (
                <ul className="mt-2 space-y-2 text-sm">
                  {timeline.reviews.map((r) => (
                    <li key={r.id} className="rounded-lg border border-neutral-100 bg-neutral-50 px-3 py-2 text-neutral-800">
                      <p className="font-medium">
                        {r.isInternal ? "Internal" : "Client"} · {r.isResolved ? "Resolved" : "Open"} ·{" "}
                        {new Date(r.createdAt).toLocaleString()}
                      </p>
                      <p className="mt-1 text-xs text-neutral-600">
                        Requested by {r.requestedBy.name || r.requestedBy.email}
                        {r.reviewer ? ` · Reviewer: ${r.reviewer.name || r.reviewer.email}` : ""}
                      </p>
                      {r.resolutionNote ? (
                        <p className="mt-1 text-sm text-neutral-700">
                          <span className="text-neutral-500">Note: </span>
                          {r.resolutionNote}
                        </p>
                      ) : null}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </section>
      ) : null}
    </div>
  );
}
