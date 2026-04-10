import { apiGet, apiPost } from "./client";

export type DeliverableItem = {
  id: string;
  title: string;
  summary: string | null;
  taskId: string | null;
  milestoneId: string | null;
  createdAt: string;
  updatedAt: string;
  versions: Array<{ id: string; versionNo: number; fileUrl: string; createdAt: string }>;
};

export function listProjectDeliverables(accessToken: string, projectId: string) {
  return apiGet<DeliverableItem[]>(
    `/deliverables/project/${encodeURIComponent(projectId)}`,
    accessToken,
  );
}

export function getDeliverableVersions(accessToken: string, deliverableId: string) {
  return apiGet<Array<{ id: string; versionNo: number; fileUrl: string; createdAt: string }>>(
    `/deliverables/${encodeURIComponent(deliverableId)}/versions`,
    accessToken,
  );
}

export function createDeliverable(
  accessToken: string,
  body: {
    projectId: string;
    title: string;
    summary?: string;
    taskId?: string;
    milestoneId?: string;
  },
) {
  return apiPost<DeliverableItem>("/deliverables", accessToken, body);
}
