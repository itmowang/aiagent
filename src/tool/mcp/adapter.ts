import { createTool } from "../tool";
import type { Tool } from "../types";
import type { McpConnection } from "./client";

export function mcpToolToTool(
    conn: McpConnection,
    mcpTool: { name: string; description?: string; inputSchema: Record<string, unknown> }
): Tool {
    return createTool({
        name: `${conn.name}__${mcpTool.name}`,   // 加前缀防重名
        description: mcpTool.description ?? "",
        parameters: mcpTool.inputSchema,
        execute: async (input: any) => {
            // 用原始名（不带前缀）调用远端
            return conn.callTool(mcpTool.name, input ?? {});
        },
    });
}
