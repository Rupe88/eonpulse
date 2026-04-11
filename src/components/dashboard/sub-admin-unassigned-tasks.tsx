"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Spinner } from "@/components/ui/spinner";
import { taskStateLabel } from "@/components/dashboard/task-state-label";
import { ApiError } from "@/lib/api/http";
import {
  assignTask,
  listUnassignedExecutorTasks,
  type UnassignedExecutorTaskRow,
} from "@/lib/api/tasks-admin";
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

function memberLabel(m: ProjectMemberOption): string {
  const name = m.name?.trim() || m.email;
  return `${name} · ${m.role}`;
}

type Props = {
  projectId: string;
  /** Called after a successful assign so parent can refresh queues. */
  onAssigned?: () => void;
};

/**
 * Lists tasks with no executor and lets sub-admins assign a project member without using Admin.
 */
export function SubAdminUnassignedTasksBlock({ projectId, onAssigned }: Props) {
  const { accessToken } = useAuth();
  const [rows, setRows] = useState<UnassignedExecutorTaskRow[]>([]);
  const [members, setMembers] = useState<ProjectMemberOption[]>([]);
  const [pick, setPick] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const token = resolveToken(accessToken);
    if (!token || !projectId) {
      setRows([]);
      setMembers([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const [tasks, mems] = await Promise.all([
        listUnassignedExecutorTasks(token, projectId),
        listProjectMembers(token, projectId),
      ]);
      setRows(tasks);
      setMembers(mems);
    } catch (e) {
      setError(em(e));
      setRows([]);
      setMembers([]);
    } finally {
      setLoading(false);
    }
  }, [accessToken, projectId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function onApply(taskId: string) {
    const token = resolveToken(accessToken);
    const userId = pick[taskId]?.trim();
    if (!token || !userId) return;
    setBusyId(taskId);
    setError(null);
    try {
      await assignTask(token, taskId, { userId });
      setPick((prev) => ({ ...prev, [taskId]: "" }));
      await load();
      onAssigned?.();
    } catch (e) {
      setError(em(e));
    } finally {
      setBusyId(null);
    }
  }

  if (loading && rows.length === 0 && !error) {
    return (
      <div className="flex justify-center py-10">
        <Spinner />
      </div>
    );
  }

  return (
    <section className="rounded-xl border border-amber-200 bg-amber-50/40 p-5 shadow-sm">
      <h2 className="text-sm font-semibold text-neutral-900">Assign work (no executor yet)</h2>
      <p className="mt-1 text-xs text-neutral-600">
        These tasks are not assigned to anyone as executor. Pick a <strong>project member</strong> and apply — the task
        moves to <strong>Assigned</strong> and appears in the task queue.
      </p>
      {error ? (
        <p className="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p>
      ) : null}
      {rows.length === 0 ? (
        <p className="mt-4 text-sm text-neutral-600">No unassigned tasks in this project.</p>
      ) : (
        <ul className="mt-4 divide-y divide-amber-100/80 rounded-lg border border-amber-100 bg-white">
          {rows.map((t) => (
            <li key={t.id} className="flex flex-col gap-2 px-3 py-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
              <div className="min-w-0 flex-1">
                <p className="font-medium text-neutral-900">
                  {t.title}
                  {t.parentTaskId ? (
                    <span className="ml-2 text-xs font-normal text-neutral-500">(subtask)</span>
                  ) : null}
                </p>
                <p className="text-xs text-neutral-500">
                  {t.section.milestone.name} / {t.section.name} · {taskStateLabel(t.state)}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <select
                  className="min-w-[200px] max-w-[280px] rounded-md border border-neutral-300 px-2 py-1.5 text-xs"
                  value={pick[t.id] ?? ""}
                  onChange={(e) => setPick((prev) => ({ ...prev, [t.id]: e.target.value }))}
                  disabled={busyId === t.id || members.length === 0}
                >
                  <option value="">{members.length === 0 ? "No members on project" : "Select member…"}</option>
                  {members.map((m) => (
                    <option key={m.userId} value={m.userId}>
                      {memberLabel(m)}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  disabled={!(pick[t.id] ?? "").trim() || busyId === t.id}
                  onClick={() => void onApply(t.id)}
                  className="rounded-md border border-neutral-800 bg-neutral-900 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-40"
                >
                  {busyId === t.id ? "Applying…" : "Assign"}
                </button>
                <Link
                  href={`/dashboard/tasks/${t.id}`}
                  className="text-xs font-medium text-neutral-700 underline underline-offset-2"
                >
                  Open task
                </Link>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
