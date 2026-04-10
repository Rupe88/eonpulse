"use client";

import { useEffect, useMemo, useState } from "react";
import { Spinner } from "@/components/ui/spinner";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/contexts/auth-context";
import { ApiError } from "@/lib/api/http";
import { createAdminUser, listAdminUsers, updateAdminUser, type AdminUserRow } from "@/lib/api/users";

const ROLE_OPTIONS = ["ADMIN", "SUB_ADMIN", "WORKER", "CLIENT_OWNER", "FINANCE", "AUDITOR"] as const;
type ToastType = "success" | "error" | "info";
type ToastItem = { id: string; type: ToastType; message: string };

function EyeOpenIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className={className} aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12s3.75-6.75 9.75-6.75S21.75 12 21.75 12 18 18.75 12 18.75 2.25 12 2.25 12Z" />
      <circle cx="12" cy="12" r="3.25" />
    </svg>
  );
}

function EyeClosedIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className={className} aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 3l18 18" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M10.6 5.43A10.86 10.86 0 0 1 12 5.25C18 5.25 21.75 12 21.75 12a20.6 20.6 0 0 1-3.53 4.57M14.12 14.12a3 3 0 0 1-4.24-4.24M6.05 6.05A20.94 20.94 0 0 0 2.25 12S6 18.75 12 18.75c1.54 0 2.94-.45 4.2-1.17" />
    </svg>
  );
}

function errorMessage(e: unknown): string {
  if (e instanceof ApiError) return e.message;
  if (e instanceof Error) return e.message;
  return "Something went wrong";
}

export function UsersManagementPanel() {
  const { accessToken, user } = useAuth();
  const token = accessToken ?? "";
  const [rows, setRows] = useState<AdminUserRow[]>([]);
  const [search, setSearch] = useState("");
  const [searchDebounced, setSearchDebounced] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("ALL");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "ACTIVE" | "INACTIVE">("ALL");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showCreatePassword, setShowCreatePassword] = useState(false);
  const [role, setRole] = useState<string>("WORKER");
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [rowBusyId, setRowBusyId] = useState<string | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editRole, setEditRole] = useState<string>("WORKER");
  const [editIsActive, setEditIsActive] = useState(true);
  const [resetPassword, setResetPassword] = useState("");
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [firstLoadDone, setFirstLoadDone] = useState(false);

  const canCreateAdmin = String(user?.role ?? "").toUpperCase() === "ADMIN";
  const availableRoles = useMemo(
    () => (canCreateAdmin ? ROLE_OPTIONS : ROLE_OPTIONS.filter((r) => r !== "ADMIN")),
    [canCreateAdmin],
  );

  useEffect(() => {
    const t = window.setTimeout(() => setSearchDebounced(search), 250);
    return () => window.clearTimeout(t);
  }, [search]);

  useEffect(() => {
    if (!token) return;
    void (async () => {
      setLoading(true);
      setError(null);
      try {
        const users = await listAdminUsers(token, searchDebounced);
        setRows(users);
      } catch (e) {
        setError(errorMessage(e));
      } finally {
        setLoading(false);
        setFirstLoadDone(true);
      }
    })();
  }, [token, searchDebounced]);

  const filteredRows = useMemo(() => {
    return rows.filter((u) => {
      if (roleFilter !== "ALL" && u.globalRole !== roleFilter) {
        return false;
      }
      if (statusFilter === "ACTIVE" && !u.isActive) {
        return false;
      }
      if (statusFilter === "INACTIVE" && u.isActive) {
        return false;
      }
      return true;
    });
  }, [rows, roleFilter, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / pageSize));
  const pagedRows = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredRows.slice(start, start + pageSize);
  }, [filteredRows, page, pageSize]);

  useEffect(() => {
    setPage(1);
  }, [searchDebounced, roleFilter, statusFilter, pageSize]);

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  function pushToast(type: ToastType, message: string) {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    setToasts((prev) => [...prev, { id, type, message }]);
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3200);
  }

  function resetFilters() {
    setSearch("");
    setSearchDebounced("");
    setRoleFilter("ALL");
    setStatusFilter("ALL");
  }

  function exportCsv() {
    const header = ["Name", "Email", "Role", "Status", "Created At"];
    const escapeCell = (value: string) => `"${value.replace(/"/g, '""')}"`;
    const lines = filteredRows.map((u) =>
      [
        u.name?.trim() || "",
        u.email,
        u.globalRole,
        u.isActive ? "Active" : "Inactive",
        new Date(u.createdAt).toISOString(),
      ]
        .map(escapeCell)
        .join(","),
    );
    const csv = [header.join(","), ...lines].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `users-export-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  async function onCreateUser(e: React.FormEvent) {
    e.preventDefault();
    if (!token) return;
    setSubmitting(true);
    setError(null);
    try {
      const created = await createAdminUser(token, {
        name: name.trim() || undefined,
        email: email.trim(),
        password,
        role,
      });
      setRows((prev) => [created, ...prev.filter((u) => u.id !== created.id)]);
      pushToast("success", `User created: ${created.email}`);
      setName("");
      setEmail("");
      setPassword("");
      setRole("WORKER");
    } catch (e) {
      const msg = errorMessage(e);
      setError(msg);
      pushToast("error", msg);
    } finally {
      setSubmitting(false);
    }
  }

  function beginEdit(u: AdminUserRow) {
    setEditId(u.id);
    setEditName(u.name ?? "");
    setEditEmail(u.email);
    setEditRole(u.globalRole);
    setEditIsActive(u.isActive);
    setResetPassword("");
  }

  async function saveEdit(userId: string) {
    if (!token) return;
    setRowBusyId(userId);
    setError(null);
    try {
      const body: {
        name?: string;
        email?: string;
        role?: string;
        isActive?: boolean;
        password?: string;
      } = {
        name: editName.trim() || "",
        email: editEmail.trim(),
        role: editRole,
        isActive: editIsActive,
      };
      if (resetPassword.trim()) {
        body.password = resetPassword.trim();
      }
      const updated = await updateAdminUser(token, userId, body);
      setRows((prev) => prev.map((r) => (r.id === userId ? updated : r)));
      pushToast("success", `User updated: ${updated.email}`);
      setEditId(null);
      setResetPassword("");
    } catch (e) {
      const msg = errorMessage(e);
      setError(msg);
      pushToast("error", msg);
    } finally {
      setRowBusyId(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="fixed right-5 top-5 z-[80] space-y-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`min-w-[280px] rounded-lg border px-4 py-3 text-sm shadow-lg ${
              t.type === "success"
                ? "border-emerald-200 bg-emerald-50 text-emerald-900"
                : t.type === "error"
                  ? "border-red-200 bg-red-50 text-red-900"
                  : "border-blue-200 bg-blue-50 text-blue-900"
            }`}
          >
            {t.message}
          </div>
        ))}
      </div>
      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">{error}</div>
      ) : null}

      <section className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm">
        <h2 className="text-base font-semibold text-neutral-900">Create User</h2>
        <p className="mt-1 text-sm text-neutral-600">
          Create account with email + password and assign system role.
        </p>
        <form onSubmit={onCreateUser} className="mt-5 grid gap-3 sm:grid-cols-2">
          <label className="block space-y-1.5">
            <span className="text-xs font-medium text-neutral-600">Name (optional)</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
              placeholder="Jane Doe"
            />
          </label>
          <label className="block space-y-1.5">
            <span className="text-xs font-medium text-neutral-600">Role</span>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
            >
              {availableRoles.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </label>
          <label className="block space-y-1.5">
            <span className="text-xs font-medium text-neutral-600">Email</span>
            <input
              required
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
              placeholder="new.user@company.com"
            />
          </label>
          <label className="block space-y-1.5">
            <span className="text-xs font-medium text-neutral-600">Password</span>
            <div className="relative">
              <input
                required
                minLength={8}
                type={showCreatePassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-md border border-neutral-300 px-3 py-2 pr-11 text-sm"
                placeholder="Minimum 8 characters"
              />
              <button
                type="button"
                onClick={() => setShowCreatePassword((prev) => !prev)}
                className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-neutral-500 hover:text-neutral-800"
                aria-label={showCreatePassword ? "Hide password" : "Show password"}
                title={showCreatePassword ? "Hide password" : "Show password"}
              >
                {showCreatePassword ? (
                  <EyeClosedIcon className="h-4 w-4" />
                ) : (
                  <EyeOpenIcon className="h-4 w-4" />
                )}
              </button>
            </div>
          </label>
          <div className="sm:col-span-2">
            <button
              type="submit"
              disabled={submitting || !token}
              className="inline-flex min-h-[40px] min-w-[9rem] items-center justify-center gap-2 rounded-md border border-neutral-950 bg-neutral-950 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-neutral-900 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting ? <Spinner className="!h-4 !w-4 border-neutral-600 border-t-white" /> : null}
              {submitting ? "Creating..." : "Create user"}
            </button>
          </div>
        </form>
      </section>

      <section className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm">
        {!firstLoadDone && loading ? (
          <div className="space-y-4">
            <div className="grid gap-2 sm:grid-cols-3">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-9 w-full" />
              <Skeleton className="h-9 w-full" />
              <Skeleton className="h-9 w-full" />
              <Skeleton className="h-9 w-full" />
              <Skeleton className="h-9 w-full" />
              <Skeleton className="h-9 w-full" />
            </div>
          </div>
        ) : (
          <>
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-base font-semibold text-neutral-900">Users</h2>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={exportCsv}
                disabled={filteredRows.length === 0}
                className="rounded-md border border-neutral-200 bg-white px-3 py-1.5 text-xs font-semibold text-neutral-700 hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Export CSV
              </button>
              <button
                type="button"
                onClick={resetFilters}
                className="rounded-md border border-neutral-200 bg-white px-3 py-1.5 text-xs font-semibold text-neutral-700 hover:bg-neutral-50"
              >
                Clear filters
              </button>
            </div>
          </div>
          <div className="grid gap-2 sm:grid-cols-3">
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name or email"
              className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
            />
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
            >
              <option value="ALL">All roles</option>
              {ROLE_OPTIONS.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
            <select
              value={statusFilter}
              onChange={(e) =>
                setStatusFilter(e.target.value as "ALL" | "ACTIVE" | "INACTIVE")
              }
              className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm"
            >
              <option value="ALL">All statuses</option>
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
            </select>
          </div>
          <p className="text-xs text-neutral-500">
            Showing {filteredRows.length} of {rows.length} users
          </p>
          <div className="flex flex-col gap-2 text-xs text-neutral-600 sm:flex-row sm:items-center sm:justify-between">
            <p>
              Page {page} of {totalPages}
            </p>
            <div className="flex items-center gap-2">
              <label className="text-xs text-neutral-600">Rows</label>
              <select
                value={pageSize}
                onChange={(e) => setPageSize(Number(e.target.value))}
                className="rounded-md border border-neutral-300 px-2 py-1.5 text-xs"
              >
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
              </select>
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="rounded-md border border-neutral-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-neutral-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Prev
              </button>
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="rounded-md border border-neutral-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-neutral-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="mt-4 flex items-center gap-2 text-sm text-neutral-600">
            <Spinner className="!h-4 !w-4 border-neutral-300 border-t-neutral-900" />
            Loading users...
          </div>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[680px] text-left text-sm">
              <thead className="text-xs uppercase tracking-wide text-neutral-500">
                <tr>
                  <th className="px-2 py-2 font-semibold">Name</th>
                  <th className="px-2 py-2 font-semibold">Email</th>
                  <th className="px-2 py-2 font-semibold">Role</th>
                  <th className="px-2 py-2 font-semibold">Status</th>
                  <th className="px-2 py-2 text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200">
                {pagedRows.map((u) => {
                  const editing = editId === u.id;
                  const busy = rowBusyId === u.id;
                  const self = user?.userId === u.id;
                  return (
                    <tr key={u.id}>
                      <td className="px-2 py-2 text-neutral-800">
                        {editing ? (
                          <input
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            className="w-full rounded-md border border-neutral-300 px-2 py-1.5 text-sm"
                          />
                        ) : (
                          u.name?.trim() || "—"
                        )}
                      </td>
                      <td className="px-2 py-2 text-neutral-800">
                        {editing ? (
                          <input
                            type="email"
                            value={editEmail}
                            onChange={(e) => setEditEmail(e.target.value)}
                            className="w-full rounded-md border border-neutral-300 px-2 py-1.5 text-sm"
                          />
                        ) : (
                          u.email
                        )}
                      </td>
                      <td className="px-2 py-2">
                        {editing ? (
                          <select
                            value={editRole}
                            onChange={(e) => setEditRole(e.target.value)}
                            className="rounded-md border border-neutral-300 px-2 py-1.5 text-sm"
                            disabled={!canCreateAdmin}
                          >
                            {(canCreateAdmin
                              ? ROLE_OPTIONS
                              : ROLE_OPTIONS.filter((r) => r !== "ADMIN")
                            ).map((r) => (
                              <option key={r} value={r}>
                                {r}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <span className="rounded bg-neutral-100 px-2 py-1 text-xs font-medium text-neutral-800">
                            {u.globalRole}
                          </span>
                        )}
                      </td>
                      <td className="px-2 py-2 text-neutral-700">
                        {editing ? (
                          <label className="inline-flex items-center gap-2 text-sm">
                            <input
                              type="checkbox"
                              checked={editIsActive}
                              onChange={(e) => setEditIsActive(e.target.checked)}
                              disabled={self}
                            />
                            Active
                          </label>
                        ) : u.isActive ? (
                          "Active"
                        ) : (
                          "Inactive"
                        )}
                      </td>
                      <td className="px-2 py-2">
                        <div className="flex items-center justify-end gap-2">
                          {editing ? (
                            <>
                              <div className="relative w-48">
                                <input
                                  type={showResetPassword ? "text" : "password"}
                                  value={resetPassword}
                                  onChange={(e) => setResetPassword(e.target.value)}
                                  placeholder="New password (optional)"
                                  className="w-full rounded-md border border-neutral-300 px-2 py-1.5 pr-9 text-sm"
                                />
                                <button
                                  type="button"
                                  onClick={() => setShowResetPassword((prev) => !prev)}
                                  className="absolute inset-y-0 right-0 inline-flex w-8 items-center justify-center text-neutral-500 hover:text-neutral-800"
                                  aria-label={showResetPassword ? "Hide reset password" : "Show reset password"}
                                  title={showResetPassword ? "Hide reset password" : "Show reset password"}
                                >
                                  {showResetPassword ? (
                                    <EyeClosedIcon className="h-4 w-4" />
                                  ) : (
                                    <EyeOpenIcon className="h-4 w-4" />
                                  )}
                                </button>
                              </div>
                              <button
                                type="button"
                                onClick={() => void saveEdit(u.id)}
                                disabled={busy}
                                className="rounded-md border border-neutral-900 bg-neutral-900 px-3 py-1.5 text-xs font-semibold text-white"
                              >
                                {busy ? "Saving..." : "Save"}
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditId(null)}
                                disabled={busy}
                                className="rounded-md border border-neutral-200 bg-white px-3 py-1.5 text-xs font-semibold text-neutral-700"
                              >
                                Cancel
                              </button>
                            </>
                          ) : (
                            <button
                              type="button"
                              onClick={() => beginEdit(u)}
                              className="rounded-md border border-neutral-200 bg-white px-3 py-1.5 text-xs font-semibold text-neutral-700"
                            >
                              Edit
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {!pagedRows.length ? (
              <p className="mt-3 text-sm text-neutral-500">No users found.</p>
            ) : null}
          </div>
        )}
          </>
        )}
      </section>
    </div>
  );
}
