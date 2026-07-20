import { Hono } from "hono";
import { prisma } from "../../lib/prisma";
import { authMiddleware, adminMiddleware, type AppEnv } from "../middleware";
import { loadSkills } from "../../skill";

export const skillRoutes = new Hono<AppEnv>();

skillRoutes.use("*", authMiddleware, adminMiddleware);

// 列表（内置 + 自定义，合并形态）
skillRoutes.get("/", async (c) => {
    const skills = await loadSkills();
    return c.json(
        skills.map((s) => ({
            key: s.key,
            name: s.name,
            description: s.description,
            systemPrompt: s.systemPrompt,
            builtin: s.builtin,
            enabled: s.enabled,
            hasOwnTools: !!s.buildTools,
        }))
    );
});

// 新增自定义技能
skillRoutes.post("/", async (c) => {
    const body = await c.req.json<{
        name: string;
        description: string;
        systemPrompt: string;
    }>();
    if (!body.name || !body.systemPrompt) {
        return c.json({ error: "name 和 systemPrompt 必填" }, 400);
    }
    // 用 name 生成 key（自定义技能）
    const key = `custom:${body.name}`;
    const exists = await prisma.skill.findUnique({ where: { key } });
    if (exists) return c.json({ error: "同名技能已存在" }, 409);

    const saved = await prisma.skill.create({
        data: {
            key,
            name: body.name,
            description: body.description ?? "",
            systemPrompt: body.systemPrompt,
            builtin: false,
            enabled: true,
        },
    });
    return c.json(saved);
});

// 更新（开关 / 内置的 prompt 覆盖 / 自定义的编辑）
skillRoutes.patch("/:key", async (c) => {
    const key = c.req.param("key");
    const body = await c.req.json<{
        enabled?: boolean;
        name?: string;
        description?: string;
        systemPrompt?: string;
    }>();

    // 内置技能可能还没落库（理论上 seed 已建）；用 upsert 兜底
    const existing = await prisma.skill.findUnique({ where: { key } });
    if (!existing) return c.json({ error: "技能不存在" }, 404);

    const saved = await prisma.skill.update({
        where: { key },
        data: {
            enabled: typeof body.enabled === "boolean" ? body.enabled : existing.enabled,
            // 内置技能只允许改 prompt/enabled，name/description 以代码为准
            name: existing.builtin ? existing.name : body.name ?? existing.name,
            description: existing.builtin
                ? existing.description
                : body.description ?? existing.description,
            systemPrompt: body.systemPrompt ?? existing.systemPrompt,
        },
    });
    return c.json(saved);
});

// 删除（仅自定义）
skillRoutes.delete("/:key", async (c) => {
    const key = c.req.param("key");
    const existing = await prisma.skill.findUnique({ where: { key } });
    if (!existing) return c.json({ error: "技能不存在" }, 404);
    if (existing.builtin) return c.json({ error: "内置技能不可删除，可停用" }, 400);
    await prisma.skill.delete({ where: { key } });
    return c.json({ ok: true });
});
