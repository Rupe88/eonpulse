import { apiGet, apiPost } from "./client";

export type GitLinkRow = {
  id: string;
  projectId: string;
  taskId: string | null;
  repoId: string;
  issueKey: string | null;
  workingBranch: string | null;
  pullRequestUrl: string | null;
  releaseTag: string | null;
  environment: string | null;
  createdAt: string;
  updatedAt: string;
  project: { id: string; name: string; code: string };
  task: { id: string; title: string } | null;
  commitRefs: Array<{
    id: string;
    commitHash: string;
    message: string | null;
    authoredAt: string | null;
  }>;
};

export function listGitLinks(accessToken: string, projectId: string) {
  const sp = new URLSearchParams();
  if (projectId) sp.set("projectId", projectId);
  const q = sp.toString();
  return apiGet<GitLinkRow[]>(`/git-links${q ? `?${q}` : ""}`, accessToken);
}

export function createGitLink(
  accessToken: string,
  body: {
    projectId: string;
    taskId?: string;
    repoId: string;
    issueKey?: string;
    workingBranch?: string;
    pullRequestUrl?: string;
    releaseTag?: string;
    environment?: string;
    commitRefs?: string[];
  },
) {
  return apiPost<GitLinkRow>("/git-links", accessToken, body);
}
