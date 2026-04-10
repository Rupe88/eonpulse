import { apiGet } from "./client";

export type ProjectDetail = {
  id: string;
  workspaceId: string;
  clientId: string;
  name: string;
  code: string;
  description: string | null;
  state: string;
  dueDate: string | null;
  client: { id: string; name: string };
  workspace: { id: string; name: string; slug: string };
};

export type MilestoneRow = {
  id: string;
  name: string;
  orderNo: number;
  state: string;
  billingAmount: string | null;
  paymentGateMode: string;
};

export type SectionRow = {
  id: string;
  name: string;
  orderNo: number;
};

export type TaskRow = {
  id: string;
  title: string;
  state: string;
  dueDate: string | null;
  clientVisible: boolean;
};

export async function getProject(projectId: string, accessToken: string) {
  return apiGet<ProjectDetail>(`/planning/projects/${projectId}`, accessToken);
}

export async function listMilestones(projectId: string, accessToken: string) {
  return apiGet<MilestoneRow[]>(
    `/planning/projects/${projectId}/milestones`,
    accessToken,
  );
}

export async function listSections(milestoneId: string, accessToken: string) {
  return apiGet<SectionRow[]>(
    `/planning/milestones/${milestoneId}/sections`,
    accessToken,
  );
}

export async function listTasksInSection(sectionId: string, accessToken: string) {
  return apiGet<TaskRow[]>(`/planning/sections/${sectionId}/tasks`, accessToken);
}
