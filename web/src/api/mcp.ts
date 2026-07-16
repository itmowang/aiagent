import { http } from "./http";
import type { McpServerConfig } from "./types";

export async function listMcpServers(): Promise<McpServerConfig[]> {
  return http.get<McpServerConfig[]>("/api/mcp");
}

export async function upsertMcpServer(
  server: Omit<McpServerConfig, "id" | "createdAt"> & { id?: string }
): Promise<McpServerConfig> {
  return http.post<McpServerConfig>("/api/mcp", server);
}

export async function deleteMcpServer(id: string): Promise<void> {
  await http.delete(`/api/mcp/${id}`);
}

export interface McpTestResult {
  ok: boolean;
  tools?: { name: string; description?: string }[];
  error?: string;
}

// 测试连接：连上并列出工具
export async function testMcpServer(id: string): Promise<McpTestResult> {
  return http.post<McpTestResult>(`/api/mcp/${id}/test`);
}
