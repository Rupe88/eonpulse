"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/auth-context";
import { listMyProjects, type MyProjectRow } from "@/lib/api/workspace";
import { ApiError } from "@/lib/api/http";
import { listThreads, listApprovals } from "@/lib/api/reviews";
import { listProjectDeliverables } from "@/lib/api/deliverables-admin";

function em(e: unknown): string {
  if (e instanceof ApiError) return e.message;
  if (e instanceof Error) return e.message;
  return "Something went wrong";
}

export function AuditorPanel() {
  const { accessToken } = useAuth();
  const token = accessToken ?? "";
  const [projects, setProjects] = useState<MyProjectRow[]>([]);
  const [projectId, setProjectId] = useState("");
  const [threads, setThreads] = useState(0);
  const [approvals, setApprovals] = useState(0);
  const [deliverables, setDeliverables] = useState(0);
  const [error, setError] = useState<string | null>(null);

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
        const [t, a, d] = await Promise.all([
          listThreads(token, projectId, "all"),
          listApprovals(token, projectId, "ALL"),
          listProjectDeliverables(token, projectId),
        ]);
        setThreads(t.length);
        setApprovals(a.length);
        setDeliverables(d.length);
      } catch (e) {
        setError(em(e));
      }
    })();
  }, [token, projectId]);

  return (
    <div className="space-y-4">
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
      {error ? <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}
      <div className="grid gap-3 sm:grid-cols-3">
        <Stat label="Comment threads" value={threads} />
        <Stat label="Approval records" value={approvals} />
        <Stat label="Deliverables" value={deliverables} />
      </div>
      <p className="text-xs text-neutral-500">
        Auditor mode is read-only and focuses on traceability artifacts.
      </p>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
      <p className="text-2xl font-semibold tabular-nums text-neutral-900">{value}</p>
      <p className="mt-1 text-xs font-medium text-neutral-500">{label}</p>
    </div>
  );
}
