import { apiGet, apiPatch, apiPost } from "./client";

export type ReviewQueueItem = {
  id: string;
  taskId: string | null;
  milestoneId: string | null;
  reviewerId: string | null;
  requestedById: string;
  isInternal: boolean;
  isResolved: boolean;
  resolutionNote: string | null;
  createdAt: string;
  updatedAt: string;
  task?: { id: string; title: string; state: string } | null;
  milestone?: { id: string; name: string; state: string } | null;
};

export type ThreadItem = {
  id: string;
  targetType: string;
  taskId: string | null;
  milestoneId: string | null;
  deliverableId: string | null;
  isResolved: boolean;
  createdAt: string;
  comments: Array<{
    id: string;
    body: string;
    visibility: string;
    isBlocker: boolean;
    createdAt: string;
  }>;
};

export type ApprovalItem = {
  id: string;
  targetType: string;
  taskId: string | null;
  milestoneId: string | null;
  deliverableId: string | null;
  approved: boolean;
  note: string | null;
  createdAt: string;
};

export function listReviewQueue(
  accessToken: string,
  projectId: string,
  scope: "all" | "internal" | "client" = "all",
  resolved: "all" | "true" | "false" = "all",
) {
  const sp = new URLSearchParams({ projectId, scope });
  if (resolved !== "all") sp.set("resolved", resolved);
  return apiGet<ReviewQueueItem[]>(`/reviews/queue?${sp.toString()}`, accessToken);
}

export function assignReviewReviewer(
  accessToken: string,
  reviewId: string,
  reviewerId: string,
) {
  return apiPatch(`/reviews/${encodeURIComponent(reviewId)}/assign`, accessToken, {
    reviewerId,
  });
}

export function resolveReview(
  accessToken: string,
  reviewId: string,
  resolutionNote?: string,
) {
  return apiPatch(`/reviews/${encodeURIComponent(reviewId)}/resolve`, accessToken, {
    resolutionNote,
  });
}

export function listThreads(
  accessToken: string,
  projectId: string,
  resolved: "all" | "true" | "false" = "all",
) {
  const sp = new URLSearchParams({ projectId });
  if (resolved !== "all") sp.set("resolved", resolved);
  return apiGet<ThreadItem[]>(`/reviews/threads?${sp.toString()}`, accessToken);
}

export function listApprovals(
  accessToken: string,
  projectId: string,
  targetType: "ALL" | "TASK" | "MILESTONE" | "DELIVERABLE" = "ALL",
) {
  const sp = new URLSearchParams({ projectId });
  if (targetType !== "ALL") sp.set("targetType", targetType);
  return apiGet<ApprovalItem[]>(`/reviews/approvals?${sp.toString()}`, accessToken);
}

export function createApproval(
  accessToken: string,
  body: {
    targetType: "TASK" | "MILESTONE" | "DELIVERABLE";
    taskId?: string;
    milestoneId?: string;
    deliverableId?: string;
    approved: boolean;
    note?: string;
  },
) {
  return apiPost("/reviews/approvals", accessToken, body);
}

export function submitTaskInternalReview(
  accessToken: string,
  taskId: string,
  reviewerId?: string,
) {
  return apiPost(
    `/reviews/tasks/${encodeURIComponent(taskId)}/submit-internal`,
    accessToken,
    reviewerId ? { reviewerId } : {},
  );
}

export function requestInternalRework(
  accessToken: string,
  taskId: string,
  note: string,
) {
  return apiPost(
    `/reviews/tasks/${encodeURIComponent(taskId)}/internal-rework`,
    accessToken,
    { note },
  );
}

export function sendTaskToClientReview(accessToken: string, taskId: string) {
  return apiPost(
    `/reviews/tasks/${encodeURIComponent(taskId)}/send-to-client`,
    accessToken,
    {},
  );
}

export function clientCommentOnTask(
  accessToken: string,
  taskId: string,
  body: string,
) {
  return apiPost(
    `/reviews/tasks/${encodeURIComponent(taskId)}/client-comment`,
    accessToken,
    { body },
  );
}

export function clientApproveTask(
  accessToken: string,
  taskId: string,
  note?: string,
) {
  return apiPost(
    `/reviews/tasks/${encodeURIComponent(taskId)}/client-approve`,
    accessToken,
    { ...(note ? { note } : {}) },
  );
}
