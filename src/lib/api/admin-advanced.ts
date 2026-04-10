import { apiGet, apiPatch, apiPost } from "./client";

export type WorkflowTransitionResult = {
  id: string;
  state: string;
};

export function transitionProjectState(
  accessToken: string,
  projectId: string,
  state: string,
  note?: string,
) {
  return apiPatch<WorkflowTransitionResult>(
    `/workflow/projects/${encodeURIComponent(projectId)}/state/${encodeURIComponent(state)}`,
    accessToken,
    { note },
  );
}

export function transitionMilestoneState(
  accessToken: string,
  milestoneId: string,
  state: string,
  note?: string,
) {
  return apiPatch<WorkflowTransitionResult>(
    `/workflow/milestones/${encodeURIComponent(milestoneId)}/state/${encodeURIComponent(state)}`,
    accessToken,
    { note },
  );
}

export function transitionTaskState(
  accessToken: string,
  taskId: string,
  state: string,
  note?: string,
) {
  return apiPatch<WorkflowTransitionResult>(
    `/workflow/tasks/${encodeURIComponent(taskId)}/state/${encodeURIComponent(state)}`,
    accessToken,
    { note },
  );
}

export function getMilestoneClosable(accessToken: string, milestoneId: string) {
  return apiGet<{
    closable: boolean;
    checks: {
      mandatoryNotApproved: number;
      blockerCommentsOpen: number;
      requiredDeliverablesPresent: boolean;
      internalReviewPassed: boolean;
      clientApprovalRecorded: boolean;
    };
  }>(`/workflow/milestones/${encodeURIComponent(milestoneId)}/closable`, accessToken);
}

export function unlockNextMilestone(accessToken: string, milestoneId: string) {
  return apiPost<{ unlocked: boolean; reason?: string }>(
    `/workflow/milestones/${encodeURIComponent(milestoneId)}/unlock-next`,
    accessToken,
    {},
  );
}

export function raiseMilestoneInvoice(
  accessToken: string,
  milestoneId: string,
) {
  return apiPost<{ id: string; state: string; invoiceNumber: string }>(
    `/billing/milestones/${encodeURIComponent(milestoneId)}/invoice`,
    accessToken,
    {},
  );
}

export function verifyPayment(
  accessToken: string,
  paymentId: string,
  transactionRef?: string,
) {
  return apiPost<{ id: string; state: string }>(
    `/billing/payments/${encodeURIComponent(paymentId)}/verify`,
    accessToken,
    { transactionRef },
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
  return apiPost<{ id: string; title: string }>("/deliverables", accessToken, body);
}

export function listProjectDeliverables(accessToken: string, projectId: string) {
  return apiGet<Array<{ id: string; title: string; updatedAt: string }>>(
    `/deliverables/project/${encodeURIComponent(projectId)}`,
    accessToken,
  );
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
  return apiPost<{ id: string }>("/git-links", accessToken, body);
}

export function sendInAppNotification(
  accessToken: string,
  body: { userId: string; subject: string; message: string; payload?: unknown },
) {
  return apiPost<{ id: string; status: string }>(
    "/notifications/in-app",
    accessToken,
    body,
  );
}

