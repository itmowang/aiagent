import { Hono } from "hono";
import { prisma } from "../../lib/prisma";
import { authMiddleware, type AppEnv } from "../middleware";

export const conversationRoutes = new Hono<AppEnv>();

conversationRoutes.use("*", authMiddleware);

// 当前用户的会话列表
conversationRoutes.get("/", async (c) => {
    const userId = c.get("user").sub;
    const list = await prisma.conversation.findMany({
        where: { userId },
        orderBy: { updatedAt: "desc" },
    });
    return c.json(
        list.map((cv) => ({
            id: cv.id,
            title: cv.title,
            modelId: cv.modelId,
            createdAt: cv.createdAt.getTime(),
            updatedAt: cv.updatedAt.getTime(),
        }))
    );
});

// 单个会话及其消息
conversationRoutes.get("/:id", async (c) => {
    const userId = c.get("user").sub;
    const id = c.req.param("id");
    const cv = await prisma.conversation.findFirst({
        where: { id, userId },
        include: { messages: { orderBy: { createdAt: "asc" } } },
    });
    if (!cv) return c.json({ error: "会话不存在" }, 404);
    return c.json({
        id: cv.id,
        title: cv.title,
        modelId: cv.modelId,
        messages: cv.messages.map((m) => ({
            id: m.id,
            role: m.role,
            content: m.content,
            createdAt: m.createdAt.getTime(),
        })),
    });
});

// 删除会话
conversationRoutes.delete("/:id", async (c) => {
    const userId = c.get("user").sub;
    const id = c.req.param("id");
    await prisma.conversation.deleteMany({ where: { id, userId } });
    return c.json({ ok: true });
});
