import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import type { McpServerConfig } from "./types";

export interface McpConnection {
    name: string;
    listTools(): Promise<Array<{
        name: string;
        description?: string;
        inputSchema: Record<string, unknown>;
    }>>;
    callTool(name: string, args: Record<string, unknown>): Promise<unknown>;
    close(): Promise<void>;
}

// 连接缓存：同名 server 复用，避免 stdio 反复拉起子进程
const cache = new Map<string, McpConnection>();

export async function connectMcp(config: McpServerConfig): Promise<McpConnection> {
    const existing = cache.get(config.name);
    if (existing) return existing;

    // 1. 按传输方式造 transport
    let transport;
    if (config.transport === "stdio") {
        if (!config.command) throw new Error(`MCP ${config.name} 缺少 command`);
        transport = new StdioClientTransport({
            command: config.command,
            args: config.args ?? [],
        });
    } else if (config.transport === "sse") {
        if (!config.url) throw new Error(`MCP ${config.name} 缺少 url`);
        transport = new SSEClientTransport(new URL(config.url));
    } else {
        if (!config.url) throw new Error(`MCP ${config.name} 缺少 url`);
        transport = new StreamableHTTPClientTransport(new URL(config.url));
    }

    // 2. 建 client 并连接
    const client = new Client(
        { name: "aiagent", version: "1.0.0" },
        { capabilities: {} }
    );
    await client.connect(transport);

    const conn: McpConnection = {
        name: config.name,
        async listTools() {
            const res = await client.listTools();
            return res.tools.map((t) => ({
                name: t.name,
                description: t.description,
                inputSchema: (t.inputSchema ?? {}) as Record<string, unknown>,
            }));
        },
        async callTool(name, args) {
            const res = await client.callTool({ name, arguments: args });
            // MCP 返回 { content: [{type:"text", text}, ...] }，拼成文本
            const content = (res as any).content;
            if (Array.isArray(content)) {
                return content
                    .map((c: any) => (c.type === "text" ? c.text : JSON.stringify(c)))
                    .join("\n");
            }
            return res;
        },
        async close() {
            await client.close();
            cache.delete(config.name);
        },
    };

    cache.set(config.name, conn);
    return conn;
}
