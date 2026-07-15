import { read, write, uid, delay } from "./db";
import { ensureSeed } from "./seed";
import type { StoredCredential } from "./seed";
import type { AuthSession, User } from "./types";

const SESSION_KEY = "session";

export async function login(
  username: string,
  password: string
): Promise<AuthSession> {
  ensureSeed();
  const creds = read<StoredCredential[]>("credentials", []);
  const users = read<User[]>("users", []);
  const cred = creds.find((c) => c.username === username);
  if (!cred || cred.password !== password) {
    throw new Error("用户名或密码错误");
  }
  const user = users.find((u) => u.id === cred.userId);
  if (!user) throw new Error("用户不存在");
  if (user.status === "disabled") throw new Error("该账号已被禁用");

  const session: AuthSession = {
    token: uid() + uid(),
    user,
  };
  write(SESSION_KEY, session);
  return delay(session);
}

export function currentSession(): AuthSession | null {
  ensureSeed();
  return read<AuthSession | null>(SESSION_KEY, null);
}

export function logout(): void {
  write(SESSION_KEY, null);
}
