import { apiGet } from "./client";

export type ClientDashboardPayload = {
  project: {
    id: string;
    name: string;
    code: string;
    state: string;
    dueDate: string | null;
  } | null;
  milestones: Array<{ id: string; name: string; state: string; orderNo: number }>;
  pendingClientReviewTasks: number;
  openBlockerThreads: number;
  invoices: Array<{
    id: string;
    invoiceNumber: string;
    amount: string;
    dueAt: string;
    state: string;
    issuedAt: string;
  }>;
  deliverables: Array<{
    id: string;
    title: string;
    summary: string | null;
    updatedAt: string;
  }>;
  recentClientComments: Array<{
    id: string;
    body: string;
    createdAt: string;
    threadId: string;
  }>;
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
