import { apiPost } from "./client";

export async function createSection(
  accessToken: string,
  body: { milestoneId: string; name: string; orderNo: number },
) {
  return apiPost("/tasks/sections", accessToken, body);
}

export async function createTask(
  accessToken: string,
  body: {
    sectionId: string;
    title: string;
    description?: string;
    dueDate?: string;
    clientVisible?: boolean;
  },
): Promise<{ id: string }> {
  return apiPost<{ id: string }>("/tasks", accessToken, body);
}

/** Assign a task to a user (must be a project member). Worker sees it in Tasks / Overview. */
export async function assignTask(
  accessToken: string,
  taskId: string,
  body: { userId: string; isReviewer?: boolean },
) {
  return apiPost(`/tasks/${encodeURIComponent(taskId)}/assign`, accessToken, body);
}
