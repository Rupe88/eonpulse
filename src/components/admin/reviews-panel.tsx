"use client";

import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/contexts/auth-context";
import { Spinner } from "@/components/ui/spinner";
import { Skeleton } from "@/components/ui/skeleton";
import { ApiError } from "@/lib/api/http";
import {
  assignReviewReviewer,
  listApprovals,
  listReviewQueue,
  listThreads,
  resolveReview,
  type ApprovalItem,
  type ReviewQueueItem,
  type ThreadItem,
} from "@/lib/api/reviews";
import { listMyProjects, type MyProjectRow } from "@/lib/api/workspace";
import { listAdminUsers, type AdminUserRow } from "@/lib/api/users";

type Toast = { id: string; type: "success" | "error"; message: string };

function err(e: unknown): string {
  if (e instanceof ApiError) return e.message;
  if (e instanceof Error) return e.message;
  return "Something went wrong";
}

export function ReviewsPanel() {
  const { accessToken } = useAuth();
  const token = accessToken ?? "";
  const [projects, setProjects] = useState<MyProjectRow[]>([]);
  const [projectId, setProjectId] = useState("");
  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const [queue, setQueue] = useState<ReviewQueueItem[]>([]);
  const [threads, setThreads] = useState<ThreadItem[]>([]);
  const [approvals, setApprovals] = useState<ApprovalItem[]>([]);
  const [scope, setScope] = useState<"all" | "internal" | "client">("all");
  const [resolved, setResolved] = useState<"all" | "true" | "false">("false");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [loading, setLoading] = useState(false);
  const [firstLoadDone, setFirstLoadDone] = useState(false);
  const [busyReviewId, setBusyReviewId] = useState<string | null>(null);
  const [assignReviewerId, setAssignReviewerId] = useState("");
  const [toasts, setToasts] = useState<Toast[]>([]);

  const pushToast = (type: Toast["type"], message: string) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    setToasts((p) => [...p, { id, type, message }]);
    window.setTimeout(() => setToasts((p) => p.filter((t) => t.id !== id)), 3200);
  };

  useEffect(() => {
    if (!token) return;
    void (async () => {
      const [p, u] = await Promise.all([listMyProjects(token), listAdminUsers(token)]);
      setProjects(p);
      setUsers(u);
      setProjectId((prev) => prev || p[0]?.projectId || "");
    })();
  }, [token]);

  useEffect(() => {
    if (!token || !projectId) return;
    void (async () => {
      setLoading(true);
      try {
        const [q, t, a] = await Promise.all([
          listReviewQueue(token, projectId, scope, resolved),
          listThreads(token, projectId, resolved),
          listApprovals(token, projectId),
        ]);
        setQueue(q);
        setThreads(t);
        setApprovals(a);
      } catch (e) {
        pushToast("error", err(e));
      } finally {
        setLoading(false);
        setFirstLoadDone(true);
      }
    })();
  }, [token, projectId, scope, resolved]);

  const totalPages = Math.max(1, Math.ceil(queue.length / pageSize));
  const paged = useMemo(() => {
    const s = (page - 1) * pageSize;
    return queue.slice(s, s + pageSize);
  }, [queue, page, pageSize]);

  useEffect(() => {
    setPage(1);
  }, [projectId, scope, resolved, pageSize]);

  function exportCsv() {
    const header = ["Type", "Task/Milestone", "Internal", "Resolved", "Created At"];
    const rows = queue.map((r) =>
      [
        r.taskId ? "TASK" : "MILESTONE",
        r.task?.title || r.milestone?.name || "Unknown",
        r.isInternal ? "Yes" : "No",
        r.isResolved ? "Yes" : "No",
        new Date(r.createdAt).toISOString(),
      ]
        .map((x) => `"${String(x).replace(/"/g, '""')}"`)
        .join(","),
    );
    const csv = [header.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `reviews-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function onAssign(reviewId: string) {
    if (!assignReviewerId) return;
    setBusyReviewId(reviewId);
    try {
      await assignReviewReviewer(token, reviewId, assignReviewerId);
      setQueue((prev) => prev.map((r) => (r.id === reviewId ? { ...r, reviewerId: assignReviewerId } : r)));
      pushToast("success", "Reviewer assigned");
    } catch (e) {
      pushToast("error", err(e));
    } finally {
      setBusyReviewId(null);
    }
  }

  async function onResolve(reviewId: string) {
    setBusyReviewId(reviewId);
    try {
      await resolveReview(token, reviewId, "Resolved from admin queue");
      setQueue((prev) => prev.map((r) => (r.id === reviewId ? { ...r, isResolved: true } : r)));
      pushToast("success", "Review resolved");
    } catch (e) {
      pushToast("error", err(e));
    } finally {
      setBusyReviewId(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="fixed right-5 top-5 z-[80] space-y-2">
        {toasts.map((t) => (
          <div key={t.id} className={`min-w-[260px] rounded-lg border px-4 py-3 text-sm shadow-lg ${t.type === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-900" : "border-red-200 bg-red-50 text-red-900"}`}>
            {t.message}
          </div>
        ))}
      </div>

      <section className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <select value={projectId} onChange={(e) => setProjectId(e.target.value)} className="rounded-md border border-neutral-300 px-3 py-2 text-sm">
            <option value="">Select project</option>
            {projects.map((p) => (
              <option key={p.projectId} value={p.projectId}>
                {p.name} ({p.code})
              </option>
            ))}
          </select>
          <select value={scope} onChange={(e) => setScope(e.target.value as any)} className="rounded-md border border-neutral-300 px-3 py-2 text-sm">
            <option value="all">All scopes</option>
            <option value="internal">Internal</option>
            <option value="client">Client</option>
          </select>
          <select value={resolved} onChange={(e) => setResolved(e.target.value as any)} className="rounded-md border border-neutral-300 px-3 py-2 text-sm">
            <option value="false">Open only</option>
            <option value="all">All</option>
            <option value="true">Resolved only</option>
          </select>
          <button type="button" onClick={exportCsv} className="rounded-md border border-neutral-200 bg-white px-3 py-2 text-xs font-semibold text-neutral-700">
            Export CSV
          </button>
        </div>

        {!firstLoadDone && loading ? (
          <div className="space-y-2">
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-9 w-full" />
          </div>
        ) : (
          <>
            {loading ? (
              <div className="flex items-center gap-2 text-sm text-neutral-600">
                <Spinner className="!h-4 !w-4 border-neutral-300 border-t-neutral-900" /> Loading queue...
              </div>
            ) : null}
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] text-left text-sm">
                <thead className="text-xs uppercase tracking-wide text-neutral-500">
                  <tr>
                    <th className="px-2 py-2 font-semibold">Target</th>
                    <th className="px-2 py-2 font-semibold">Scope</th>
                    <th className="px-2 py-2 font-semibold">Status</th>
                    <th className="px-2 py-2 font-semibold">Assign reviewer</th>
                    <th className="px-2 py-2 text-right font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200">
                  {paged.map((r) => (
                    <tr key={r.id}>
                      <td className="px-2 py-2">{r.task?.title || r.milestone?.name || "Untitled"}</td>
                      <td className="px-2 py-2">{r.isInternal ? "Internal" : "Client"}</td>
                      <td className="px-2 py-2">{r.isResolved ? "Resolved" : "Open"}</td>
                      <td className="px-2 py-2">
                        <select value={assignReviewerId} onChange={(e) => setAssignReviewerId(e.target.value)} className="rounded-md border border-neutral-300 px-2 py-1.5 text-xs">
                          <option value="">Select user</option>
                          {users.map((u) => (
                            <option key={u.id} value={u.id}>{u.name || u.email}</option>
                          ))}
                        </select>
                      </td>
                      <td className="px-2 py-2 text-right">
                        <div className="inline-flex gap-2">
                          <button type="button" disabled={busyReviewId === r.id} onClick={() => void onAssign(r.id)} className="rounded-md border border-neutral-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-neutral-700">Assign</button>
                          <button type="button" disabled={busyReviewId === r.id || r.isResolved} onClick={() => void onResolve(r.id)} className="rounded-md border border-neutral-900 bg-neutral-900 px-2.5 py-1.5 text-xs font-semibold text-white">Resolve</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex items-center justify-between text-xs text-neutral-600">
              <p>Queue: {queue.length} | Threads: {threads.length} | Approvals: {approvals.length}</p>
              <div className="flex items-center gap-2">
                <select value={pageSize} onChange={(e) => setPageSize(Number(e.target.value))} className="rounded-md border border-neutral-300 px-2 py-1">
                  <option value={5}>5</option>
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                </select>
                <button type="button" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1} className="rounded-md border border-neutral-200 px-2 py-1">Prev</button>
                <span>Page {page}/{totalPages}</span>
                <button type="button" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages} className="rounded-md border border-neutral-200 px-2 py-1">Next</button>
              </div>
            </div>
          </>
        )}
      </section>
    </div>
  );
}
