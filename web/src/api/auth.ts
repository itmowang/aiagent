import { http, setToken, getToken, setCurrentUserId } from "./http";
import type { AuthSession, User } from "./types";

interface LoginResponse {
  token: string;
  user: Omit<User, "createdAt" | "updatedAt">;
}

const SESSION_USER_KEY = "aiagent:sessionUser";

export async function login(
  username: string,
  password: string
): Promise<AuthSession> {
  const res = await http.post<LoginResponse>("/api/auth/login", {
    username,
    password,
  });
  setToken(res.token);
  setCurrentUserId(res.user.id);

  const user: User = {
    ...res.user,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  localStorage.setItem(SESSION_USER_KEY, JSON.stringify(user));

  return { token: res.token, user };
}

export function currentSession(): AuthSession | null {
  const token = getToken();
  const raw = localStorage.getItem(SESSION_USER_KEY);
  if (!token || !raw) return null;
  try {
    return { token, user: JSON.parse(raw) as User };
  } catch {
    return null;
  }
}

export function logout(): void {
  setToken(null);
  setCurrentUserId(null);
  localStorage.removeItem(SESSION_USER_KEY);
}
