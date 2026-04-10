"use client";

import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/contexts/auth-context";
import { Spinner } from "@/components/ui/spinner";
import { Skeleton } from "@/components/ui/skeleton";
import { ApiError } from "@/lib/api/http";
import {
  createDeliverable,
  getDeliverableVersions,
  listProjectDeliverables,
  type DeliverableItem,
} from "@/lib/api/deliverables-admin";
import { listMyProjects, type MyProjectRow } from "@/lib/api/workspace";

type Toast = { id: string; type: "success" | "error"; message: string };

function errorMsg(e: unknown): string {
  if (e instanceof ApiError) return e.message;
  if (e instanceof Error) return e.message;
  return "Something went wrong";
}

export function DeliverablesPanel() {
  const { accessToken } = useAuth();
  const token = accessToken ?? "";
  const [projects, setProjects] = useState<MyProjectRow[]>([]);
  const [projectId, setProjectId] = useState("");
  const [rows, setRows] = useState<DeliverableItem[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [loading, setLoading] = useState(false);
  const [firstLoadDone, setFirstLoadDone] = useState(false);
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [selectedId, setSelectedId] = useState("");
  const [versions, setVersions] = useState<Array<{ id: string; versionNo: number; fileUrl: string; createdAt: string }>>([]);
  const [toasts, setToasts] = useState<Toast[]>([]);

  const pushToast = (type: Toast["type"], message: string) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    setToasts((p) => [...p, { id, type, message }]);
    window.setTimeout(() => setToasts((p) => p.filter((t) => t.id !== id)), 3200);
  };

  useEffect(() => {
    if (!token) return;
    void (async () => {
      const p = await listMyProjects(token);
      setProjects(p);
      setProjectId((prev) => prev || p[0]?.projectId || "");
    })();
  }, [token]);

  useEffect(() => {
    if (!token || !projectId) return;
    void (async () => {
      setLoading(true);
      try {
        const list = await listProjectDeliverables(token, projectId);
        setRows(list);
      } catch (e) {
        pushToast("error", errorMsg(e));
      } finally {
        setLoading(false);
        setFirstLoadDone(true);
      }
    })();
  }, [token, projectId]);

  useEffect(() => {
    if (!token || !selectedId) {
      setVersions([]);
      return;
    }
    void (async () => {
      try {
        setVersions(await getDeliverableVersions(token, selectedId));
      } catch {}
    })();
  }, [token, selectedId]);

  const totalPages = Math.max(1, Math.ceil(rows.length / pageSize));
  const paged = useMemo(() => rows.slice((page - 1) * pageSize, page * pageSize), [rows, page, pageSize]);

  function exportCsv() {
    const header = ["Title", "Summary", "UpdatedAt", "VersionCount"];
    const lines = rows.map((r) =>
      [r.title, r.summary || "", new Date(r.updatedAt).toISOString(), String(r.versions.length)]
        .map((x) => `"${String(x).replace(/"/g, '""')}"`)
        .join(","),
    );
    const blob = new Blob([[header.join(","), ...lines].join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `deliverables-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!token || !projectId || !title.trim()) return;
    try {
      const created = await createDeliverable(token, { projectId, title: title.trim(), summary: summary.trim() || undefined });
      setRows((p) => [created, ...p]);
      setTitle("");
      setSummary("");
      pushToast("success", "Deliverable created");
    } catch (e) {
      pushToast("error", errorMsg(e));
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

      <section className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <select value={projectId} onChange={(e) => setProjectId(e.target.value)} className="rounded-md border border-neutral-300 px-3 py-2 text-sm">
            <option value="">Select project</option>
            {projects.map((p) => (
              <option key={p.projectId} value={p.projectId}>{p.name} ({p.code})</option>
            ))}
          </select>
          <button type="button" onClick={exportCsv} className="rounded-md border border-neutral-200 bg-white px-3 py-2 text-xs font-semibold text-neutral-700">Export CSV</button>
        </div>
        <form onSubmit={onCreate} className="grid gap-2 sm:grid-cols-3">
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Deliverable title" className="rounded-md border border-neutral-300 px-3 py-2 text-sm" />
          <input value={summary} onChange={(e) => setSummary(e.target.value)} placeholder="Summary (optional)" className="rounded-md border border-neutral-300 px-3 py-2 text-sm" />
          <button type="submit" className="rounded-md border border-neutral-900 bg-neutral-900 px-3 py-2 text-sm font-semibold text-white">Create deliverable</button>
        </form>

        {!firstLoadDone && loading ? (
          <div className="space-y-2">
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-9 w-full" />
          </div>
        ) : (
          <>
            {loading ? <div className="flex items-center gap-2 text-sm text-neutral-600"><Spinner className="!h-4 !w-4 border-neutral-300 border-t-neutral-900" /> Loading...</div> : null}
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead className="text-xs uppercase tracking-wide text-neutral-500">
                  <tr>
                    <th className="px-2 py-2 font-semibold">Title</th>
                    <th className="px-2 py-2 font-semibold">Summary</th>
                    <th className="px-2 py-2 font-semibold">Versions</th>
                    <th className="px-2 py-2 text-right font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200">
                  {paged.map((d) => (
                    <tr key={d.id}>
                      <td className="px-2 py-2">{d.title}</td>
                      <td className="px-2 py-2">{d.summary || "—"}</td>
                      <td className="px-2 py-2">{d.versions.length}</td>
                      <td className="px-2 py-2 text-right">
                        <button type="button" onClick={() => setSelectedId(d.id)} className="rounded-md border border-neutral-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-neutral-700">View versions</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex items-center justify-between text-xs text-neutral-600">
              <p>{rows.length} deliverables</p>
              <div className="flex items-center gap-2">
                <select value={pageSize} onChange={(e) => setPageSize(Number(e.target.value))} className="rounded-md border border-neutral-300 px-2 py-1">
                  <option value={5}>5</option><option value={10}>10</option><option value={20}>20</option>
                </select>
                <button type="button" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1} className="rounded-md border border-neutral-200 px-2 py-1">Prev</button>
                <span>Page {page}/{totalPages}</span>
                <button type="button" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages} className="rounded-md border border-neutral-200 px-2 py-1">Next</button>
              </div>
            </div>
          </>
        )}
      </section>

      {selectedId ? (
        <section className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm">
          <h3 className="text-sm font-semibold text-neutral-900">Version history</h3>
          <ul className="mt-3 space-y-2 text-sm">
            {versions.map((v) => (
              <li key={v.id} className="rounded-md border border-neutral-200 px-3 py-2">
                v{v.versionNo} - <a href={v.fileUrl} target="_blank" className="text-blue-700 underline" rel="noreferrer">open file</a>
              </li>
            ))}
            {!versions.length ? <li className="text-neutral-500">No versions found.</li> : null}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
