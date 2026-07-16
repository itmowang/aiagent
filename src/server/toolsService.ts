import { prisma } from "../lib/prisma";
import type { ToolRegistry } from "../tool";
import { createKnowledgeTool } from "../tool/ragTool";
import { registerMcpServer } from "../tool/mcp";
import type { McpServerConfig, McpTransport } from "../tool/mcp/types";
import { searchKnowledge } from "./ragService";

// 把 Agent 当前可用的所有工具注册进 registry：
// 内置知识库工具 + 所有启用的 MCP 服务工具。
// agentRunner 和 /api/tools 共用此逻辑，保证"看到的"和"实际用的"一致。
export async function registerAgentTools(registry: ToolRegistry): Promise<void> {
    // 内置：知识库检索
    registry.register(
        createKnowledgeTool({
            search: (query: string, limit = 5) => searchKnowledge(query, limit),
        })
    );

    // 启用的 MCP 服务
    const servers = await prisma.mcpServer.findMany({ where: { enabled: true } });
    for (const s of servers) {
        const cfg: McpServerConfig = {
            name: s.name,
            transport: s.transport as McpTransport,
            command: s.command ?? undefined,
            args: Array.isArray(s.args) ? (s.args as string[]) : [],
            url: s.url ?? undefined,
            enabled: s.enabled,
            autoApprove: Array.isArray(s.autoApprove) ? (s.autoApprove as string[]) : [],
        };
        await registerMcpServer(registry, cfg);
    }
}
