import { apiGet, apiPatch, apiPost } from "./client";

/** GET /tasks/worker/queue */
export type WorkerQueueRow = {
  id: string;
  userId: string;
  isReviewer: boolean;
  taskId: string;
  user: { id: string; name: string | null; email: string };
  task: {
    id: string;
    title: string;
    state: string;
    dueDate: string | null;
    section: { id: string; name: string; milestone: { id: string; name: string; orderNo: number; state: string } };
  };
};

export type WorkerTaskViewer = {
  projectRole: string;
  globalRole: string | null;
  isAssigned: boolean;
  assignmentIsReviewer: boolean;
  canSubmitInternalReview: boolean;
  canManageInternalReview: boolean;
};

export type WorkerTaskDetail = {
  id: string;
  title: string;
  description: string | null;
  state: string;
  dueDate: string | null;
  parallelGroupId: string | null;
  blockingType: string;
  clientVisible: boolean;
  approvalRequired: string;
  paymentRelevant: boolean;
  section: {
    id: string;
    name: string;
    orderNo: number;
    milestone: {
      id: string;
      name: string;
      orderNo: number;
      state: string;
      projectId: string;
    };
  };
  assignments: Array<{
    id: string;
    userId: string;
    isReviewer: boolean;
    user: { id: string; name: string | null; email: string };
  }>;
  dependencies: Array<{
    id: string;
    dependsOnTaskId: string;
    dependsOnTask: { id: string; title: string; state: string; dueDate: string | null };
  }>;
  dependentTasks: Array<{
    id: string;
    taskId: string;
    task: { id: string; title: string; state: string; dueDate: string | null };
  }>;
  evidence: Array<{
    id: string;
    fileUrl: string;
    label: string | null;
    createdAt: string;
    uploadedBy: string;
  }>;
  gitLinks: Array<{
    id: string;
    repoId: string;
    issueKey: string | null;
    workingBranch: string | null;
    pullRequestUrl: string | null;
    releaseTag: string | null;
    environment: string | null;
    commitRefs: Array<{
      id: string;
      commitHash: string;
      message: string | null;
      authoredAt: string | null;
    }>;
  }>;
  viewer: WorkerTaskViewer;
  checklistItems?: Array<{
    id: string;
    label: string;
    orderNo: number;
    done: boolean;
    createdAt: string;
    updatedAt: string;
  }>;
  subtasks?: Array<{
    id: string;
    title: string;
    state: string;
    dueDate: string | null;
  }>;
};

export type WorkerTaskTimeline = {
  comments: Array<{
    id: string;
    body: string;
    visibility: string;
    isBlocker: boolean;
    createdAt: string;
    author: { id: string; name: string | null; email: string };
    thread: { id: string; isResolved: boolean; targetType: string };
  }>;
  reviews: Array<{
    id: string;
    isInternal: boolean;
    isResolved: boolean;
    resolutionNote: string | null;
    createdAt: string;
    requestedBy: { id: string; name: string | null; email: string };
    reviewer: { id: string; name: string | null; email: string } | null;
  }>;
  approvals: Array<{
    id: string;
    approved: boolean;
    note: string | null;
    createdAt: string;
    approvedBy: { id: string; name: string | null; email: string };
  }>;
  evidence: Array<{
    id: string;
    fileUrl: string;
    label: string | null;
    createdAt: string;
  }>;
};

export async function listWorkerQueue(
  accessToken: string,
  params: {
    projectId: string;
    state?: string;
    reviewer?: boolean;
  },
): Promise<WorkerQueueRow[]> {
  const sp = new URLSearchParams({ projectId: params.projectId });
  if (params.state) sp.set("state", params.state);
  if (params.reviewer !== undefined) sp.set("reviewer", String(params.reviewer));
  return apiGet<WorkerQueueRow[]>(`/tasks/worker/queue?${sp.toString()}`, accessToken);
}

export async function getWorkerTask(accessToken: string, taskId: string): Promise<WorkerTaskDetail> {
  return apiGet<WorkerTaskDetail>(`/tasks/worker/${encodeURIComponent(taskId)}`, accessToken);
}

export async function patchWorkerTaskState(
  accessToken: string,
  taskId: string,
  body: { state: string; note?: string },
) {
  return apiPatch<{ id: string; state: string }>(
    `/tasks/worker/${encodeURIComponent(taskId)}/state`,
    accessToken,
    body,
  );
}

export async function postWorkerEvidenceLink(
  accessToken: string,
  taskId: string,
  body: { fileUrl: string; label?: string },
) {
  return apiPost(`/tasks/worker/${encodeURIComponent(taskId)}/evidence-link`, accessToken, body);
}

export async function getWorkerTaskTimeline(
  accessToken: string,
  taskId: string,
): Promise<WorkerTaskTimeline> {
  return apiGet<WorkerTaskTimeline>(
    `/tasks/worker/${encodeURIComponent(taskId)}/timeline`,
    accessToken,
  );
}

/** Toggle or edit a checklist line item (PATCH /tasks/checklist-items/:itemId). Workers may set `done` only. */
export async function patchTaskChecklistItem(
  accessToken: string,
  itemId: string,
  body: { done?: boolean; label?: string; orderNo?: number },
) {
  return apiPatch<{
    id: string;
    label: string;
    orderNo: number;
    done: boolean;
  }>(`/tasks/checklist-items/${encodeURIComponent(itemId)}`, accessToken, body);
}
