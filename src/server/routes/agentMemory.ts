import { Hono } from "hono";
import { prisma } from "../../lib/prisma";
import { authMiddleware, adminMiddleware, type AppEnv } from "../middleware";

// Agent 全局记忆（对所有用户、所有对话生效），仅管理员维护
export const agentMemoryRoutes = new Hono<AppEnv>();

agentMemoryRoutes.use("*", authMiddleware, adminMiddleware);

agentMemoryRoutes.get("/", async (c) => {
    const items = await prisma.agentMemory.findMany({
        orderBy: { createdAt: "asc" },
    });
    return c.json(
        items.map((m) => ({
            id: m.id,
            key: m.key,
            value: m.value,
            createdAt: m.createdAt.getTime(),
            updatedAt: m.updatedAt.getTime(),
        }))
    );
});

agentMemoryRoutes.post("/", async (c) => {
    const { key, value } = await c.req.json<{ key: string; value: string }>();
    if (!key) return c.json({ error: "key 必填" }, 400);
    await prisma.agentMemory.upsert({
        where: { key },
        update: { value },
        create: { key, value },
    });
    return c.json({ ok: true });
});

agentMemoryRoutes.post("/import", async (c) => {
    const items = await c.req.json<{ key: string; value: string }[]>();
    if (!Array.isArray(items)) return c.json({ error: "请求体需为数组" }, 400);
    let count = 0;
    for (const it of items) {
        if (!it.key) continue;
        await prisma.agentMemory.upsert({
            where: { key: it.key },
            update: { value: it.value },
            create: { key: it.key, value: it.value },
        });
        count++;
    }
    return c.json({ count });
});

agentMemoryRoutes.delete("/:id", async (c) => {
    await prisma.agentMemory.deleteMany({ where: { id: c.req.param("id") } });
    return c.json({ ok: true });
});

agentMemoryRoutes.delete("/", async (c) => {
    await prisma.agentMemory.deleteMany({});
    return c.json({ ok: true });
});
