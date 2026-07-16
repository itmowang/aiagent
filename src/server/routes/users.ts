import { Hono } from "hono";
import { prisma } from "../../lib/prisma";
import { hashPassword } from "../auth";
import { authMiddleware, adminMiddleware, type AppEnv } from "../middleware";

export const userRoutes = new Hono<AppEnv>();

// 全部用户路由都需要管理员权限
userRoutes.use("*", authMiddleware, adminMiddleware);

function publicUser(u: {
    id: string;
    username: string;
    displayName: string;
    email: string | null;
    role: "admin" | "user";
    status: "active" | "disabled";
    createdAt: Date;
    updatedAt: Date;
}) {
    return {
        id: u.id,
        username: u.username,
        displayName: u.displayName,
        email: u.email,
        role: u.role,
        status: u.status,
        createdAt: u.createdAt.getTime(),
        updatedAt: u.updatedAt.getTime(),
    };
}

// 列表
userRoutes.get("/", async (c) => {
    const users = await prisma.user.findMany({ orderBy: { createdAt: "asc" } });
    return c.json(users.map(publicUser));
});

// 创建
userRoutes.post("/", async (c) => {
    const body = await c.req.json<{
        username: string;
        displayName: string;
        password: string;
        role: "admin" | "user";
        email?: string;
    }>();

    if (!body.username || !body.password || !body.displayName) {
        return c.json({ error: "用户名、显示名、密码必填" }, 400);
    }

    const exists = await prisma.user.findUnique({
        where: { username: body.username },
    });
    if (exists) return c.json({ error: "用户名已存在" }, 409);

    const user = await prisma.user.create({
        data: {
            username: body.username,
            displayName: body.displayName,
            email: body.email,
            role: body.role ?? "user",
            passwordHash: await hashPassword(body.password),
        },
    });
    return c.json(publicUser(user), 201);
});

// 更新（显示名/角色/状态/邮箱）
userRoutes.patch("/:id", async (c) => {
    const id = c.req.param("id");
    const body = await c.req.json<{
        displayName?: string;
        role?: "admin" | "user";
        status?: "active" | "disabled";
        email?: string;
    }>();
    const user = await prisma.user.update({
        where: { id },
        data: {
            displayName: body.displayName,
            role: body.role,
            status: body.status,
            email: body.email,
        },
    });
    return c.json(publicUser(user));
});

// 删除
userRoutes.delete("/:id", async (c) => {
    const id = c.req.param("id");
    await prisma.user.delete({ where: { id } });
    return c.json({ ok: true });
});

// 重置密码
userRoutes.post("/:id/reset-password", async (c) => {
    const id = c.req.param("id");
    const { password } = await c.req.json<{ password: string }>();
    if (!password) return c.json({ error: "密码必填" }, 400);
    await prisma.user.update({
        where: { id },
        data: { passwordHash: await hashPassword(password) },
    });
    return c.json({ ok: true });
});

// ============ 管理员管理某用户的记忆 ============

userRoutes.get("/:id/memories", async (c) => {
    const userId = c.req.param("id");
    const memories = await prisma.memory.findMany({
        where: { userId },
        orderBy: { createdAt: "asc" },
    });
    return c.json(
        memories.map((m) => ({
            id: m.id,
            key: m.key,
            value: m.value,
            createdAt: m.createdAt.getTime(),
            updatedAt: m.updatedAt.getTime(),
        }))
    );
});

// 导入记忆（批量 upsert）
userRoutes.post("/:id/memories/import", async (c) => {
    const userId = c.req.param("id");
    const items = await c.req.json<{ key: string; value: string }[]>();
    if (!Array.isArray(items)) {
        return c.json({ error: "请求体需为数组" }, 400);
    }
    let count = 0;
    for (const it of items) {
        if (!it.key) continue;
        await prisma.memory.upsert({
            where: { userId_key: { userId, key: it.key } },
            update: { value: it.value },
            create: { userId, key: it.key, value: it.value },
        });
        count++;
    }
    return c.json({ count });
});

userRoutes.delete("/:id/memories/:memId", async (c) => {
    const memId = c.req.param("memId");
    await prisma.memory.delete({ where: { id: memId } });
    return c.json({ ok: true });
});

userRoutes.delete("/:id/memories", async (c) => {
    const userId = c.req.param("id");
    await prisma.memory.deleteMany({ where: { userId } });
    return c.json({ ok: true });
});
