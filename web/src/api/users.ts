import { http } from "./http";
import type { User, UserRole, UserStatus } from "./types";

export interface CreateUserInput {
  username: string;
  displayName: string;
  password: string;
  role: UserRole;
  email?: string;
}

export interface UpdateUserInput {
  displayName?: string;
  role?: UserRole;
  status?: UserStatus;
  email?: string;
}

export async function listUsers(): Promise<User[]> {
  return http.get<User[]>("/api/users");
}

export async function createUser(input: CreateUserInput): Promise<User> {
  return http.post<User>("/api/users", input);
}

export async function updateUser(
  id: string,
  input: UpdateUserInput
): Promise<User> {
  return http.patch<User>(`/api/users/${id}`, input);
}

export async function deleteUser(id: string): Promise<void> {
  await http.delete(`/api/users/${id}`);
}

export async function resetPassword(
  id: string,
  password: string
): Promise<void> {
  await http.post(`/api/users/${id}/reset-password`, { password });
}
