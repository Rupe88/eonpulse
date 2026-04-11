import type { WorkerTaskViewer } from "@/lib/api/worker-tasks";

/**
 * Must stay in sync with backend TasksService.updateWorkerTaskState allowed map.
 * Internal-review entry/exit for leads is gated by `viewer` (see backend ReviewsService).
 */
export const WORKER_ALLOWED_NEXT_STATES: Record<string, string[]> = {
  BACKLOG: ["ASSIGNED", "IN_PROGRESS"],
  ASSIGNED: ["IN_PROGRESS", "BLOCKED"],
  IN_PROGRESS: ["IN_INTERNAL_REVIEW", "BLOCKED"],
  IN_INTERNAL_REVIEW: ["REWORK_REQUESTED", "READY_FOR_CLIENT_REVIEW"],
  REWORK_REQUESTED: ["FIX_IN_PROGRESS"],
  READY_FOR_CLIENT_REVIEW: ["CLIENT_COMMENTED", "APPROVED"],
  CLIENT_COMMENTED: ["FIX_IN_PROGRESS"],
  FIX_IN_PROGRESS: ["IN_INTERNAL_REVIEW", "READY_FOR_CLIENT_REVIEW"],
  APPROVED: [],
  BLOCKED: ["IN_PROGRESS", "FIX_IN_PROGRESS"],
};

export function nextStatesForWorker(
  current: string,
  viewer?: WorkerTaskViewer | null,
): string[] {
  let next = WORKER_ALLOWED_NEXT_STATES[current] ?? [];
  if (!viewer?.canManageInternalReview) {
    next = next.filter(
      (s) =>
        !(
          current === "IN_INTERNAL_REVIEW" &&
          (s === "REWORK_REQUESTED" || s === "READY_FOR_CLIENT_REVIEW")
        ),
    );
  }
  if (!viewer?.canSubmitInternalReview) {
    next = next.filter((s) => s !== "IN_INTERNAL_REVIEW");
  }
  return next;
}
