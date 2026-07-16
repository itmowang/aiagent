import type { ToolRegistry } from "../registry";
import { connectMcp } from "./client";
import { mcpToolToTool } from "./adapter";
import type { McpServerConfig } from "./types";

export type { McpServerConfig } from "./types";
export { connectMcp } from "./client";

// 把某个 MCP server 的所有工具注册进 registry。失败不抛出，避免拖垮对话。
export async function registerMcpServer(
    registry: ToolRegistry,
    config: McpServerConfig
): Promise<void> {
    try {
        const conn = await connectMcp(config);
        const tools = await conn.listTools();
        for (const t of tools) {
            registry.register(mcpToolToTool(conn, t));
        }
    } catch (err) {
        console.error(`[mcp] 注册 ${config.name} 失败:`, err);
    }
}
