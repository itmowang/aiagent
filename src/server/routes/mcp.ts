import { Hono } from "hono";
import { prisma } from "../../lib/prisma";
import { authMiddleware, adminMiddleware, type AppEnv } from "../middleware";
import { connectMcp } from "../../tool/mcp";
import type { McpServerConfig, McpTransport } from "../../tool/mcp/types";

export const mcpRoutes = new Hono<AppEnv>();

mcpRoutes.use("*", authMiddleware, adminMiddleware);

function toClient(d: {
    id: string;
    name: string;
    transport: string;
    command: string | null;
    args: unknown;
    url: string | null;
    enabled: boolean;
    autoApprove: unknown;
    createdAt: Date;
}) {
    return {
        id: d.id,
        name: d.name,
        transport: d.transport as McpTransport,
        command: d.command,
        args: Array.isArray(d.args) ? (d.args as string[]) : [],
        url: d.url,
        enabled: d.enabled,
        autoApprove: Array.isArray(d.autoApprove) ? (d.autoApprove as string[]) : [],
        createdAt: d.createdAt.getTime(),
    };
}

// DB 行 → 连接配置
function toConfig(d: {
    name: string;
    transport: string;
    command: string | null;
    args: unknown;
    url: string | null;
    enabled: boolean;
    autoApprove: unknown;
}): McpServerConfig {
    return {
        name: d.name,
        transport: d.transport as McpTransport,
        command: d.command ?? undefined,
        args: Array.isArray(d.args) ? (d.args as string[]) : [],
        url: d.url ?? undefined,
        enabled: d.enabled,
        autoApprove: Array.isArray(d.autoApprove) ? (d.autoApprove as string[]) : [],
    };
}

// 列表
mcpRoutes.get("/", async (c) => {
    const list = await prisma.mcpServer.findMany({ orderBy: { createdAt: "asc" } });
    return c.json(list.map(toClient));
});

// 新增 / 更新
mcpRoutes.post("/", async (c) => {
    const body = await c.req.json<{
        id?: string;
        name: string;
        transport: McpTransport;
        command?: string;
        args?: string[];
        url?: string;
        enabled?: boolean;
        autoApprove?: string[];
    }>();

    if (!body.name || !body.transport) {
        return c.json({ error: "name 和 transport 必填" }, 400);
    }

    const data = {
        name: body.name,
        transport: body.transport,
        command: body.command ?? null,
        args: body.args ?? [],
        url: body.url ?? null,
        enabled: body.enabled ?? true,
        autoApprove: body.autoApprove ?? [],
    };

    const saved = body.id
        ? await prisma.mcpServer.update({ where: { id: body.id }, data })
        : await prisma.mcpServer.create({ data });

    return c.json(toClient(saved));
});

// 删除
mcpRoutes.delete("/:id", async (c) => {
    await prisma.mcpServer.delete({ where: { id: c.req.param("id") } });
    return c.json({ ok: true });
});

// 测试连接：连上并列出工具（不落库）
mcpRoutes.post("/:id/test", async (c) => {
    const server = await prisma.mcpServer.findUnique({
        where: { id: c.req.param("id") },
    });
    if (!server) return c.json({ error: "服务不存在" }, 404);
    try {
        const conn = await connectMcp(toConfig(server));
        const tools = await conn.listTools();
        return c.json({
            ok: true,
            tools: tools.map((t) => ({ name: t.name, description: t.description })),
        });
    } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        return c.json({ ok: false, error: msg }, 200);
    }
});
