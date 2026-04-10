import { apiGet, apiPatch, apiPost } from "./client";

export type AdminUserRow = {
  id: string;
  email: string;
  name: string | null;
  globalRole: string;
  isActive: boolean;
  createdAt: string;
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

export async function createAdminUser(
  accessToken: string,
  body: { email: string; password: string; role: string; name?: string },
): Promise<AdminUserRow> {
  return apiPost<AdminUserRow>("/users", accessToken, body);
}

export async function updateAdminUser(
  accessToken: string,
  userId: string,
  body: {
    name?: string;
    email?: string;
    role?: string;
    isActive?: boolean;
    password?: string;
  },
): Promise<AdminUserRow> {
  return apiPatch<AdminUserRow>(`/users/${encodeURIComponent(userId)}`, accessToken, body);
}
