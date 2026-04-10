import { apiGet } from "./client";

export type InternalDashboardPayload = {
  projectId: string;
  tasksInInternalReview: number;
  tasksInClientReview: number;
  openBlockerThreads: number;
  pendingApprovals: number;
};

export type ProjectOverviewPayload = {
  project: {
    id: string;
    name: string;
    code: string;
    state: string;
    dueDate: string | null;
    workspace: { id: string; name: string; slug: string };
    client: { id: string; name: string };
  } | null;
  kpis: {
    totalTasks: number;
    openTasks: number;
    dueTodayTasks: number;
    overdueTasks: number;
    completedThisWeek: number;
    milestonesInProgress: number;
    pendingPayments: number;
  };
  statusBreakdown: Array<{ state: string; count: number }>;
  completionTrend: Array<{ day: string; completed: number }>;
  recentTasks: Array<{
    id: string;
    title: string;
    state: string;
    dueDate: string | null;
    updatedAt: string;
    section: { id: string; name: string; milestone: { id: string; name: string } };
  }>;
};

export async function getInternalDashboard(
  projectId: string,
  accessToken: string,
): Promise<InternalDashboardPayload> {
  return apiGet<InternalDashboardPayload>(
    `/dashboard/internal/${projectId}`,
    accessToken,
  );
}

export async function getProjectOverview(
  projectId: string,
  accessToken: string,
): Promise<ProjectOverviewPayload> {
  return apiGet<ProjectOverviewPayload>(
    `/dashboard/overview/${projectId}`,
    accessToken,
  );
}
