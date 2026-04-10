"use client";

import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/contexts/auth-context";
import { Spinner } from "@/components/ui/spinner";
import { Skeleton } from "@/components/ui/skeleton";
import {
  listAuditLogs,
  listDevices,
  listIdempotencyKeys,
  listLoginAttempts,
  listNotifications,
  listOutboxEvents,
  listSessions,
  resendNotification,
  retryOutboxEvent,
  revokeSession,
} from "@/lib/api/admin-ops";

type Tab = "audit" | "sessions" | "devices" | "login" | "outbox" | "notifications" | "idempotency";

export function OpsPanel() {
  const { accessToken } = useAuth();
  const token = accessToken ?? "";
  const [tab, setTab] = useState<Tab>("audit");
  const [rows, setRows] = useState<any[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [loading, setLoading] = useState(false);
  const [firstLoadDone, setFirstLoadDone] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const title = useMemo(() => {
    if (tab === "audit") return "Audit logs";
    if (tab === "sessions") return "Sessions";
    if (tab === "devices") return "Devices";
    if (tab === "login") return "Login attempts";
    if (tab === "outbox") return "Outbox events";
    if (tab === "notifications") return "Notifications";
    return "Idempotency keys";
  }, [tab]);

  useEffect(() => {
    if (!token) return;
    void (async () => {
      setLoading(true);
      try {
        let data: any[] = [];
        if (tab === "audit") data = await listAuditLogs(token, page, pageSize);
        else if (tab === "sessions") data = await listSessions(token, page, pageSize);
        else if (tab === "devices") data = await listDevices(token, page, pageSize);
        else if (tab === "login") data = await listLoginAttempts(token, page, pageSize);
        else if (tab === "outbox") data = await listOutboxEvents(token, page, pageSize);
        else if (tab === "notifications") data = await listNotifications(token, page, pageSize);
        else data = await listIdempotencyKeys(token, page, pageSize);
        setRows(data);
      } finally {
        setLoading(false);
        setFirstLoadDone(true);
      }
    })();
  }, [token, tab, page, pageSize]);

  async function onRevokeSession(id: string) {
    setBusyId(id);
    try {
      await revokeSession(token, id);
      setRows((prev) => prev.map((r) => (r.id === id ? { ...r, revokedAt: new Date().toISOString() } : r)));
    } finally {
      setBusyId(null);
    }
  }

  async function onRetryOutbox(id: string) {
    setBusyId(id);
    try {
      await retryOutboxEvent(token, id);
      setRows((prev) => prev.map((r) => (r.id === id ? { ...r, status: "PENDING" } : r)));
    } finally {
      setBusyId(null);
    }
  }

  async function onResendNotification(id: string) {
    setBusyId(id);
    try {
      await resendNotification(token, id);
      setRows((prev) => prev.map((r) => (r.id === id ? { ...r, status: "PENDING", sentAt: null } : r)));
    } finally {
      setBusyId(null);
    }
  }

  const tabs: Array<{ id: Tab; label: string }> = [
    { id: "audit", label: "Audit" },
    { id: "sessions", label: "Sessions" },
    { id: "devices", label: "Devices" },
    { id: "login", label: "Login attempts" },
    { id: "outbox", label: "Outbox" },
    { id: "notifications", label: "Notifications" },
    { id: "idempotency", label: "Idempotency" },
  ];

  return (
    <section className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => {
              setTab(t.id);
              setPage(1);
            }}
            className={`rounded-md border px-3 py-1.5 text-xs font-semibold ${tab === t.id ? "border-neutral-900 bg-neutral-900 text-white" : "border-neutral-200 bg-white text-neutral-700"}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-neutral-900">{title}</h3>
        <div className="flex items-center gap-2">
          <select value={pageSize} onChange={(e) => setPageSize(Number(e.target.value))} className="rounded-md border border-neutral-300 px-2 py-1 text-xs">
            <option value={10}>10</option>
            <option value={20}>20</option>
            <option value={50}>50</option>
          </select>
          <button type="button" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1} className="rounded-md border border-neutral-200 px-2 py-1 text-xs">Prev</button>
          <span className="text-xs text-neutral-600">Page {page}</span>
          <button type="button" onClick={() => setPage((p) => p + 1)} className="rounded-md border border-neutral-200 px-2 py-1 text-xs">Next</button>
        </div>
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
              <Spinner className="!h-4 !w-4 border-neutral-300 border-t-neutral-900" /> Loading...
            </div>
          ) : null}
          <div className="overflow-x-auto">
            <table className="w-full min-w-[920px] text-left text-sm">
              <thead className="text-xs uppercase tracking-wide text-neutral-500">
                <tr>
                  <th className="px-2 py-2 font-semibold">ID</th>
                  <th className="px-2 py-2 font-semibold">Status/Action</th>
                  <th className="px-2 py-2 font-semibold">Meta</th>
                  <th className="px-2 py-2 text-right font-semibold">Operations</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200">
                {rows.map((r) => (
                  <tr key={r.id}>
                    <td className="px-2 py-2 font-mono text-xs">{r.id}</td>
                    <td className="px-2 py-2 text-xs">{r.status ?? r.action ?? r.success ?? r.scope ?? "—"}</td>
                    <td className="px-2 py-2 text-xs text-neutral-600">
                      {r.email || r.topic || r.targetType || r.key || r.ipAddress || r.userId || "—"}
                    </td>
                    <td className="px-2 py-2 text-right">
                      {tab === "sessions" ? (
                        <button
                          type="button"
                          onClick={() => void onRevokeSession(r.id)}
                          disabled={busyId === r.id || !!r.revokedAt}
                          className="rounded-md border border-red-200 bg-red-50 px-2.5 py-1.5 text-xs font-semibold text-red-700 disabled:opacity-50"
                        >
                          {r.revokedAt ? "Revoked" : "Revoke"}
                        </button>
                      ) : tab === "outbox" ? (
                        <button
                          type="button"
                          onClick={() => void onRetryOutbox(r.id)}
                          disabled={busyId === r.id}
                          className="rounded-md border border-neutral-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-neutral-700"
                        >
                          Retry
                        </button>
                      ) : tab === "notifications" ? (
                        <button
                          type="button"
                          onClick={() => void onResendNotification(r.id)}
                          disabled={busyId === r.id}
                          className="rounded-md border border-neutral-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-neutral-700"
                        >
                          Resend
                        </button>
                      ) : (
                        <span className="text-xs text-neutral-400">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!rows.length ? <p className="mt-3 text-sm text-neutral-500">No records found.</p> : null}
          </div>
        </>
      )}
    </section>
  );
}
