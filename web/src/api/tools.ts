import { http } from "./http";

export interface ToolInfo {
  name: string;
  description: string;
  source: string; // "builtin" 或 MCP 服务名
}

// 列出 Agent 当前可用的全部工具（内置 + 启用的 MCP）
export async function listTools(): Promise<ToolInfo[]> {
  return http.get<ToolInfo[]>("/api/tools");
}
