import { apiGet, apiPatch, apiPost } from "./client";

export async function createSection(
  accessToken: string,
  body: { milestoneId: string; name: string; orderNo: number },
) {
  return apiPost<{ id: string; name: string; orderNo: number }>(
    "/tasks/sections",
    accessToken,
    body,
  );
}

export async function getSection(accessToken: string, sectionId: string) {
  return apiGet<{ id: string; milestoneId: string; name: string; orderNo: number }>(
    `/tasks/sections/${encodeURIComponent(sectionId)}`,
    accessToken,
  );
}

export async function updateSection(
  accessToken: string,
  sectionId: string,
  body: { name?: string; orderNo?: number },
) {
  return apiPatch(`/tasks/sections/${encodeURIComponent(sectionId)}`, accessToken, body);
}

export async function archiveSection(accessToken: string, sectionId: string) {
  return apiPatch(
    `/tasks/sections/${encodeURIComponent(sectionId)}/archive`,
    accessToken,
    {},
  );
}

export async function createTask(
  accessToken: string,
  body: {
    sectionId: string;
    title: string;
    description?: string;
    dueDate?: string;
    clientVisible?: boolean;
    /** When set, task is a subtask of this parent (same section). */
    parentTaskId?: string;
  },
): Promise<{ id: string }> {
  return apiPost<{ id: string }>("/tasks", accessToken, body);
}

export async function getTask(accessToken: string, taskId: string) {
  return apiGet<{ id: string; title: string; state: string }>(
    `/tasks/${encodeURIComponent(taskId)}`,
    accessToken,
  );
}

export async function updateTask(
  accessToken: string,
  taskId: string,
  body: {
    title?: string;
    description?: string | null;
    dueDate?: string | null;
    parallelGroupId?: string | null;
    blockingType?: "MANDATORY" | "ADVISORY" | "OPTIONAL";
    clientVisible?: boolean;
    approvalRequired?: "INTERNAL_ONLY" | "CLIENT_ONLY" | "DUAL";
    paymentRelevant?: boolean;
    parentTaskId?: string | null;
  },
) {
  return apiPatch(`/tasks/${encodeURIComponent(taskId)}`, accessToken, body);
}

export async function archiveTask(accessToken: string, taskId: string) {
  return apiPatch(`/tasks/${encodeURIComponent(taskId)}/archive`, accessToken, {});
}

/** Assign a task to a user (must be a project member). Worker sees it in Tasks / Overview. */
export async function assignTask(
  accessToken: string,
  taskId: string,
  body: { userId: string; isReviewer?: boolean },
) {
  return apiPost(`/tasks/${encodeURIComponent(taskId)}/assign`, accessToken, body);
}
