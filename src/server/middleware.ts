import type { Context, Next } from "hono";
import { verifyToken, type JwtPayload } from "./auth";

// Hono 上下文变量类型
export type AppEnv = {
    Variables: {
        user: JwtPayload;
    };
};

// 校验 JWT，注入当前用户
export async function authMiddleware(c: Context<AppEnv>, next: Next) {
    const header = c.req.header("Authorization");
    if (!header || !header.startsWith("Bearer ")) {
        return c.json({ error: "未登录" }, 401);
    }
    const token = header.slice("Bearer ".length).trim();
    try {
        const payload = await verifyToken(token);
        c.set("user", payload);
    } catch {
        return c.json({ error: "登录已过期或无效" }, 401);
    }
    return next();
}

// 要求管理员角色
export async function adminMiddleware(c: Context<AppEnv>, next: Next) {
    const user = c.get("user");
    if (!user || user.role !== "admin") {
        return c.json({ error: "需要管理员权限" }, 403);
    }
    return next();
}
