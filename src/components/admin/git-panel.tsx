"use client";

import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/contexts/auth-context";
import { ApiError } from "@/lib/api/http";
import { listMyProjects, type MyProjectRow } from "@/lib/api/workspace";
import {
  flattenSectionTasks,
  listMilestones,
  listSections,
  listTasksInSection,
  type TaskRow,
} from "@/lib/api/planning";
import { createGitLink, listGitLinks, type GitLinkRow } from "@/lib/api/git-admin";

function em(e: unknown): string {
  if (e instanceof ApiError) return e.message;
  if (e instanceof Error) return e.message;
  return "Something went wrong";
}

export function GitPanel() {
  const { accessToken } = useAuth();
  const token = accessToken ?? "";

  const [projects, setProjects] = useState<MyProjectRow[]>([]);
  const [projectId, setProjectId] = useState("");
  const [tasks, setTasks] = useState<TaskRow[]>([]);
  const [taskId, setTaskId] = useState("");
  const [rows, setRows] = useState<GitLinkRow[]>([]);
  const [repoId, setRepoId] = useState("");
  const [issueKey, setIssueKey] = useState("");
  const [workingBranch, setWorkingBranch] = useState("");
  const [pullRequestUrl, setPullRequestUrl] = useState("");
  const [releaseTag, setReleaseTag] = useState("");
  const [environment, setEnvironment] = useState("");
  const [commitRefsText, setCommitRefsText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

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
      setRows([]);
      return;
    }
    void (async () => {
      try {
        const list = await listGitLinks(token, projectId);
        setRows(list);
      } catch (e) {
        setError(em(e));
      }
    })();
  }, [token, projectId]);

  useEffect(() => {
    if (!token || !projectId) {
      setTasks([]);
      setTaskId("");
      return;
    }
    void (async () => {
      try {
        const milestones = await listMilestones(projectId, token);
        const sectionLists = await Promise.all(milestones.map((m) => listSections(m.id, token)));
        const flatSections = sectionLists.flat();
        const taskLists = await Promise.all(flatSections.map((s) => listTasksInSection(s.id, token)));
        const flatTasks = taskLists.flatMap((list) => flattenSectionTasks(list));
        setTasks(flatTasks);
        setTaskId((prev) => (prev && flatTasks.some((t) => t.id === prev) ? prev : ""));
      } catch {
        setTasks([]);
        setTaskId("");
      }
    })();
  }, [token, projectId]);

  const commitRefs = useMemo(
    () =>
      commitRefsText
        .split(/[\n,]/)
        .map((s) => s.trim())
        .filter(Boolean),
    [commitRefsText],
  );

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!token || !projectId || !repoId.trim()) return;
    setBusy(true);
    setError(null);
    setSuccess(null);
    try {
      await createGitLink(token, {
        projectId,
        ...(taskId ? { taskId } : {}),
        repoId: repoId.trim(),
        ...(issueKey.trim() ? { issueKey: issueKey.trim() } : {}),
        ...(workingBranch.trim() ? { workingBranch: workingBranch.trim() } : {}),
        ...(pullRequestUrl.trim() ? { pullRequestUrl: pullRequestUrl.trim() } : {}),
        ...(releaseTag.trim() ? { releaseTag: releaseTag.trim() } : {}),
        ...(environment.trim() ? { environment: environment.trim() } : {}),
        ...(commitRefs.length ? { commitRefs } : {}),
      });
      setSuccess("Git link created.");
      setRepoId("");
      setIssueKey("");
      setWorkingBranch("");
      setPullRequestUrl("");
      setReleaseTag("");
      setEnvironment("");
      setCommitRefsText("");
      const list = await listGitLinks(token, projectId);
      setRows(list);
    } catch (e) {
      setError(em(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      {success ? <p className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{success}</p> : null}
      {error ? <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p> : null}

      <section className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm space-y-3">
        <h3 className="text-sm font-semibold text-neutral-900">Create Git Mapping</h3>
        <form onSubmit={onCreate} className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          <select value={projectId} onChange={(e) => setProjectId(e.target.value)} className="rounded-md border border-neutral-300 px-3 py-2 text-sm">
            <option value="">Select project</option>
            {projects.map((p) => (
              <option key={p.projectId} value={p.projectId}>
                {p.name} ({p.code})
              </option>
            ))}
          </select>
          <select value={taskId} onChange={(e) => setTaskId(e.target.value)} className="rounded-md border border-neutral-300 px-3 py-2 text-sm">
            <option value="">Optional task link</option>
            {tasks.map((t) => (
              <option key={t.id} value={t.id}>
                {t.title}
              </option>
            ))}
          </select>
          <input value={repoId} onChange={(e) => setRepoId(e.target.value)} placeholder="Repo ID (required)" className="rounded-md border border-neutral-300 px-3 py-2 text-sm" />
          <input value={issueKey} onChange={(e) => setIssueKey(e.target.value)} placeholder="Issue key (e.g. PM-123)" className="rounded-md border border-neutral-300 px-3 py-2 text-sm" />
          <input value={workingBranch} onChange={(e) => setWorkingBranch(e.target.value)} placeholder="Working branch" className="rounded-md border border-neutral-300 px-3 py-2 text-sm" />
          <input value={releaseTag} onChange={(e) => setReleaseTag(e.target.value)} placeholder="Release tag" className="rounded-md border border-neutral-300 px-3 py-2 text-sm" />
          <input value={pullRequestUrl} onChange={(e) => setPullRequestUrl(e.target.value)} placeholder="Pull request URL" className="rounded-md border border-neutral-300 px-3 py-2 text-sm md:col-span-2" />
          <input value={environment} onChange={(e) => setEnvironment(e.target.value)} placeholder="Environment (staging/prod)" className="rounded-md border border-neutral-300 px-3 py-2 text-sm" />
          <textarea value={commitRefsText} onChange={(e) => setCommitRefsText(e.target.value)} placeholder="Commit refs (comma or newline separated)" className="rounded-md border border-neutral-300 px-3 py-2 text-sm md:col-span-2" rows={3} />
          <button type="submit" disabled={busy || !projectId || !repoId.trim()} className="rounded-md border border-neutral-900 bg-neutral-900 px-3 py-2 text-sm font-semibold text-white">
            {busy ? "Saving..." : "Create mapping"}
          </button>
        </form>
      </section>

      <section className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm">
        <h3 className="text-sm font-semibold text-neutral-900">Mapped Links</h3>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[980px] text-left text-sm">
            <thead className="border-b border-neutral-200 bg-neutral-50 text-xs font-semibold uppercase tracking-wide text-neutral-500">
              <tr>
                <th className="px-3 py-2">Project/Task</th>
                <th className="px-3 py-2">Repo</th>
                <th className="px-3 py-2">Issue</th>
                <th className="px-3 py-2">Branch</th>
                <th className="px-3 py-2">PR</th>
                <th className="px-3 py-2">Release</th>
                <th className="px-3 py-2">Env</th>
                <th className="px-3 py-2">Commit Refs</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {rows.map((r) => (
                <tr key={r.id} className="hover:bg-neutral-50/70">
                  <td className="px-3 py-2">
                    <p className="font-medium text-neutral-900">{r.project.name} ({r.project.code})</p>
                    <p className="text-xs text-neutral-500">{r.task?.title ?? "No task linked"}</p>
                  </td>
                  <td className="px-3 py-2 text-neutral-700">{r.repoId}</td>
                  <td className="px-3 py-2 text-neutral-700">{r.issueKey ?? "—"}</td>
                  <td className="px-3 py-2 text-neutral-700">{r.workingBranch ?? "—"}</td>
                  <td className="px-3 py-2 text-neutral-700">
                    {r.pullRequestUrl ? (
                      <a href={r.pullRequestUrl} target="_blank" rel="noreferrer" className="text-neutral-900 underline underline-offset-2">
                        Open PR
                      </a>
                    ) : "—"}
                  </td>
                  <td className="px-3 py-2 text-neutral-700">{r.releaseTag ?? "—"}</td>
                  <td className="px-3 py-2 text-neutral-700">{r.environment ?? "—"}</td>
                  <td className="px-3 py-2 text-neutral-700">
                    {r.commitRefs.length ? r.commitRefs.map((c) => c.commitHash.slice(0, 10)).join(", ") : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
