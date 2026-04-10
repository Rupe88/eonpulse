"use client";

import { useCallback, useEffect, useState } from "react";
import { Spinner } from "@/components/ui/spinner";
import { ApiError } from "@/lib/api/http";
import { listMyProjects, type MyProjectRow } from "@/lib/api/workspace";
import { useAuth } from "@/contexts/auth-context";
import { tokenStorage } from "@/lib/auth/storage";

function resolveAccessToken(contextToken: string | null): string | null {
  if (contextToken) return contextToken;
  if (typeof window === "undefined") return null;
  return tokenStorage.getAccessToken();
}

export function ProjectsPanel() {
  const { accessToken } = useAuth();
  const [projects, setProjects] = useState<MyProjectRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const token = resolveAccessToken(accessToken);
    if (!token) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const list = await listMyProjects(token);
      setProjects(list);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Failed to load projects");
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="w-full max-w-none space-y-8">
        <p className="text-sm leading-relaxed text-neutral-600">
          See every project you have access to, your role, and current state. Open Tasks to work items by project or
          across all projects.
        </p>

        {error ? (
          <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">{error}</p>
        ) : null}

        {loading ? (
          <div className="flex justify-center py-16">
            <Spinner />
          </div>
        ) : projects.length === 0 ? (
          <section className="card-elevated p-8 text-center">
            <p className="text-sm font-medium text-neutral-900">No projects yet</p>
            <p className="mt-2 text-sm text-neutral-500">
              When you’re added to a project, it will show here. Admins can invite you from Admin.
            </p>
          </section>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-neutral-200 bg-white shadow-sm">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="border-b border-neutral-200 bg-neutral-50 text-xs font-semibold uppercase tracking-wide text-neutral-500">
                <tr>
                  <th className="px-4 py-3">Project</th>
                  <th className="px-4 py-3">Code</th>
                  <th className="px-4 py-3">State</th>
                  <th className="px-4 py-3">Your role</th>
                  <th className="px-4 py-3">Workspace</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {projects.map((p) => (
                  <tr key={p.projectId} className="hover:bg-neutral-50/80">
                    <td className="px-4 py-3 font-medium text-neutral-900">{p.name}</td>
                    <td className="px-4 py-3 font-mono text-xs text-neutral-700">{p.code}</td>
                    <td className="px-4 py-3 text-neutral-700">{p.state}</td>
                    <td className="px-4 py-3 text-neutral-700">{p.role}</td>
                    <td className="px-4 py-3 text-neutral-600">{p.workspaceName}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
    </div>
  );
}
