import { listMyProjects } from "./workspace";
import { listMyAssignments, type AssignmentTaskPayload } from "./tasks-assignments";

/** Assignment row with project context (for “all projects” task list). */
export type MyTaskRow = AssignmentTaskPayload & {
  projectId: string;
  projectName: string;
  projectCode: string;
};

export async function listMyAssignmentsAllProjects(accessToken: string): Promise<MyTaskRow[]> {
  const projects = await listMyProjects(accessToken);
  const chunks = await Promise.all(
    projects.map(async (p) => {
      const rows = await listMyAssignments(p.projectId, accessToken);
      return rows.map((r) => ({
        ...r,
        projectId: p.projectId,
        projectName: p.name,
        projectCode: p.code,
      }));
    }),
  );
  return chunks.flat();
}
