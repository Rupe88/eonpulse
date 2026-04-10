import { apiGet } from "./client";

export type ProjectProgressPayload = {
  project: {
    id: string;
    name: string;
    code: string;
    state: string;
    dueDate: string | null;
    client: { id: string; name: string };
    workspace: { id: string; name: string; slug: string };
  } | null;
  summary: {
    totalTasks: number;
    approvedTasks: number;
    openTasks: number;
    completionPct: number;
    overdueTasks: number;
    blockerThreads: number;
    reviewPending: number;
    paymentsPending: number;
    riskScore: number;
    health: "HEALTHY" | "WATCH" | "AT_RISK";
  };
  milestones: Array<{
    id: string;
    name: string;
    orderNo: number;
    state: string;
    paymentGateMode: string;
    billingAmount: string | null;
    paymentDueDays: number | null;
    totalTasks: number;
    approvedTasks: number;
    overdueTasks: number;
    completionPct: number;
  }>;
};

export async function getProjectProgress(projectId: string, accessToken: string) {
  return apiGet<ProjectProgressPayload>(
    `/dashboard/progress/${encodeURIComponent(projectId)}`,
    accessToken,
  );
}

export type PortfolioProgressPayload = {
  summary: {
    projectsCount: number;
    totalTasks: number;
    approvedTasks: number;
    openTasks: number;
    overdueTasks: number;
    avgCompletionPct: number;
    avgRiskScore: number;
  };
  completionTrend: Array<{ day: string; completed: number }>;
  projectRankings: Array<{
    id: string;
    name: string;
    code: string;
    state: string;
    dueDate: string | null;
    workspace: { id: string; name: string; slug: string };
    client: { id: string; name: string };
    totalTasks: number;
    approvedTasks: number;
    openTasks: number;
    overdueTasks: number;
    blockerThreads: number;
    reviewPending: number;
    paymentsPending: number;
    completed7d: number;
    completionPct: number;
    riskScore: number;
    health: "HEALTHY" | "WATCH" | "AT_RISK";
  }>;
  topRisks: Array<{
    id: string;
    name: string;
    code: string;
    riskScore: number;
    overdueTasks: number;
    blockerThreads: number;
    health: "HEALTHY" | "WATCH" | "AT_RISK";
  }>;
  teamThroughput: Array<{
    userId: string;
    name: string;
    email: string;
    approvedTasks: number;
  }>;
};

export async function getPortfolioProgress(accessToken: string) {
  return apiGet<PortfolioProgressPayload>("/dashboard/portfolio", accessToken);
}
