// 前端领域模型定义。
// 这些类型对应后端将来提供的接口，目前由 mock 层（localStorage）实现。

export type UserRole = "admin" | "user";
export type UserStatus = "active" | "disabled";

export interface User {
  id: string;
  username: string;
  displayName: string;
  role: UserRole;
  status: UserStatus;
  email?: string;
  createdAt: number;
  updatedAt: number;
}

// 登录会话
export interface AuthSession {
  token: string;
  user: User;
}

// ============ 每个用户独立的配置 ============

// 记忆项（对应后端 Memory 模型的 key/value）
export interface MemoryItem {
  id: string;
  key: string;
  value: string;
  createdAt: number;
  updatedAt: number;
}

// RAG 知识库文档
export type RagDocStatus = "pending" | "indexing" | "indexed" | "failed";

export interface RagDocument {
  id: string;
  filename: string;
  type: string; // md / pdf / docx / txt
  size: number;
  chunks: number;
  status: RagDocStatus;
  enabled: boolean;
  collection: string;
  error?: string | null;
  createdAt: number;
}

// 模型配置
export interface ModelConfig {
  id: string;
  name: string;
  provider: string; // openai / dashscope / ...
  model: string; // 如 gpt-4o / qwen-plus
  baseUrl?: string;
  apiKey?: string;
  temperature: number;
  maxTokens: number;
  isDefault: boolean;
}

// MCP 服务器配置（工具来源）
export type McpTransport = "stdio" | "sse" | "http";

export interface McpServerConfig {
  id: string;
  name: string;
  transport: McpTransport;
  command?: string | null; // stdio
  args?: string[]; // stdio
  url?: string | null; // sse / http
  enabled: boolean;
  autoApprove?: string[];
  createdAt?: number;
}

// 对话默认设置（全局，新会话继承）
export interface ChatDefaults {
  modelId: string;
  systemPrompt: string;
  enableMemory: boolean;
  enableRag: boolean;
}

// 聊天消息
export interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  createdAt: number;
}

// 单个 Agent 的全局配置聚合（管理员在后台左侧菜单维护）。
// 这些都是给 Agent 用的：默认记忆、知识库、模型。
export interface AgentConfigBundle {
  memories: MemoryItem[]; // Agent 默认记忆
  ragDocs: RagDocument[];
  models: ModelConfig[];
}
