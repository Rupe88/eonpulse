import { apiGet } from "./client";

export type AdminUserRow = {
  id: string;
  email: string;
  name: string | null;
  globalRole: string;
};

export async function listAdminUsers(
  accessToken: string,
  search?: string,
): Promise<AdminUserRow[]> {
  const q = search?.trim();
  const path = q
    ? `/users?search=${encodeURIComponent(q)}`
    : "/users";
  return apiGet<AdminUserRow[]>(path, accessToken);
}
