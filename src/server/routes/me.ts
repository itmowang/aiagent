import { Hono } from "hono";
import { prisma } from "../../lib/prisma";
import { authMiddleware, type AppEnv } from "../middleware";

// 当前用户管理自己的记忆
export const meRoutes = new Hono<AppEnv>();

meRoutes.use("*", authMiddleware);

meRoutes.get("/memories", async (c) => {
    const userId = c.get("user").sub;
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

meRoutes.post("/memories", async (c) => {
    const userId = c.get("user").sub;
    const { key, value } = await c.req.json<{ key: string; value: string }>();
    if (!key) return c.json({ error: "key 必填" }, 400);
    await prisma.memory.upsert({
        where: { userId_key: { userId, key } },
        update: { value },
        create: { userId, key, value },
    });
    return c.json({ ok: true });
});

meRoutes.post("/memories/import", async (c) => {
    const userId = c.get("user").sub;
    const items = await c.req.json<{ key: string; value: string }[]>();
    if (!Array.isArray(items)) return c.json({ error: "请求体需为数组" }, 400);
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

meRoutes.delete("/memories/:memId", async (c) => {
    const userId = c.get("user").sub;
    const memId = c.req.param("memId");
    // 只能删自己的
    await prisma.memory.deleteMany({ where: { id: memId, userId } });
    return c.json({ ok: true });
});

meRoutes.delete("/memories", async (c) => {
    const userId = c.get("user").sub;
    await prisma.memory.deleteMany({ where: { userId } });
    return c.json({ ok: true });
});
