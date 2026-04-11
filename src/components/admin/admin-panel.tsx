"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import { ApiError } from "@/lib/api/http";
import {
  archiveClient,
  archiveMilestone,
  archiveProject,
  createClient,
  createMilestone,
  createProject,
  createWorkspace,
  listClients,
  listMyWorkspaces,
  listProjectsInWorkspace,
  addProjectMembers,
  updateMilestone,
  updateClient,
  updateProject,
} from "@/lib/api/workspace";
import type { ClientRow, MyWorkspaceRow, WorkspaceProjectRow } from "@/lib/api/workspace";
import {
  listMilestones,
  listSections,
  listTasksInSection,
} from "@/lib/api/planning";
import type { MilestoneRow, SectionRow, TaskRow } from "@/lib/api/planning";
import {
  archiveSection,
  archiveTask,
  assignTask,
  createSection,
  createTask,
  updateSection,
  updateTask,
} from "@/lib/api/tasks-admin";
import { listAdminUsers } from "@/lib/api/users";
import type { AdminUserRow } from "@/lib/api/users";
import { Spinner } from "@/components/ui/spinner";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/contexts/auth-context";

/** High-contrast primary actions (black / white). */
const ADMIN_PRIMARY_BTN =
  "inline-flex min-h-[40px] min-w-[8rem] items-center justify-center gap-2 rounded-md border border-neutral-950 bg-neutral-950 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-neutral-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-950 disabled:cursor-not-allowed disabled:opacity-40";

type PendingKey =
  | null
  | "workspace"
  | "client"
  | "project"
  | "milestone"
  | "section"
  | "task"
  | "members";

const PROJECT_ROLES = [
  "ADMIN",
  "SUB_ADMIN",
  "WORKER",
  "CLIENT_OWNER",
  "FINANCE",
  "AUDITOR",
] as const;

const PAYMENT_GATES = ["HARD_GATE", "SOFT_GATE", "NO_GATE"] as const;

function slugifyWorkspaceName(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function errMessage(e: unknown): string {
  if (e instanceof ApiError) return e.message;
  if (e instanceof Error) return e.message;
  return "Something went wrong";
}

function userOptionLabel(u: AdminUserRow): string {
  const n = u.name?.trim();
  return n ? `${n} (${u.email})` : u.email;
}

function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="text-xs font-medium text-neutral-600">{label}</span>
      {children}
    </label>
  );
}

function Card({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm">
      <h2 className="text-sm font-semibold text-neutral-900">{title}</h2>
      <div className="mt-5 space-y-5">{children}</div>
    </section>
  );
}

export function AdminPanel() {
  const { accessToken } = useAuth();
  const token = accessToken ?? "";

  const [banner, setBanner] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [workspaces, setWorkspaces] = useState<MyWorkspaceRow[]>([]);
  const [workspaceId, setWorkspaceId] = useState("");

  const [clients, setClients] = useState<ClientRow[]>([]);
  const [projects, setProjects] = useState<WorkspaceProjectRow[]>([]);
  const [clientId, setClientId] = useState("");
  const [projectId, setProjectId] = useState("");

  const [milestones, setMilestones] = useState<MilestoneRow[]>([]);
  const [milestoneId, setMilestoneId] = useState("");

  const [sections, setSections] = useState<SectionRow[]>([]);
  const [sectionId, setSectionId] = useState("");

  const [tasks, setTasks] = useState<TaskRow[]>([]);
  const [milestoneActionPending, setMilestoneActionPending] = useState<string | null>(null);
  const [milestoneEditId, setMilestoneEditId] = useState<string | null>(null);
  const [milestoneEditName, setMilestoneEditName] = useState("");
  const [milestoneEditOrderNo, setMilestoneEditOrderNo] = useState("1");
  const [milestoneEditBillingAmount, setMilestoneEditBillingAmount] = useState("");
  const [milestoneEditGate, setMilestoneEditGate] = useState<(typeof PAYMENT_GATES)[number]>("HARD_GATE");
  const [sectionActionPending, setSectionActionPending] = useState<string | null>(null);
  const [sectionEditId, setSectionEditId] = useState<string | null>(null);
  const [sectionEditName, setSectionEditName] = useState("");
  const [sectionEditOrderNo, setSectionEditOrderNo] = useState("1");
  const [taskActionPending, setTaskActionPending] = useState<string | null>(null);
  const [taskEditId, setTaskEditId] = useState<string | null>(null);
  const [taskEditTitle, setTaskEditTitle] = useState("");
  const [taskEditDueDate, setTaskEditDueDate] = useState("");
  const [taskEditClientVisible, setTaskEditClientVisible] = useState(false);

  const [memberSearchInput, setMemberSearchInput] = useState("");
  const [memberSearchDebounced, setMemberSearchDebounced] = useState("");
  const [adminUsers, setAdminUsers] = useState<AdminUserRow[]>([]);
  const [adminUsersLoading, setAdminUsersLoading] = useState(false);
  const [memberUsersError, setMemberUsersError] = useState<string | null>(null);
  const [pending, setPending] = useState<PendingKey>(null);
  const [clientActionPending, setClientActionPending] = useState<string | null>(null);
  const [clientEditId, setClientEditId] = useState<string | null>(null);
  const [clientEditName, setClientEditName] = useState("");
  const [clientEditLegalName, setClientEditLegalName] = useState("");
  const [clientEditBillingEmail, setClientEditBillingEmail] = useState("");
  const [clientEditPaymentPreference, setClientEditPaymentPreference] = useState("");
  const [projectActionPending, setProjectActionPending] = useState<string | null>(null);
  const [projectEditId, setProjectEditId] = useState<string | null>(null);
  const [projectEditName, setProjectEditName] = useState("");
  const [projectEditCode, setProjectEditCode] = useState("");
  const [projectEditDescription, setProjectEditDescription] = useState("");
  const [projectEditDueDate, setProjectEditDueDate] = useState("");
  const [loadingWorkspaces, setLoadingWorkspaces] = useState(false);
  const [loadingWorkspaceData, setLoadingWorkspaceData] = useState(false);
  const [loadingMilestones, setLoadingMilestones] = useState(false);
  const [loadingSections, setLoadingSections] = useState(false);
  const [loadingTasks, setLoadingTasks] = useState(false);
  const [workspaceNameInput, setWorkspaceNameInput] = useState("");
  const [workspaceSlugInput, setWorkspaceSlugInput] = useState("");
  const [workspaceSlugEdited, setWorkspaceSlugEdited] = useState(false);

  const busy = pending !== null;

  const refreshClients = useCallback(async () => {
    if (!token || !workspaceId) return;
    const c = await listClients(workspaceId, token);
    setClients(c);
    setClientId((prev) => (prev && c.some((x) => x.id === prev) ? prev : c[0]?.id ?? ""));
  }, [token, workspaceId]);

  const refreshProjects = useCallback(async () => {
    if (!token || !workspaceId) return;
    const p = await listProjectsInWorkspace(workspaceId, token);
    setProjects(p);
    setProjectId((prev) => (prev && p.some((x) => x.id === prev) ? prev : p[0]?.id ?? ""));
  }, [token, workspaceId]);

  const refreshWorkspaces = useCallback(async () => {
    if (!token) return;
    setLoadingWorkspaces(true);
    try {
      const list = await listMyWorkspaces(token);
      setWorkspaces(list);
      setWorkspaceId((prev) => {
        if (prev && list.some((w) => w.workspaceId === prev)) return prev;
        return list[0]?.workspaceId ?? "";
      });
    } finally {
      setLoadingWorkspaces(false);
    }
  }, [token]);

  useEffect(() => {
    void (async () => {
      if (!token) return;
      try {
        setError(null);
        await refreshWorkspaces();
      } catch (e) {
        setError(errMessage(e));
      }
    })();
  }, [token, refreshWorkspaces]);

  useEffect(() => {
    if (!token || !workspaceId) {
      setClients([]);
      setProjects([]);
      setClientId("");
      setProjectId("");
      setLoadingWorkspaceData(false);
      return;
    }
    void (async () => {
      setLoadingWorkspaceData(true);
      try {
        setError(null);
        const [c, p] = await Promise.all([listClients(workspaceId, token), listProjectsInWorkspace(workspaceId, token)]);
        setClients(c);
        setProjects(p);
        setClientId((prev) => (prev && c.some((x) => x.id === prev) ? prev : c[0]?.id ?? ""));
        // Do not auto-pick a project: that used to chain milestones → sections → tasks (slow waterfall).
        setProjectId((prev) => (prev && p.some((x) => x.id === prev) ? prev : ""));
      } catch (e) {
        setError(errMessage(e));
      } finally {
        setLoadingWorkspaceData(false);
      }
    })();
  }, [token, workspaceId]);

  useEffect(() => {
    if (!token || !projectId) {
      setMilestones([]);
      setMilestoneId("");
      setLoadingMilestones(false);
      return;
    }
    void (async () => {
      setLoadingMilestones(true);
      try {
        setError(null);
        const m = await listMilestones(projectId, token);
        setMilestones(m);
        setMilestoneId((prev) => (prev && m.some((x) => x.id === prev) ? prev : ""));
      } catch (e) {
        setError(errMessage(e));
      } finally {
        setLoadingMilestones(false);
      }
    })();
  }, [token, projectId]);

  useEffect(() => {
    if (!token || !milestoneId) {
      setSections([]);
      setSectionId("");
      setLoadingSections(false);
      return;
    }
    void (async () => {
      setLoadingSections(true);
      try {
        setError(null);
        const s = await listSections(milestoneId, token);
        setSections(s);
        setSectionId((prev) => (prev && s.some((x) => x.id === prev) ? prev : ""));
      } catch (e) {
        setError(errMessage(e));
      } finally {
        setLoadingSections(false);
      }
    })();
  }, [token, milestoneId]);

  useEffect(() => {
    const t = window.setTimeout(() => setMemberSearchDebounced(memberSearchInput), 300);
    return () => window.clearTimeout(t);
  }, [memberSearchInput]);

  useEffect(() => {
    if (!token) {
      setAdminUsers([]);
      setMemberUsersError(null);
      return;
    }
    void (async () => {
      setAdminUsersLoading(true);
      setMemberUsersError(null);
      try {
        const list = await listAdminUsers(token, memberSearchDebounced);
        setAdminUsers(list);
      } catch (e) {
        setAdminUsers([]);
        setMemberUsersError(errMessage(e));
      } finally {
        setAdminUsersLoading(false);
      }
    })();
  }, [token, memberSearchDebounced]);

  useEffect(() => {
    if (!token || !sectionId) {
      setTasks([]);
      setLoadingTasks(false);
      return;
    }
    void (async () => {
      setLoadingTasks(true);
      try {
        setError(null);
        const t = await listTasksInSection(sectionId, token);
        setTasks(t);
      } catch (e) {
        setError(errMessage(e));
      } finally {
        setLoadingTasks(false);
      }
    })();
  }, [token, sectionId]);

  return (
    <div className="w-full max-w-none space-y-8">
      <p className="text-sm leading-relaxed text-neutral-600">
        Create the hierarchy top-down: workspace → client → project → milestone → section → task. Add members by
        choosing a user below (select an active project first to enable Add member).
      </p>

      {(loadingWorkspaces ||
        loadingWorkspaceData ||
        loadingMilestones ||
        loadingSections ||
        loadingTasks) && (
        <div className="rounded-lg border border-neutral-200 bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center gap-2 text-xs font-medium text-neutral-600">
            <Spinner className="!h-3.5 !w-3.5 border-neutral-300 border-t-neutral-900" />
            Loading admin data...
          </div>
          <div className="grid gap-2 sm:grid-cols-3">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
          </div>
        </div>
      )}

      {banner && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
          {banner}
        </div>
      )}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">{error}</div>
      )}

      <Card title="1. Workspace">
        <form
          className="grid gap-3 sm:grid-cols-2"
          onSubmit={async (ev) => {
            ev.preventDefault();
            const name = workspaceNameInput.trim();
            const slug = workspaceSlugInput.trim().toLowerCase();
            if (!name || !slug) return;
            try {
              setPending("workspace");
              setError(null);
              setBanner(null);
              await createWorkspace(token, { name, slug });
              setBanner("Workspace created.");
              setWorkspaceNameInput("");
              setWorkspaceSlugInput("");
              setWorkspaceSlugEdited(false);
              await refreshWorkspaces();
            } catch (e) {
              setError(errMessage(e));
            } finally {
              setPending(null);
            }
          }}
        >
          <Field label="Name">
            <input
              name="wsName"
              required
              value={workspaceNameInput}
              onChange={(e) => {
                const nextName = e.target.value;
                setWorkspaceNameInput(nextName);
                if (!workspaceSlugEdited) {
                  setWorkspaceSlugInput(slugifyWorkspaceName(nextName));
                }
              }}
              className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
              placeholder="Acme Delivery"
            />
          </Field>
          <Field label="Slug">
            <input
              name="wsSlug"
              required
              value={workspaceSlugInput}
              onChange={(e) => {
                setWorkspaceSlugEdited(true);
                setWorkspaceSlugInput(slugifyWorkspaceName(e.target.value));
              }}
              onBlur={() => {
                if (!workspaceSlugInput.trim() && workspaceNameInput.trim()) {
                  setWorkspaceSlugInput(slugifyWorkspaceName(workspaceNameInput));
                  setWorkspaceSlugEdited(false);
                }
              }}
              className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
              placeholder="acme-delivery"
              pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
              title="Lowercase letters, numbers, hyphens"
            />
          </Field>
          <div className="sm:col-span-2">
            <button
              type="submit"
              disabled={busy}
              className={ADMIN_PRIMARY_BTN}
            >
              {pending === "workspace" ? <Spinner className="!h-4 !w-4 border-neutral-600 border-t-white" /> : null}
              {pending === "workspace" ? "Creating…" : "Create workspace"}
            </button>
          </div>
        </form>

        <Field label="Active workspace">
          <select
            value={workspaceId}
            onChange={(e) => setWorkspaceId(e.target.value)}
            className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
          >
            <option value="">Select…</option>
            {workspaces.map((w) => (
              <option key={w.workspaceId} value={w.workspaceId}>
                {w.name} ({w.slug})
              </option>
            ))}
          </select>
        </Field>
      </Card>

      <Card title="2. Client">
        <form
          className="grid gap-3 sm:grid-cols-2"
          onSubmit={async (ev) => {
            ev.preventDefault();
            const form = ev.currentTarget;
            if (!workspaceId) {
              setError("Select a workspace first.");
              return;
            }
            const fd = new FormData(form);
            const name = String(fd.get("clientName") ?? "").trim();
            const legalName = String(fd.get("clientLegalName") ?? "").trim();
            const billingEmail = String(fd.get("clientBillingEmail") ?? "").trim();
            const paymentPreference = String(fd.get("clientPaymentPreference") ?? "").trim();
            if (!name) return;
            try {
              setPending("client");
              setError(null);
              setBanner(null);
              const created = await createClient(token, {
                workspaceId,
                name,
                ...(legalName ? { legalName } : {}),
                ...(billingEmail ? { billingEmail } : {}),
                ...(paymentPreference ? { paymentPreference } : {}),
              });
              setBanner("Client created.");
              form.reset();
              setClients((prev) => [created, ...prev]);
              setClientId(created.id);
            } catch (e) {
              setError(errMessage(e));
            } finally {
              setPending(null);
            }
          }}
        >
          <Field label="Client name">
            <input
              name="clientName"
              required
              className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
              placeholder="Acme Corp"
            />
          </Field>
          <Field label="Legal name (optional)">
            <input
              name="clientLegalName"
              className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
              placeholder="Acme Corporation Pvt Ltd"
            />
          </Field>
          <Field label="Billing email (optional)">
            <input
              name="clientBillingEmail"
              type="email"
              className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
              placeholder="billing@acme.com"
            />
          </Field>
          <Field label="Payment preference (optional)">
            <input
              name="clientPaymentPreference"
              className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
              placeholder="Net 15 / Bank transfer"
            />
          </Field>
          <div className="flex items-end">
            <button
              type="submit"
              disabled={busy || !workspaceId}
              className={ADMIN_PRIMARY_BTN}
            >
              {pending === "client" ? <Spinner className="!h-4 !w-4 border-neutral-600 border-t-white" /> : null}
              {pending === "client" ? "Creating…" : "Create client"}
            </button>
          </div>
        </form>

        {loadingWorkspaceData ? (
          <div className="rounded-lg border border-neutral-100 bg-neutral-50 p-3">
            <p className="mb-2 text-xs font-medium text-neutral-600">Loading clients...</p>
            <div className="space-y-2">
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
            </div>
          </div>
        ) : clients.length > 0 ? (
          <div className="rounded-lg border border-neutral-100 bg-neutral-50 p-3">
            <p className="text-xs font-medium text-neutral-600">Manage clients</p>
            <div className="mt-2 overflow-x-auto">
              <table className="w-full min-w-[680px] text-left text-sm">
                <thead className="text-xs uppercase tracking-wide text-neutral-500">
                  <tr>
                    <th className="px-2 py-2 font-semibold">Name</th>
                    <th className="px-2 py-2 font-semibold">Legal</th>
                    <th className="px-2 py-2 font-semibold">Billing</th>
                    <th className="px-2 py-2 font-semibold">Payment pref</th>
                    <th className="px-2 py-2 text-right font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200">
                  {clients.map((c) => {
                    const editing = clientEditId === c.id;
                    const rowBusy = clientActionPending === `save:${c.id}` || clientActionPending === `archive:${c.id}`;
                    return (
                      <tr key={c.id}>
                        <td className="px-2 py-2 align-top">
                          {editing ? (
                            <input
                              value={clientEditName}
                              onChange={(e) => setClientEditName(e.target.value)}
                              className="w-full rounded-md border border-neutral-300 px-2 py-1.5 text-sm"
                            />
                          ) : (
                            <span className="font-medium text-neutral-900">{c.name}</span>
                          )}
                        </td>
                        <td className="px-2 py-2 align-top">
                          {editing ? (
                            <input
                              value={clientEditLegalName}
                              onChange={(e) => setClientEditLegalName(e.target.value)}
                              className="w-full rounded-md border border-neutral-300 px-2 py-1.5 text-sm"
                            />
                          ) : (
                            <span className="text-neutral-700">{c.legalName || "—"}</span>
                          )}
                        </td>
                        <td className="px-2 py-2 align-top">
                          {editing ? (
                            <input
                              value={clientEditBillingEmail}
                              onChange={(e) => setClientEditBillingEmail(e.target.value)}
                              className="w-full rounded-md border border-neutral-300 px-2 py-1.5 text-sm"
                            />
                          ) : (
                            <span className="text-neutral-700">{c.billingEmail || "—"}</span>
                          )}
                        </td>
                        <td className="px-2 py-2 align-top">
                          {editing ? (
                            <input
                              value={clientEditPaymentPreference}
                              onChange={(e) => setClientEditPaymentPreference(e.target.value)}
                              className="w-full rounded-md border border-neutral-300 px-2 py-1.5 text-sm"
                            />
                          ) : (
                            <span className="text-neutral-700">{c.paymentPreference || "—"}</span>
                          )}
                        </td>
                        <td className="px-2 py-2 align-top">
                          <div className="flex justify-end gap-2">
                            {editing ? (
                              <>
                                <button
                                  type="button"
                                  disabled={rowBusy}
                                  onClick={async () => {
                                    try {
                                      setClientActionPending(`save:${c.id}`);
                                      setError(null);
                                      setBanner(null);
                                      await updateClient(token, c.id, {
                                        name: clientEditName.trim(),
                                        legalName: clientEditLegalName.trim() || null,
                                        billingEmail: clientEditBillingEmail.trim() || null,
                                        paymentPreference: clientEditPaymentPreference.trim() || null,
                                      });
                                      await refreshClients();
                                      setClientEditId(null);
                                      setBanner("Client updated.");
                                    } catch (e) {
                                      setError(errMessage(e));
                                    } finally {
                                      setClientActionPending(null);
                                    }
                                  }}
                                  className="rounded-md border border-neutral-800 bg-neutral-900 px-3 py-1.5 text-xs font-semibold text-white"
                                >
                                  {clientActionPending === `save:${c.id}` ? "Saving..." : "Save"}
                                </button>
                                <button
                                  type="button"
                                  disabled={rowBusy}
                                  onClick={() => setClientEditId(null)}
                                  className="rounded-md border border-neutral-200 bg-white px-3 py-1.5 text-xs font-semibold text-neutral-700"
                                >
                                  Cancel
                                </button>
                              </>
                            ) : (
                              <>
                                <button
                                  type="button"
                                  disabled={!!clientActionPending}
                                  onClick={() => {
                                    setClientEditId(c.id);
                                    setClientEditName(c.name);
                                    setClientEditLegalName(c.legalName ?? "");
                                    setClientEditBillingEmail(c.billingEmail ?? "");
                                    setClientEditPaymentPreference(c.paymentPreference ?? "");
                                  }}
                                  className="rounded-md border border-neutral-200 bg-white px-3 py-1.5 text-xs font-semibold text-neutral-700"
                                >
                                  Edit
                                </button>
                                <button
                                  type="button"
                                  disabled={!!clientActionPending}
                                  onClick={async () => {
                                    const yes = window.confirm(`Archive client "${c.name}"?`);
                                    if (!yes) return;
                                    try {
                                      setClientActionPending(`archive:${c.id}`);
                                      setError(null);
                                      setBanner(null);
                                      await archiveClient(token, c.id);
                                      await refreshClients();
                                      setBanner("Client archived.");
                                    } catch (e) {
                                      setError(errMessage(e));
                                    } finally {
                                      setClientActionPending(null);
                                    }
                                  }}
                                  className="rounded-md border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700"
                                >
                                  {clientActionPending === `archive:${c.id}` ? "Archiving..." : "Archive"}
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ) : null}
      </Card>

      <Card title="3. Project">
        <form
          className="grid gap-3 sm:grid-cols-2"
          onSubmit={async (ev) => {
            ev.preventDefault();
            const form = ev.currentTarget;
            if (!workspaceId || !clientId) {
              setError("Select workspace and client.");
              return;
            }
            const fd = new FormData(form);
            const name = String(fd.get("projName") ?? "").trim();
            const code = String(fd.get("projCode") ?? "").trim();
            if (!name || !code) return;
            try {
              setPending("project");
              setError(null);
              setBanner(null);
              const created = await createProject(token, {
                workspaceId,
                clientId,
                name,
                code,
              });
              setBanner("Project created.");
              form.reset();
              const selectedClientName =
                clients.find((c) => c.id === created.clientId)?.name ?? "Client";
              setProjects((prev) => [
                {
                  ...created,
                  client: created.client ?? { name: selectedClientName },
                },
                ...prev,
              ]);
              setProjectId(created.id);
            } catch (e) {
              setError(errMessage(e));
            } finally {
              setPending(null);
            }
          }}
        >
          <Field label="Client">
            <select
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
            >
              <option value="">Select…</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Project name">
            <input
              name="projName"
              required
              className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
              placeholder="Website rebuild"
            />
          </Field>
          <Field label="Code">
            <input
              name="projCode"
              required
              className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
              placeholder="WEB-2026"
            />
          </Field>
          <div className="flex items-end">
            <button
              type="submit"
              disabled={busy || !workspaceId || !clientId}
              className={ADMIN_PRIMARY_BTN}
            >
              {pending === "project" ? <Spinner className="!h-4 !w-4 border-neutral-600 border-t-white" /> : null}
              {pending === "project" ? "Creating…" : "Create project"}
            </button>
          </div>
        </form>

        {loadingWorkspaceData ? (
          <div className="rounded-lg border border-neutral-100 bg-neutral-50 p-3">
            <p className="mb-2 text-xs font-medium text-neutral-600">Loading projects...</p>
            <div className="space-y-2">
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
            </div>
          </div>
        ) : projects.length > 0 ? (
          <div className="rounded-lg border border-neutral-100 bg-neutral-50 p-3">
            <p className="text-xs font-medium text-neutral-600">Manage projects</p>
            <div className="mt-2 overflow-x-auto">
              <table className="w-full min-w-[820px] text-left text-sm">
                <thead className="text-xs uppercase tracking-wide text-neutral-500">
                  <tr>
                    <th className="px-2 py-2 font-semibold">Name</th>
                    <th className="px-2 py-2 font-semibold">Code</th>
                    <th className="px-2 py-2 font-semibold">Client</th>
                    <th className="px-2 py-2 font-semibold">Description</th>
                    <th className="px-2 py-2 font-semibold">Due date</th>
                    <th className="px-2 py-2 text-right font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200">
                  {projects.map((p) => {
                    const editing = projectEditId === p.id;
                    const rowBusy = projectActionPending === `save:${p.id}` || projectActionPending === `archive:${p.id}`;
                    return (
                      <tr key={p.id}>
                        <td className="px-2 py-2 align-top">
                          {editing ? (
                            <input
                              value={projectEditName}
                              onChange={(e) => setProjectEditName(e.target.value)}
                              className="w-full rounded-md border border-neutral-300 px-2 py-1.5 text-sm"
                            />
                          ) : (
                            <span className="font-medium text-neutral-900">{p.name}</span>
                          )}
                        </td>
                        <td className="px-2 py-2 align-top">
                          {editing ? (
                            <input
                              value={projectEditCode}
                              onChange={(e) => setProjectEditCode(e.target.value)}
                              className="w-full rounded-md border border-neutral-300 px-2 py-1.5 text-sm"
                            />
                          ) : (
                            <span className="font-mono text-xs text-neutral-700">{p.code}</span>
                          )}
                        </td>
                        <td className="px-2 py-2 align-top">
                          <span className="text-neutral-700">{p.client?.name ?? "—"}</span>
                        </td>
                        <td className="px-2 py-2 align-top">
                          {editing ? (
                            <input
                              value={projectEditDescription}
                              onChange={(e) => setProjectEditDescription(e.target.value)}
                              className="w-full rounded-md border border-neutral-300 px-2 py-1.5 text-sm"
                            />
                          ) : (
                            <span className="text-neutral-700">{p.description || "—"}</span>
                          )}
                        </td>
                        <td className="px-2 py-2 align-top">
                          {editing ? (
                            <input
                              type="date"
                              value={projectEditDueDate}
                              onChange={(e) => setProjectEditDueDate(e.target.value)}
                              className="w-full rounded-md border border-neutral-300 px-2 py-1.5 text-sm"
                            />
                          ) : (
                            <span className="text-neutral-700">{p.dueDate ? new Date(p.dueDate).toLocaleDateString() : "—"}</span>
                          )}
                        </td>
                        <td className="px-2 py-2 align-top">
                          <div className="flex justify-end gap-2">
                            {editing ? (
                              <>
                                <button
                                  type="button"
                                  disabled={rowBusy}
                                  onClick={async () => {
                                    try {
                                      setProjectActionPending(`save:${p.id}`);
                                      setError(null);
                                      setBanner(null);
                                      await updateProject(token, p.id, {
                                        name: projectEditName.trim(),
                                        code: projectEditCode.trim(),
                                        description: projectEditDescription.trim() || null,
                                        dueDate: projectEditDueDate ? new Date(projectEditDueDate).toISOString() : null,
                                      });
                                      await refreshProjects();
                                      setProjectEditId(null);
                                      setBanner("Project updated.");
                                    } catch (e) {
                                      setError(errMessage(e));
                                    } finally {
                                      setProjectActionPending(null);
                                    }
                                  }}
                                  className="rounded-md border border-neutral-800 bg-neutral-900 px-3 py-1.5 text-xs font-semibold text-white"
                                >
                                  {projectActionPending === `save:${p.id}` ? "Saving..." : "Save"}
                                </button>
                                <button
                                  type="button"
                                  disabled={rowBusy}
                                  onClick={() => setProjectEditId(null)}
                                  className="rounded-md border border-neutral-200 bg-white px-3 py-1.5 text-xs font-semibold text-neutral-700"
                                >
                                  Cancel
                                </button>
                              </>
                            ) : (
                              <>
                                <button
                                  type="button"
                                  disabled={!!projectActionPending}
                                  onClick={() => {
                                    setProjectEditId(p.id);
                                    setProjectEditName(p.name);
                                    setProjectEditCode(p.code);
                                    setProjectEditDescription(p.description ?? "");
                                    setProjectEditDueDate(p.dueDate ? new Date(p.dueDate).toISOString().slice(0, 10) : "");
                                  }}
                                  className="rounded-md border border-neutral-200 bg-white px-3 py-1.5 text-xs font-semibold text-neutral-700"
                                >
                                  Edit
                                </button>
                                <button
                                  type="button"
                                  disabled={!!projectActionPending}
                                  onClick={async () => {
                                    const yes = window.confirm(`Archive project "${p.name}"?`);
                                    if (!yes) return;
                                    try {
                                      setProjectActionPending(`archive:${p.id}`);
                                      setError(null);
                                      setBanner(null);
                                      await archiveProject(token, p.id);
                                      await refreshProjects();
                                      setBanner("Project archived.");
                                    } catch (e) {
                                      setError(errMessage(e));
                                    } finally {
                                      setProjectActionPending(null);
                                    }
                                  }}
                                  className="rounded-md border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700"
                                >
                                  {projectActionPending === `archive:${p.id}` ? "Archiving..." : "Archive"}
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ) : null}

        <Field label="Active project (for milestones & members)">
          <select
            value={projectId}
            onChange={(e) => setProjectId(e.target.value)}
            className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
          >
            <option value="">Select…</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} ({p.code})
              </option>
            ))}
          </select>
        </Field>
      </Card>

      <Card title="4. Milestone">
        <form
          className="grid gap-3 sm:grid-cols-2"
          onSubmit={async (ev) => {
            ev.preventDefault();
            const form = ev.currentTarget;
            if (!projectId) {
              setError("Select a project.");
              return;
            }
            const fd = new FormData(form);
            const name = String(fd.get("msName") ?? "").trim();
            const orderNo = Number(fd.get("msOrder") ?? 1);
            const billingRaw = String(fd.get("msBilling") ?? "").trim();
            const billingAmount = billingRaw === "" ? undefined : Number(billingRaw);
            const paymentGateMode = String(fd.get("msGate") ?? "HARD_GATE") as (typeof PAYMENT_GATES)[number];
            if (!name || Number.isNaN(orderNo)) return;
            try {
              setPending("milestone");
              setError(null);
              setBanner(null);
              const created = await createMilestone(token, {
                projectId,
                name,
                orderNo,
                ...(billingAmount !== undefined && !Number.isNaN(billingAmount) ? { billingAmount } : {}),
                paymentGateMode,
              });
              setBanner("Milestone created.");
              form.reset();
              setMilestones((prev) =>
                [...prev, created].sort((a, b) => a.orderNo - b.orderNo),
              );
              setMilestoneId(created.id);
            } catch (e) {
              setError(errMessage(e));
            } finally {
              setPending(null);
            }
          }}
        >
          <Field label="Name">
            <input
              name="msName"
              required
              className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
              placeholder="Discovery"
            />
          </Field>
          <Field label="Order #">
            <input
              name="msOrder"
              type="number"
              min={1}
              defaultValue={1}
              className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
            />
          </Field>
          <Field label="Billing amount (optional)">
            <input
              name="msBilling"
              type="number"
              step="0.01"
              min={0}
              className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
              placeholder="10000"
            />
          </Field>
          <Field label="Payment gate">
            <select name="msGate" defaultValue="HARD_GATE" className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm">
              {PAYMENT_GATES.map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>
          </Field>
          <div className="sm:col-span-2">
            <button
              type="submit"
              disabled={busy || !projectId}
              className={ADMIN_PRIMARY_BTN}
            >
              {pending === "milestone" ? <Spinner className="!h-4 !w-4 border-neutral-600 border-t-white" /> : null}
              {pending === "milestone" ? "Creating…" : "Create milestone"}
            </button>
          </div>
        </form>

        <Field label="Active milestone">
          <select
            value={milestoneId}
            onChange={(e) => setMilestoneId(e.target.value)}
            className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
          >
            <option value="">Select…</option>
            {milestones.map((m) => (
              <option key={m.id} value={m.id}>
                {m.orderNo}. {m.name}
              </option>
            ))}
          </select>
        </Field>

        {milestones.length > 0 ? (
          <div className="rounded-lg border border-neutral-100 bg-neutral-50 p-3">
            <p className="text-xs font-medium text-neutral-600">Manage milestones</p>
            <div className="mt-2 overflow-x-auto">
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead className="text-xs uppercase tracking-wide text-neutral-500">
                  <tr>
                    <th className="px-2 py-2 font-semibold">Name</th>
                    <th className="px-2 py-2 font-semibold">Order</th>
                    <th className="px-2 py-2 font-semibold">Billing</th>
                    <th className="px-2 py-2 font-semibold">Gate</th>
                    <th className="px-2 py-2 text-right font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200">
                  {milestones.map((m) => {
                    const editing = milestoneEditId === m.id;
                    const rowBusy =
                      milestoneActionPending === `save:${m.id}` ||
                      milestoneActionPending === `archive:${m.id}`;
                    return (
                      <tr key={m.id}>
                        <td className="px-2 py-2">
                          {editing ? (
                            <input value={milestoneEditName} onChange={(e) => setMilestoneEditName(e.target.value)} className="w-full rounded-md border border-neutral-300 px-2 py-1.5 text-sm" />
                          ) : (
                            <span className="font-medium text-neutral-900">{m.name}</span>
                          )}
                        </td>
                        <td className="px-2 py-2">
                          {editing ? (
                            <input type="number" min={1} value={milestoneEditOrderNo} onChange={(e) => setMilestoneEditOrderNo(e.target.value)} className="w-24 rounded-md border border-neutral-300 px-2 py-1.5 text-sm" />
                          ) : (
                            <span className="text-neutral-700">{m.orderNo}</span>
                          )}
                        </td>
                        <td className="px-2 py-2">
                          {editing ? (
                            <input type="number" step="0.01" min={0} value={milestoneEditBillingAmount} onChange={(e) => setMilestoneEditBillingAmount(e.target.value)} className="w-32 rounded-md border border-neutral-300 px-2 py-1.5 text-sm" />
                          ) : (
                            <span className="text-neutral-700">{m.billingAmount ?? "—"}</span>
                          )}
                        </td>
                        <td className="px-2 py-2">
                          {editing ? (
                            <select value={milestoneEditGate} onChange={(e) => setMilestoneEditGate(e.target.value as (typeof PAYMENT_GATES)[number])} className="rounded-md border border-neutral-300 px-2 py-1.5 text-sm">
                              {PAYMENT_GATES.map((g) => (
                                <option key={g} value={g}>{g}</option>
                              ))}
                            </select>
                          ) : (
                            <span className="text-neutral-700">{m.paymentGateMode}</span>
                          )}
                        </td>
                        <td className="px-2 py-2 text-right">
                          <div className="inline-flex gap-2">
                            {editing ? (
                              <>
                                <button
                                  type="button"
                                  disabled={rowBusy}
                                  onClick={async () => {
                                    try {
                                      setMilestoneActionPending(`save:${m.id}`);
                                      setError(null);
                                      setBanner(null);
                                      await updateMilestone(token, m.id, {
                                        name: milestoneEditName.trim(),
                                        orderNo: Number(milestoneEditOrderNo),
                                        billingAmount:
                                          milestoneEditBillingAmount.trim() === ""
                                            ? null
                                            : Number(milestoneEditBillingAmount),
                                        paymentGateMode: milestoneEditGate,
                                      });
                                      setMilestoneEditId(null);
                                      const refreshed = await listMilestones(projectId, token);
                                      setMilestones(refreshed);
                                      setBanner("Milestone updated.");
                                    } catch (e) {
                                      setError(errMessage(e));
                                    } finally {
                                      setMilestoneActionPending(null);
                                    }
                                  }}
                                  className="rounded-md border border-neutral-800 bg-neutral-900 px-3 py-1.5 text-xs font-semibold text-white"
                                >
                                  {milestoneActionPending === `save:${m.id}` ? "Saving..." : "Save"}
                                </button>
                                <button type="button" disabled={rowBusy} onClick={() => setMilestoneEditId(null)} className="rounded-md border border-neutral-200 bg-white px-3 py-1.5 text-xs font-semibold text-neutral-700">
                                  Cancel
                                </button>
                              </>
                            ) : (
                              <>
                                <button
                                  type="button"
                                  disabled={!!milestoneActionPending}
                                  onClick={() => {
                                    setMilestoneEditId(m.id);
                                    setMilestoneEditName(m.name);
                                    setMilestoneEditOrderNo(String(m.orderNo));
                                    setMilestoneEditBillingAmount(m.billingAmount ?? "");
                                    setMilestoneEditGate((m.paymentGateMode as (typeof PAYMENT_GATES)[number]) ?? "HARD_GATE");
                                  }}
                                  className="rounded-md border border-neutral-200 bg-white px-3 py-1.5 text-xs font-semibold text-neutral-700"
                                >
                                  Edit
                                </button>
                                <button
                                  type="button"
                                  disabled={!!milestoneActionPending}
                                  onClick={async () => {
                                    if (!window.confirm(`Archive milestone "${m.name}"?`)) return;
                                    try {
                                      setMilestoneActionPending(`archive:${m.id}`);
                                      setError(null);
                                      setBanner(null);
                                      await archiveMilestone(token, m.id);
                                      const refreshed = await listMilestones(projectId, token);
                                      setMilestones(refreshed);
                                      setMilestoneId((prev) => (prev === m.id ? "" : prev));
                                      setBanner("Milestone archived.");
                                    } catch (e) {
                                      setError(errMessage(e));
                                    } finally {
                                      setMilestoneActionPending(null);
                                    }
                                  }}
                                  className="rounded-md border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700"
                                >
                                  {milestoneActionPending === `archive:${m.id}` ? "Archiving..." : "Archive"}
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ) : null}
      </Card>

      <Card title="5. Section">
        <form
          className="grid gap-3 sm:grid-cols-2"
          onSubmit={async (ev) => {
            ev.preventDefault();
            const form = ev.currentTarget;
            if (!milestoneId) {
              setError("Select a milestone.");
              return;
            }
            const fd = new FormData(form);
            const name = String(fd.get("secName") ?? "").trim();
            const orderNo = Number(fd.get("secOrder") ?? 1);
            if (!name || Number.isNaN(orderNo)) return;
            try {
              setPending("section");
              setError(null);
              setBanner(null);
              const created = await createSection(token, {
                milestoneId,
                name,
                orderNo,
              });
              setBanner("Section created.");
              form.reset();
              setSections((prev) =>
                [...prev, created].sort((a, b) => a.orderNo - b.orderNo),
              );
              setSectionId(created.id);
            } catch (e) {
              setError(errMessage(e));
            } finally {
              setPending(null);
            }
          }}
        >
          <Field label="Name">
            <input
              name="secName"
              required
              className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
              placeholder="Backlog"
            />
          </Field>
          <Field label="Order #">
            <input
              name="secOrder"
              type="number"
              min={1}
              defaultValue={1}
              className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
            />
          </Field>
          <div className="sm:col-span-2">
            <button
              type="submit"
              disabled={busy || !milestoneId}
              className={ADMIN_PRIMARY_BTN}
            >
              {pending === "section" ? <Spinner className="!h-4 !w-4 border-neutral-600 border-t-white" /> : null}
              {pending === "section" ? "Creating…" : "Create section"}
            </button>
          </div>
        </form>

        <Field label="Active section">
          <select
            value={sectionId}
            onChange={(e) => setSectionId(e.target.value)}
            className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
          >
            <option value="">Select…</option>
            {sections.map((s) => (
              <option key={s.id} value={s.id}>
                {s.orderNo}. {s.name}
              </option>
            ))}
          </select>
        </Field>

        {sections.length > 0 ? (
          <div className="rounded-lg border border-neutral-100 bg-neutral-50 p-3">
            <p className="text-xs font-medium text-neutral-600">Manage sections</p>
            <ul className="mt-2 space-y-2">
              {sections.map((s) => {
                const editing = sectionEditId === s.id;
                const rowBusy =
                  sectionActionPending === `save:${s.id}` ||
                  sectionActionPending === `archive:${s.id}`;
                return (
                  <li key={s.id} className="rounded-md border border-neutral-200 bg-white px-3 py-2">
                    <div className="flex flex-wrap items-center gap-2">
                      {editing ? (
                        <>
                          <input value={sectionEditName} onChange={(e) => setSectionEditName(e.target.value)} className="rounded-md border border-neutral-300 px-2 py-1 text-sm" />
                          <input type="number" min={1} value={sectionEditOrderNo} onChange={(e) => setSectionEditOrderNo(e.target.value)} className="w-24 rounded-md border border-neutral-300 px-2 py-1 text-sm" />
                        </>
                      ) : (
                        <span className="text-sm font-medium text-neutral-900">
                          {s.orderNo}. {s.name}
                        </span>
                      )}
                      <div className="ml-auto flex gap-2">
                        {editing ? (
                          <>
                            <button
                              type="button"
                              disabled={rowBusy}
                              onClick={async () => {
                                try {
                                  setSectionActionPending(`save:${s.id}`);
                                  setError(null);
                                  setBanner(null);
                                  await updateSection(token, s.id, {
                                    name: sectionEditName.trim(),
                                    orderNo: Number(sectionEditOrderNo),
                                  });
                                  setSectionEditId(null);
                                  const refreshed = await listSections(milestoneId, token);
                                  setSections(refreshed);
                                  setBanner("Section updated.");
                                } catch (e) {
                                  setError(errMessage(e));
                                } finally {
                                  setSectionActionPending(null);
                                }
                              }}
                              className="rounded-md border border-neutral-800 bg-neutral-900 px-2.5 py-1 text-xs font-semibold text-white"
                            >
                              {sectionActionPending === `save:${s.id}` ? "Saving..." : "Save"}
                            </button>
                            <button type="button" disabled={rowBusy} onClick={() => setSectionEditId(null)} className="rounded-md border border-neutral-200 bg-white px-2.5 py-1 text-xs font-semibold text-neutral-700">
                              Cancel
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              type="button"
                              disabled={!!sectionActionPending}
                              onClick={() => {
                                setSectionEditId(s.id);
                                setSectionEditName(s.name);
                                setSectionEditOrderNo(String(s.orderNo));
                              }}
                              className="rounded-md border border-neutral-200 bg-white px-2.5 py-1 text-xs font-semibold text-neutral-700"
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              disabled={!!sectionActionPending}
                              onClick={async () => {
                                if (!window.confirm(`Archive section "${s.name}"?`)) return;
                                try {
                                  setSectionActionPending(`archive:${s.id}`);
                                  setError(null);
                                  setBanner(null);
                                  await archiveSection(token, s.id);
                                  const refreshed = await listSections(milestoneId, token);
                                  setSections(refreshed);
                                  setSectionId((prev) => (prev === s.id ? "" : prev));
                                  setBanner("Section archived.");
                                } catch (e) {
                                  setError(errMessage(e));
                                } finally {
                                  setSectionActionPending(null);
                                }
                              }}
                              className="rounded-md border border-red-200 bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-700"
                            >
                              {sectionActionPending === `archive:${s.id}` ? "Archiving..." : "Archive"}
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        ) : null}
      </Card>

      <Card title="6. Task">
        <form
          className="grid gap-3 sm:grid-cols-2"
          onSubmit={async (ev) => {
            ev.preventDefault();
            const form = ev.currentTarget;
            if (!sectionId) {
              setError("Select a section.");
              return;
            }
            const fd = new FormData(form);
            const title = String(fd.get("taskTitle") ?? "").trim();
            const due = String(fd.get("taskDue") ?? "").trim();
            const clientVisible = fd.get("taskClientVisible") === "on";
            if (!title) return;
            const assigneeId = String(fd.get("taskAssigneeId") ?? "").trim();
            const parentTaskId = String(fd.get("taskParentId") ?? "").trim();
            try {
              setPending("task");
              setError(null);
              setBanner(null);
              const created = await createTask(token, {
                sectionId,
                title,
                ...(due ? { dueDate: new Date(due).toISOString() } : {}),
                clientVisible,
                ...(parentTaskId ? { parentTaskId } : {}),
              });
              if (assigneeId) {
                await assignTask(token, created.id, { userId: assigneeId });
                setBanner("Task created and assigned — the user will see it under Tasks and Overview.");
              } else {
                setBanner("Task created. Assign it below or the worker won’t see it in their task list.");
              }
              form.reset();
              const refreshed = await listTasksInSection(sectionId, token);
              setTasks(refreshed);
            } catch (e) {
              setError(errMessage(e));
            } finally {
              setPending(null);
            }
          }}
        >
          <Field label="Title">
            <input
              name="taskTitle"
              required
              className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
              placeholder="Implement hero section"
            />
          </Field>
          <Field label="Due (optional)">
            <input name="taskDue" type="datetime-local" className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm" />
          </Field>
          <div className="sm:col-span-2 flex items-center gap-2">
            <input id="taskClientVisible" name="taskClientVisible" type="checkbox" defaultChecked className="rounded border-neutral-300" />
            <label htmlFor="taskClientVisible" className="text-sm text-neutral-700">
              Visible to client
            </label>
          </div>
          <div className="sm:col-span-2">
            <label className="block space-y-1.5">
              <span className="text-xs font-medium text-neutral-600">Assign to worker (optional)</span>
              <select
                name="taskAssigneeId"
                defaultValue=""
                className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
              >
                <option value="">— No assignee (task won’t appear in My tasks) —</option>
                {adminUsers.map((u) => (
                  <option key={u.id} value={u.id}>
                    {userOptionLabel(u)}
                  </option>
                ))}
              </select>
              <span className="text-xs text-neutral-500">
                The user must be a project member (section 7). If assignment fails, add them to the project first.
              </span>
            </label>
          </div>
          <div className="sm:col-span-2">
            <label className="block space-y-1.5">
              <span className="text-xs font-medium text-neutral-600">Subtask of (optional)</span>
              <select
                name="taskParentId"
                defaultValue=""
                className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
              >
                <option value="">— Top-level task (shown in section list) —</option>
                {tasks.map((pt) => (
                  <option key={pt.id} value={pt.id}>
                    {pt.title}
                  </option>
                ))}
              </select>
              <span className="text-xs text-neutral-500">
                Subtasks are hidden from the top-level list but appear on the parent task for assignees.
              </span>
            </label>
          </div>
          <div className="sm:col-span-2">
            <button
              type="submit"
              disabled={busy || !sectionId}
              className={ADMIN_PRIMARY_BTN}
            >
              {pending === "task" ? <Spinner className="!h-4 !w-4 border-neutral-600 border-t-white" /> : null}
              {pending === "task" ? "Creating…" : "Create task"}
            </button>
          </div>
        </form>

        {tasks.length > 0 && (
          <div className="rounded-lg border border-neutral-100 bg-neutral-50 p-3">
            <p className="text-xs font-medium text-neutral-600">Tasks in this section</p>
            <p className="mt-1 text-xs text-neutral-500">
              Top-level tasks are listed here; subtasks nest under their parent and still appear on the worker task screen.
            </p>
            <ul className="mt-2 space-y-2 text-sm text-neutral-800">
              {tasks.map((t) => (
                <li key={t.id} className="rounded-md border border-neutral-200 bg-white px-3 py-2">
                  {taskEditId === t.id ? (
                    <div className="flex flex-wrap items-center gap-2">
                      <input value={taskEditTitle} onChange={(e) => setTaskEditTitle(e.target.value)} className="min-w-[220px] rounded-md border border-neutral-300 px-2 py-1 text-sm" />
                      <input type="datetime-local" value={taskEditDueDate} onChange={(e) => setTaskEditDueDate(e.target.value)} className="rounded-md border border-neutral-300 px-2 py-1 text-sm" />
                      <label className="inline-flex items-center gap-1 text-xs text-neutral-700">
                        <input type="checkbox" checked={taskEditClientVisible} onChange={(e) => setTaskEditClientVisible(e.target.checked)} />
                        Client visible
                      </label>
                      <div className="ml-auto flex gap-2">
                        <button
                          type="button"
                          disabled={taskActionPending === `save:${t.id}`}
                          onClick={async () => {
                            try {
                              setTaskActionPending(`save:${t.id}`);
                              setError(null);
                              setBanner(null);
                              await updateTask(token, t.id, {
                                title: taskEditTitle.trim(),
                                dueDate: taskEditDueDate ? new Date(taskEditDueDate).toISOString() : null,
                                clientVisible: taskEditClientVisible,
                              });
                              const refreshed = await listTasksInSection(sectionId, token);
                              setTasks(refreshed);
                              setTaskEditId(null);
                              setBanner("Task updated.");
                            } catch (e) {
                              setError(errMessage(e));
                            } finally {
                              setTaskActionPending(null);
                            }
                          }}
                          className="rounded-md border border-neutral-800 bg-neutral-900 px-2.5 py-1 text-xs font-semibold text-white"
                        >
                          {taskActionPending === `save:${t.id}` ? "Saving..." : "Save"}
                        </button>
                        <button type="button" onClick={() => setTaskEditId(null)} className="rounded-md border border-neutral-200 bg-white px-2.5 py-1 text-xs font-semibold text-neutral-700">
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-wrap items-center gap-2">
                      <span>
                        {t.title} <span className="text-neutral-500">({t.state})</span>
                      </span>
                      <span className="text-xs text-neutral-500">{t.dueDate ? new Date(t.dueDate).toLocaleString() : "No due date"}</span>
                      <div className="ml-auto flex gap-2">
                        <button
                          type="button"
                          disabled={!!taskActionPending}
                          onClick={() => {
                            setTaskEditId(t.id);
                            setTaskEditTitle(t.title);
                            setTaskEditDueDate(t.dueDate ? new Date(t.dueDate).toISOString().slice(0, 16) : "");
                            setTaskEditClientVisible(t.clientVisible);
                          }}
                          className="rounded-md border border-neutral-200 bg-white px-2.5 py-1 text-xs font-semibold text-neutral-700"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          disabled={!!taskActionPending}
                          onClick={async () => {
                            if (!window.confirm(`Archive task "${t.title}"?`)) return;
                            try {
                              setTaskActionPending(`archive:${t.id}`);
                              setError(null);
                              setBanner(null);
                              await archiveTask(token, t.id);
                              const refreshed = await listTasksInSection(sectionId, token);
                              setTasks(refreshed);
                              setBanner("Task archived.");
                            } catch (e) {
                              setError(errMessage(e));
                            } finally {
                              setTaskActionPending(null);
                            }
                          }}
                          className="rounded-md border border-red-200 bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-700"
                        >
                          {taskActionPending === `archive:${t.id}` ? "Archiving..." : "Archive"}
                        </button>
                      </div>
                    </div>
                  )}
                  {t.subtasks && t.subtasks.length > 0 ? (
                    <ul className="mt-3 space-y-2 border-l-2 border-neutral-200 pl-3">
                      {t.subtasks.map((st) => (
                        <li key={st.id} className="rounded-md border border-neutral-200 bg-neutral-50/90 px-3 py-2">
                          {taskEditId === st.id ? (
                            <div className="flex flex-wrap items-center gap-2">
                              <input value={taskEditTitle} onChange={(e) => setTaskEditTitle(e.target.value)} className="min-w-[220px] rounded-md border border-neutral-300 px-2 py-1 text-sm" />
                              <input type="datetime-local" value={taskEditDueDate} onChange={(e) => setTaskEditDueDate(e.target.value)} className="rounded-md border border-neutral-300 px-2 py-1 text-sm" />
                              <label className="inline-flex items-center gap-1 text-xs text-neutral-700">
                                <input type="checkbox" checked={taskEditClientVisible} onChange={(e) => setTaskEditClientVisible(e.target.checked)} />
                                Client visible
                              </label>
                              <div className="ml-auto flex gap-2">
                                <button
                                  type="button"
                                  disabled={taskActionPending === `save:${st.id}`}
                                  onClick={async () => {
                                    try {
                                      setTaskActionPending(`save:${st.id}`);
                                      setError(null);
                                      setBanner(null);
                                      await updateTask(token, st.id, {
                                        title: taskEditTitle.trim(),
                                        dueDate: taskEditDueDate ? new Date(taskEditDueDate).toISOString() : null,
                                        clientVisible: taskEditClientVisible,
                                      });
                                      const refreshed = await listTasksInSection(sectionId, token);
                                      setTasks(refreshed);
                                      setTaskEditId(null);
                                      setBanner("Task updated.");
                                    } catch (e) {
                                      setError(errMessage(e));
                                    } finally {
                                      setTaskActionPending(null);
                                    }
                                  }}
                                  className="rounded-md border border-neutral-800 bg-neutral-900 px-2.5 py-1 text-xs font-semibold text-white"
                                >
                                  {taskActionPending === `save:${st.id}` ? "Saving..." : "Save"}
                                </button>
                                <button type="button" onClick={() => setTaskEditId(null)} className="rounded-md border border-neutral-200 bg-white px-2.5 py-1 text-xs font-semibold text-neutral-700">
                                  Cancel
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-xs font-medium uppercase tracking-wide text-neutral-500">Subtask</span>
                              <span>
                                {st.title} <span className="text-neutral-500">({st.state})</span>
                              </span>
                              <span className="text-xs text-neutral-500">{st.dueDate ? new Date(st.dueDate).toLocaleString() : "No due date"}</span>
                              <div className="ml-auto flex gap-2">
                                <button
                                  type="button"
                                  disabled={!!taskActionPending}
                                  onClick={() => {
                                    setTaskEditId(st.id);
                                    setTaskEditTitle(st.title);
                                    setTaskEditDueDate(st.dueDate ? new Date(st.dueDate).toISOString().slice(0, 16) : "");
                                    setTaskEditClientVisible(st.clientVisible);
                                  }}
                                  className="rounded-md border border-neutral-200 bg-white px-2.5 py-1 text-xs font-semibold text-neutral-700"
                                >
                                  Edit
                                </button>
                                <button
                                  type="button"
                                  disabled={!!taskActionPending}
                                  onClick={async () => {
                                    if (!window.confirm(`Archive subtask "${st.title}"?`)) return;
                                    try {
                                      setTaskActionPending(`archive:${st.id}`);
                                      setError(null);
                                      setBanner(null);
                                      await archiveTask(token, st.id);
                                      const refreshed = await listTasksInSection(sectionId, token);
                                      setTasks(refreshed);
                                      setBanner("Task archived.");
                                    } catch (e) {
                                      setError(errMessage(e));
                                    } finally {
                                      setTaskActionPending(null);
                                    }
                                  }}
                                  className="rounded-md border border-red-200 bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-700"
                                >
                                  {taskActionPending === `archive:${st.id}` ? "Archiving..." : "Archive"}
                                </button>
                              </div>
                            </div>
                          )}
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </li>
              ))}
            </ul>
          </div>
        )}
      </Card>

      <Card title="7. Project members">
        <form
          className="grid gap-3 sm:grid-cols-2"
          onSubmit={async (ev) => {
            ev.preventDefault();
            const form = ev.currentTarget;
            if (!projectId) {
              setError("Select a project.");
              return;
            }
            const fd = new FormData(form);
            const userId = String(fd.get("memUserId") ?? "").trim();
            const role = String(fd.get("memRole") ?? "WORKER");
            if (!userId) return;
            try {
              setPending("members");
              setError(null);
              setBanner(null);
              await addProjectMembers(token, projectId, [{ userId, role }]);
              setBanner("Member added to project.");
              form.reset();
              setMemberSearchInput("");
              setMemberSearchDebounced("");
            } catch (e) {
              setError(errMessage(e));
            } finally {
              setPending(null);
            }
          }}
        >
          <div className="sm:col-span-2">
            <label className="block space-y-1.5">
              <span className="text-xs font-medium text-neutral-600">Search users (optional)</span>
              <input
                type="search"
                value={memberSearchInput}
                onChange={(e) => setMemberSearchInput(e.target.value)}
                className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
                placeholder="Filter by name or email"
                autoComplete="off"
              />
            </label>
          </div>
          <Field label="User">
            <select
              name="memUserId"
              required
              className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
            >
              <option value="">{adminUsersLoading ? "Loading users…" : "Select a user…"}</option>
              {adminUsers.map((u) => (
                <option key={u.id} value={u.id}>
                  {userOptionLabel(u)}
                </option>
              ))}
            </select>
            {adminUsersLoading ? (
              <div className="mt-1 flex items-center gap-2 text-xs text-neutral-600">
                <Spinner className="!h-3.5 !w-3.5 border-neutral-300 border-t-neutral-900" />
                Loading users…
              </div>
            ) : null}
            {memberUsersError ? (
              <p className="mt-1 text-xs text-red-700">{memberUsersError}</p>
            ) : null}
            {!adminUsersLoading && !memberUsersError && adminUsers.length === 0 && token ? (
              <p className="mt-1 text-xs text-neutral-500">No users match. Clear search or check the database.</p>
            ) : null}
          </Field>
          <Field label="Role">
            <select name="memRole" className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm">
              {PROJECT_ROLES.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </Field>
          <div className="sm:col-span-2">
            <button
              type="submit"
              disabled={busy || !projectId}
              className={ADMIN_PRIMARY_BTN}
            >
              {pending === "members" ? <Spinner className="!h-4 !w-4 border-neutral-600 border-t-white" /> : null}
              {pending === "members" ? "Adding…" : "Add member"}
            </button>
          </div>
        </form>
      </Card>
    </div>
  );
}
