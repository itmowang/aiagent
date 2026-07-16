import { Hono } from "hono";
import { authMiddleware, adminMiddleware, type AppEnv } from "../middleware";
import { createToolRegistry } from "../../tool";
import { registerAgentTools } from "../toolsService";

export const toolRoutes = new Hono<AppEnv>();

toolRoutes.use("*", authMiddleware, adminMiddleware);

// 列出 Agent 当前可用的全部工具（内置 + 启用的 MCP）
toolRoutes.get("/", async (c) => {
    const registry = createToolRegistry();
    try {
        await registerAgentTools(registry);
    } catch (err) {
        console.error("[tools] 构建工具列表失败", err);
    }
    const tools = registry.list().map((t) => {
        // 名字里带 "服务名__工具名" 前缀的即来自 MCP
        const parts = t.name.split("__");
        const isMcp = parts.length > 1;
        return {
            name: t.name,
            description: t.description,
            source: isMcp ? parts[0] : "builtin",
        };
    });
    return c.json(tools);
});
