import { Hono } from "hono";
import { prisma } from "../../lib/prisma";
import { signToken, verifyPassword } from "../auth";
import { authMiddleware, type AppEnv } from "../middleware";

export const authRoutes = new Hono<AppEnv>();

// 登录
authRoutes.post("/login", async (c) => {
    const { username, password } = await c.req.json<{
        username: string;
        password: string;
    }>();

    if (!username || !password) {
        return c.json({ error: "用户名和密码必填" }, 400);
    }

    const user = await prisma.user.findUnique({ where: { username } });
    if (!user || !(await verifyPassword(password, user.passwordHash))) {
        return c.json({ error: "用户名或密码错误" }, 401);
    }
    if (user.status === "disabled") {
        return c.json({ error: "该账号已被禁用" }, 403);
    }

    const token = await signToken({
        id: user.id,
        username: user.username,
        role: user.role,
    });

    return c.json({
        token,
        user: {
            id: user.id,
            username: user.username,
            displayName: user.displayName,
            email: user.email,
            role: user.role,
            status: user.status,
        },
    });
});

// 当前登录用户
authRoutes.get("/me", authMiddleware, async (c) => {
    const payload = c.get("user");
    const user = await prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user) return c.json({ error: "用户不存在" }, 404);
    return c.json({
        id: user.id,
        username: user.username,
        displayName: user.displayName,
        email: user.email,
        role: user.role,
        status: user.status,
    });
});
