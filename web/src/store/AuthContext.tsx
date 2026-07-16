import React, {
  createContext,
  useContext,
  useMemo,
  useState,
} from "react";
import type { AuthSession, User } from "@/api/types";
import * as authApi from "@/api/auth";

interface AuthContextValue {
  session: AuthSession | null;
  user: User | null;
  isAdmin: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  // 同步从 localStorage 恢复登录态，避免刷新时首帧被路由守卫重定向到登录页
  const [session, setSession] = useState<AuthSession | null>(() =>
    authApi.currentSession()
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      user: session?.user ?? null,
      isAdmin: session?.user.role === "admin",
      login: async (username, password) => {
        const s = await authApi.login(username, password);
        setSession(s);
      },
      logout: () => {
        authApi.logout();
        setSession(null);
      },
    }),
    [session]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
