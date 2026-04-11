import { apiGet, apiPatch, apiPost } from "./client";

export type MyProjectRow = {
  projectId: string;
  role: string;
  name: string;
  code: string;
  state: string;
  workspaceId: string;
  workspaceName: string;
};

export type MyWorkspaceRow = {
  workspaceId: string;
  name: string;
  slug: string;
  role: string;
  createdAt: string;
};

export type ClientRow = {
  id: string;
  name: string;
  legalName: string | null;
  billingEmail: string | null;
  paymentPreference: string | null;
  createdAt: string;
};

export type WorkspaceProjectRow = {
  id: string;
  name: string;
  code: string;
  description: string | null;
  state: string;
  clientId: string;
  assignedManagerId: string | null;
  dueDate: string | null;
  createdAt: string;
  client: { name: string };
};

export async function listMyProjects(accessToken: string): Promise<MyProjectRow[]> {
  return apiGet<MyProjectRow[]>("/workspace/my-projects", accessToken);
}

export async function listMyWorkspaces(accessToken: string): Promise<MyWorkspaceRow[]> {
  return apiGet<MyWorkspaceRow[]>("/workspace/my-workspaces", accessToken);
}

export async function listClients(
  workspaceId: string,
  accessToken: string,
): Promise<ClientRow[]> {
  return apiGet<ClientRow[]>(`/workspace/${workspaceId}/clients`, accessToken);
}

export async function listProjectsInWorkspace(
  workspaceId: string,
  accessToken: string,
): Promise<WorkspaceProjectRow[]> {
  return apiGet<WorkspaceProjectRow[]>(
    `/workspace/${workspaceId}/projects`,
    accessToken,
  );
}

export async function createWorkspace(
  accessToken: string,
  body: { name: string; slug: string },
) {
  return apiPost<{ id: string; name: string; slug: string }>(
    "/workspace",
    accessToken,
    body,
  );
}

export async function createClient(
  accessToken: string,
  body: {
    workspaceId: string;
    name: string;
    legalName?: string;
    billingEmail?: string;
    paymentPreference?: string;
  },
) {
  return apiPost<ClientRow>("/workspace/clients", accessToken, body);
}

export async function updateClient(
  accessToken: string,
  clientId: string,
  body: {
    name?: string;
    legalName?: string | null;
    billingEmail?: string | null;
    paymentPreference?: string | null;
  },
) {
  return apiPatch<ClientRow>(
    `/workspace/clients/${encodeURIComponent(clientId)}`,
    accessToken,
    body,
  );
}

export async function archiveClient(accessToken: string, clientId: string) {
  return apiPatch<{ id: string; deletedAt: string }>(
    `/workspace/clients/${encodeURIComponent(clientId)}/archive`,
    accessToken,
    {},
  );
}

export async function createProject(
  accessToken: string,
  body: {
    workspaceId: string;
    clientId: string;
    name: string;
    code: string;
    description?: string;
    assignedManagerId?: string;
  },
): Promise<WorkspaceProjectRow> {
  return apiPost<WorkspaceProjectRow>("/workspace/projects", accessToken, body);
}

export async function updateProject(
  accessToken: string,
  projectId: string,
  body: {
    clientId?: string;
    name?: string;
    code?: string;
    description?: string | null;
    assignedManagerId?: string | null;
    dueDate?: string | null;
  },
) {
  return apiPatch<WorkspaceProjectRow>(
    `/workspace/projects/${encodeURIComponent(projectId)}`,
    accessToken,
    body,
  );
}

export async function archiveProject(accessToken: string, projectId: string) {
  return apiPatch<{ id: string; deletedAt: string }>(
    `/workspace/projects/${encodeURIComponent(projectId)}/archive`,
    accessToken,
    {},
  );
}

export async function createMilestone(
  accessToken: string,
  body: {
    projectId: string;
    name: string;
    orderNo: number;
    billingAmount?: number;
    paymentGateMode?: "HARD_GATE" | "SOFT_GATE" | "NO_GATE";
  },
): Promise<{
  id: string;
  name: string;
  orderNo: number;
  state: string;
  billingAmount: string | null;
  paymentGateMode: string;
}> {
  return apiPost("/workspace/milestones", accessToken, body);
}

export async function getMilestone(accessToken: string, milestoneId: string) {
  return apiGet<{
    id: string;
    name: string;
    orderNo: number;
    state: string;
    billingAmount: string | null;
    paymentGateMode: string;
  }>(`/workspace/milestones/${encodeURIComponent(milestoneId)}`, accessToken);
}

export async function updateMilestone(
  accessToken: string,
  milestoneId: string,
  body: {
    name?: string;
    orderNo?: number;
    billingAmount?: number | null;
    paymentGateMode?: "HARD_GATE" | "SOFT_GATE" | "NO_GATE";
  },
) {
  return apiPatch(
    `/workspace/milestones/${encodeURIComponent(milestoneId)}`,
    accessToken,
    body,
  );
}

export async function archiveMilestone(accessToken: string, milestoneId: string) {
  return apiPatch(
    `/workspace/milestones/${encodeURIComponent(milestoneId)}/archive`,
    accessToken,
    {},
  );
}

export type ProjectMemberOption = {
  userId: string;
  role: string;
  name: string | null;
  email: string;
};

/** Workspace delivery roles that can be executors; includes people not yet on the project roster. */
export type ProjectAssignmentCandidate = {
  userId: string;
  name: string | null;
  email: string;
  workspaceRole: string;
  projectRole: string | null;
  onProject: boolean;
};

export async function listProjectMembers(
  accessToken: string,
  projectId: string,
): Promise<ProjectMemberOption[]> {
  return apiGet<ProjectMemberOption[]>(
    `/workspace/projects/${encodeURIComponent(projectId)}/members`,
    accessToken,
  );
}

export async function listProjectAssignmentCandidates(
  accessToken: string,
  projectId: string,
): Promise<ProjectAssignmentCandidate[]> {
  return apiGet<ProjectAssignmentCandidate[]>(
    `/workspace/projects/${encodeURIComponent(projectId)}/members/for-assignment`,
    accessToken,
  );
}

export async function addProjectMembers(
  accessToken: string,
  projectId: string,
  members: { userId: string; role: string }[],
) {
  return apiPost(`/workspace/projects/${projectId}/members`, accessToken, { members });
}
