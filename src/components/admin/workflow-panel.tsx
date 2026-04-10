"use client";

import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/contexts/auth-context";
import { ApiError } from "@/lib/api/http";
import { listMyProjects, type MyProjectRow } from "@/lib/api/workspace";
import { listMilestones, listSections, listTasksInSection, type MilestoneRow, type SectionRow, type TaskRow } from "@/lib/api/planning";
import {
  getMilestoneClosable,
  transitionMilestoneState,
  transitionProjectState,
  transitionTaskState,
  unlockNextMilestone,
} from "@/lib/api/admin-advanced";

const PROJECT_STATES = ["DRAFT", "COMMERCIAL_APPROVED", "ADVANCE_PAID", "ACTIVE", "ON_HOLD", "PAYMENT_HOLD", "IN_UAT", "LIVE", "CLOSED"] as const;
const MILESTONE_STATES = ["LOCKED", "IN_PROGRESS", "INTERNAL_REVIEW", "SENT_TO_CLIENT_REVIEW", "CLIENT_REWORK_REQUESTED", "CLIENT_APPROVED", "PAYMENT_PENDING", "COMPLETED"] as const;
const TASK_STATES = ["BACKLOG", "ASSIGNED", "IN_PROGRESS", "IN_INTERNAL_REVIEW", "REWORK_REQUESTED", "READY_FOR_CLIENT_REVIEW", "CLIENT_COMMENTED", "FIX_IN_PROGRESS", "APPROVED", "BLOCKED"] as const;

function em(e: unknown): string {
  if (e instanceof ApiError) return e.message;
  if (e instanceof Error) return e.message;
  return "Something went wrong";
}

export function WorkflowPanel() {
  const { accessToken } = useAuth();
  const token = accessToken ?? "";

  const [projects, setProjects] = useState<MyProjectRow[]>([]);
  const [projectId, setProjectId] = useState("");
  const [milestones, setMilestones] = useState<MilestoneRow[]>([]);
  const [milestoneId, setMilestoneId] = useState("");
  const [sections, setSections] = useState<SectionRow[]>([]);
  const [sectionId, setSectionId] = useState("");
  const [tasks, setTasks] = useState<TaskRow[]>([]);
  const [taskId, setTaskId] = useState("");

  const [projectNext, setProjectNext] = useState<string>("ACTIVE");
  const [milestoneNext, setMilestoneNext] = useState<string>("IN_PROGRESS");
  const [taskNext, setTaskNext] = useState<string>("IN_PROGRESS");
  const [note, setNote] = useState("");

  const [closable, setClosable] = useState<{
    closable: boolean;
    checks: {
      mandatoryNotApproved: number;
      blockerCommentsOpen: number;
      requiredDeliverablesPresent: boolean;
      internalReviewPassed: boolean;
      clientApprovalRecorded: boolean;
    };
  } | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    void (async () => {
      try {
        const rows = await listMyProjects(token);
        setProjects(rows);
        setProjectId((prev) => prev || rows[0]?.projectId || "");
      } catch (e) {
        setError(em(e));
      }
    })();
  }, [token]);

  useEffect(() => {
    if (!token || !projectId) {
      setMilestones([]);
      setMilestoneId("");
      return;
    }
    void (async () => {
      try {
        const rows = await listMilestones(projectId, token);
        setMilestones(rows);
        setMilestoneId((prev) => (prev && rows.some((m) => m.id === prev) ? prev : rows[0]?.id ?? ""));
      } catch (e) {
        setError(em(e));
      }
    })();
  }, [token, projectId]);

  useEffect(() => {
    if (!token || !milestoneId) {
      setSections([]);
      setSectionId("");
      setClosable(null);
      return;
    }
    void (async () => {
      try {
        const [sRows, c] = await Promise.all([listSections(milestoneId, token), getMilestoneClosable(token, milestoneId)]);
        setSections(sRows);
        setSectionId((prev) => (prev && sRows.some((s) => s.id === prev) ? prev : sRows[0]?.id ?? ""));
        setClosable(c);
      } catch (e) {
        setError(em(e));
      }
    })();
  }, [token, milestoneId]);

  useEffect(() => {
    if (!token || !sectionId) {
      setTasks([]);
      setTaskId("");
      return;
    }
    void (async () => {
      try {
        const rows = await listTasksInSection(sectionId, token);
        setTasks(rows);
        setTaskId((prev) => (prev && rows.some((t) => t.id === prev) ? prev : rows[0]?.id ?? ""));
      } catch (e) {
        setError(em(e));
      }
    })();
  }, [token, sectionId]);

  const selectedProject = useMemo(() => projects.find((p) => p.projectId === projectId), [projects, projectId]);
  const selectedMilestone = useMemo(() => milestones.find((m) => m.id === milestoneId), [milestones, milestoneId]);
  const selectedTask = useMemo(() => tasks.find((t) => t.id === taskId), [tasks, taskId]);

  async function applyProjectTransition() {
    if (!token || !projectId) return;
    setBusy("project");
    setError(null);
    setSuccess(null);
    try {
      await transitionProjectState(token, projectId, projectNext, note || undefined);
      setSuccess("Project state updated.");
    } catch (e) {
      setError(em(e));
    } finally {
      setBusy(null);
    }
  }

  async function applyMilestoneTransition() {
    if (!token || !milestoneId) return;
    setBusy("milestone");
    setError(null);
    setSuccess(null);
    try {
      await transitionMilestoneState(token, milestoneId, milestoneNext, note || undefined);
      setSuccess("Milestone state updated.");
      const c = await getMilestoneClosable(token, milestoneId);
      setClosable(c);
    } catch (e) {
      setError(em(e));
    } finally {
      setBusy(null);
    }
  }

  async function applyTaskTransition() {
    if (!token || !taskId) return;
    setBusy("task");
    setError(null);
    setSuccess(null);
    try {
      await transitionTaskState(token, taskId, taskNext, note || undefined);
      setSuccess("Task state updated.");
      if (sectionId) {
        const rows = await listTasksInSection(sectionId, token);
        setTasks(rows);
      }
    } catch (e) {
      setError(em(e));
    } finally {
      setBusy(null);
    }
  }

  async function onUnlockNext() {
    if (!token || !milestoneId) return;
    setBusy("unlock");
    setError(null);
    setSuccess(null);
    try {
      const res = await unlockNextMilestone(token, milestoneId);
      if (res.unlocked) setSuccess("Next milestone unlocked.");
      else setError(res.reason ?? "Could not unlock next milestone.");
    } catch (e) {
      setError(em(e));
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-6">
      {success ? <p className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{success}</p> : null}
      {error ? <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p> : null}

      <section className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm space-y-3">
        <h3 className="text-sm font-semibold text-neutral-900">Workflow Scope</h3>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <select value={projectId} onChange={(e) => setProjectId(e.target.value)} className="rounded-md border border-neutral-300 px-3 py-2 text-sm">
            <option value="">Select project</option>
            {projects.map((p) => (
              <option key={p.projectId} value={p.projectId}>
                {p.name} ({p.code})
              </option>
            ))}
          </select>
          <select value={milestoneId} onChange={(e) => setMilestoneId(e.target.value)} className="rounded-md border border-neutral-300 px-3 py-2 text-sm" disabled={milestones.length === 0}>
            <option value="">{milestones.length ? "Select milestone" : "No milestones"}</option>
            {milestones.map((m) => (
              <option key={m.id} value={m.id}>
                {m.orderNo}. {m.name} ({m.state})
              </option>
            ))}
          </select>
          <select value={sectionId} onChange={(e) => setSectionId(e.target.value)} className="rounded-md border border-neutral-300 px-3 py-2 text-sm" disabled={sections.length === 0}>
            <option value="">{sections.length ? "Select section" : "No sections"}</option>
            {sections.map((s) => (
              <option key={s.id} value={s.id}>
                {s.orderNo}. {s.name}
              </option>
            ))}
          </select>
          <select value={taskId} onChange={(e) => setTaskId(e.target.value)} className="rounded-md border border-neutral-300 px-3 py-2 text-sm" disabled={tasks.length === 0}>
            <option value="">{tasks.length ? "Select task" : "No tasks"}</option>
            {tasks.map((t) => (
              <option key={t.id} value={t.id}>
                {t.title} ({t.state})
              </option>
            ))}
          </select>
        </div>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Audit note for this operation (recommended)"
          className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
          rows={3}
        />
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <article className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm space-y-3">
          <h4 className="text-sm font-semibold text-neutral-900">Project Transition</h4>
          <p className="text-xs text-neutral-500">Current: {selectedProject?.state ?? "—"}</p>
          <select value={projectNext} onChange={(e) => setProjectNext(e.target.value)} className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm">
            {PROJECT_STATES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          <button type="button" onClick={() => void applyProjectTransition()} disabled={!projectId || busy === "project"} className="rounded-md border border-neutral-900 bg-neutral-900 px-3 py-2 text-xs font-semibold text-white">
            {busy === "project" ? "Applying..." : "Apply project state"}
          </button>
        </article>

        <article className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm space-y-3">
          <h4 className="text-sm font-semibold text-neutral-900">Milestone Transition</h4>
          <p className="text-xs text-neutral-500">Current: {selectedMilestone?.state ?? "—"}</p>
          <select value={milestoneNext} onChange={(e) => setMilestoneNext(e.target.value)} className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm">
            {MILESTONE_STATES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          <button type="button" onClick={() => void applyMilestoneTransition()} disabled={!milestoneId || busy === "milestone"} className="rounded-md border border-neutral-900 bg-neutral-900 px-3 py-2 text-xs font-semibold text-white">
            {busy === "milestone" ? "Applying..." : "Apply milestone state"}
          </button>
        </article>

        <article className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm space-y-3">
          <h4 className="text-sm font-semibold text-neutral-900">Task Transition</h4>
          <p className="text-xs text-neutral-500">Current: {selectedTask?.state ?? "—"}</p>
          <select value={taskNext} onChange={(e) => setTaskNext(e.target.value)} className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm">
            {TASK_STATES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          <button type="button" onClick={() => void applyTaskTransition()} disabled={!taskId || busy === "task"} className="rounded-md border border-neutral-900 bg-neutral-900 px-3 py-2 text-xs font-semibold text-white">
            {busy === "task" ? "Applying..." : "Apply task state"}
          </button>
        </article>
      </section>

      <section className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm space-y-3">
        <h4 className="text-sm font-semibold text-neutral-900">Milestone Closability & Gate Control</h4>
        {closable ? (
          <div className="space-y-2 text-sm text-neutral-700">
            <p>
              Closable:{" "}
              <span className={closable.closable ? "font-semibold text-emerald-700" : "font-semibold text-red-700"}>
                {closable.closable ? "YES" : "NO"}
              </span>
            </p>
            <p>Mandatory tasks pending: {closable.checks.mandatoryNotApproved}</p>
            <p>Open blockers: {closable.checks.blockerCommentsOpen}</p>
            <p>Deliverables present: {closable.checks.requiredDeliverablesPresent ? "Yes" : "No"}</p>
            <p>Internal review passed: {closable.checks.internalReviewPassed ? "Yes" : "No"}</p>
            <p>Client approval recorded: {closable.checks.clientApprovalRecorded ? "Yes" : "No"}</p>
          </div>
        ) : (
          <p className="text-sm text-neutral-500">Select a milestone to run closability checks.</p>
        )}
        <button
          type="button"
          onClick={() => void onUnlockNext()}
          disabled={!milestoneId || busy === "unlock"}
          className="rounded-md border border-neutral-900 bg-neutral-900 px-3 py-2 text-xs font-semibold text-white"
        >
          {busy === "unlock" ? "Unlocking..." : "Unlock next milestone"}
        </button>
      </section>
    </div>
  );
}
