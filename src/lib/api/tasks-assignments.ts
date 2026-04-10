import { apiGet } from "./client";

export type AssignmentTaskPayload = {
  assignmentId: string;
  isReviewer: boolean;
  task: {
    id: string;
    title: string;
    state: string;
    dueDate: string | null;
    section: { id: string; name: string };
    milestone: {
      id: string;
      name: string;
      orderNo: number;
      state: string;
    };
  };
};

export async function listMyAssignments(
  projectId: string,
  accessToken: string,
): Promise<AssignmentTaskPayload[]> {
  const q = new URLSearchParams({ projectId });
  return apiGet<AssignmentTaskPayload[]>(
    `/tasks/my-assignments?${q.toString()}`,
    accessToken,
  );
}

export async function listMyReviewAssignments(
  projectId: string,
  accessToken: string,
): Promise<AssignmentTaskPayload[]> {
  const q = new URLSearchParams({ projectId });
  return apiGet<AssignmentTaskPayload[]>(
    `/tasks/my-review-assignments?${q.toString()}`,
    accessToken,
  );
}
