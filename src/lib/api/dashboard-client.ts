import { apiGet } from "./client";

export type ClientNextAction = {
  kind: "PAY_INVOICE" | "REVIEW_TASKS" | "REVIEW_MILESTONE" | "NONE";
  title: string;
  subtitle?: string;
  invoiceId?: string;
  invoiceNumber?: string;
  amount?: string;
  dueAt?: string;
  milestoneName?: string;
  taskReviewCount?: number;
  milestoneReviewCount?: number;
};

export type ClientDashboardPayload = {
  viewer: "CLIENT" | "OPS";
  project: {
    id: string;
    name: string;
    code: string;
    state: string;
    dueDate: string | null;
  } | null;
  projectProgress: {
    percentComplete: number;
    basis: "tasks" | "milestones";
    completedTasks: number;
    totalTasks: number;
    completedMilestones: number;
    totalMilestones: number;
  };
  currentMilestone: {
    id: string;
    name: string;
    state: string;
    orderNo: number;
  } | null;
  milestones: Array<{ id: string; name: string; state: string; orderNo: number }>;
  pendingClientReviewTasks: number;
  pendingMilestoneClientReview: number;
  pendingApprovalCount: number;
  pendingPaymentCount: number;
  /** Internal signal; omitted for pure client viewers. */
  openBlockerThreads?: number;
  invoices: Array<{
    id: string;
    invoiceNumber: string;
    amount: string;
    dueAt: string;
    state: string;
    issuedAt: string;
    milestoneId: string;
    milestoneName: string;
  }>;
  deliverables: Array<{
    id: string;
    title: string;
    summary: string | null;
    updatedAt: string;
    contextLabel: string;
    latestVersion: { versionNo: number; fileUrl: string } | null;
  }>;
  recentClientComments: Array<{
    id: string;
    body: string;
    createdAt: string;
    threadId: string;
  }>;
  nextAction: ClientNextAction;
};

export async function getClientDashboard(
  projectId: string,
  accessToken: string,
): Promise<ClientDashboardPayload> {
  return apiGet<ClientDashboardPayload>(
    `/dashboard/client/${encodeURIComponent(projectId)}`,
    accessToken,
  );
}
