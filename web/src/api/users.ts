import { read, write, uid, delay, remove } from "./db";
import { ensureSeed } from "./seed";
import type { StoredCredential } from "./seed";
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
  ensureSeed();
  return delay(read<User[]>("users", []));
}

export async function createUser(input: CreateUserInput): Promise<User> {
  ensureSeed();
  const users = read<User[]>("users", []);
  if (users.some((u) => u.username === input.username)) {
    throw new Error("用户名已存在");
  }
  const now = Date.now();
  const user: User = {
    id: uid(),
    username: input.username,
    displayName: input.displayName,
    role: input.role,
    status: "active",
    email: input.email,
    createdAt: now,
    updatedAt: now,
  };
  users.push(user);
  write("users", users);

  const creds = read<StoredCredential[]>("credentials", []);
  creds.push({
    userId: user.id,
    username: input.username,
    password: input.password,
  });
  write("credentials", creds);

  return delay(user);
}

export async function updateUser(
  id: string,
  input: UpdateUserInput
): Promise<User> {
  const users = read<User[]>("users", []);
  const idx = users.findIndex((u) => u.id === id);
  if (idx < 0) throw new Error("用户不存在");
  users[idx] = { ...users[idx], ...input, updatedAt: Date.now() };
  write("users", users);
  return delay(users[idx]);
}

export async function deleteUser(id: string): Promise<void> {
  const users = read<User[]>("users", []).filter((u) => u.id !== id);
  write("users", users);
  const creds = read<StoredCredential[]>("credentials", []).filter(
    (c) => c.userId !== id
  );
  write("credentials", creds);
  remove(`userMemory:${id}`);
  return delay(undefined);
}

export async function resetPassword(
  id: string,
  password: string
): Promise<void> {
  const creds = read<StoredCredential[]>("credentials", []);
  const cred = creds.find((c) => c.userId === id);
  if (cred) {
    cred.password = password;
    write("credentials", creds);
  }
  return delay(undefined);
}
