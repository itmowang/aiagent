import { Hono } from "hono";
import { prisma } from "../../lib/prisma";
import { authMiddleware, adminMiddleware, type AppEnv } from "../middleware";

export const modelRoutes = new Hono<AppEnv>();

modelRoutes.use("*", authMiddleware);

// 已登录用户都可读模型列表（聊天时需要选择模型）
modelRoutes.get("/", async (c) => {
    const models = await prisma.modelConfig.findMany({
        orderBy: { createdAt: "asc" },
    });
    // 不回传 apiKey 给普通用户
    const isAdmin = c.get("user").role === "admin";
    return c.json(
        models.map((m) => ({
            id: m.id,
            name: m.name,
            provider: m.provider,
            model: m.model,
            baseUrl: m.baseUrl,
            apiKey: isAdmin ? m.apiKey : undefined,
            temperature: m.temperature,
            maxTokens: m.maxTokens,
            isDefault: m.isDefault,
        }))
    );
});

// 新增/更新（管理员）
modelRoutes.post("/", adminMiddleware, async (c) => {
    const body = await c.req.json<{
        id?: string;
        name: string;
        provider: string;
        model: string;
        baseUrl?: string;
        apiKey?: string;
        temperature?: number;
        maxTokens?: number;
        isDefault?: boolean;
    }>();

    // 设为默认时，先清除其它默认
    if (body.isDefault) {
        await prisma.modelConfig.updateMany({
            data: { isDefault: false },
            where: { isDefault: true },
        });
    }

    const data = {
        name: body.name,
        provider: body.provider,
        model: body.model,
        baseUrl: body.baseUrl,
        apiKey: body.apiKey,
        temperature: body.temperature ?? 0.7,
        maxTokens: body.maxTokens ?? 2048,
        isDefault: body.isDefault ?? false,
    };

    const saved = body.id
        ? await prisma.modelConfig.update({ where: { id: body.id }, data })
        : await prisma.modelConfig.create({ data });

    return c.json(saved);
});

// 删除（管理员）
modelRoutes.delete("/:id", adminMiddleware, async (c) => {
    await prisma.modelConfig.delete({ where: { id: c.req.param("id") } });
    return c.json({ ok: true });
});
