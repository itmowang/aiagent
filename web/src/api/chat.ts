import { http } from "./http";
import type { ChatMessage } from "./types";

export interface ConversationSummary {
  id: string;
  title: string;
  modelId: string | null;
  createdAt: number;
  updatedAt: number;
}

export interface ConversationDetail {
  id: string;
  title: string;
  modelId: string | null;
  messages: ChatMessage[];
}

// Agent 执行步骤（与后端 AgentStep 对应）
export type AgentStep =
  | { type: "memory_extracted"; items: { key: string; value: string }[]; ts: number }
  | { type: "memory_injected"; scope: "user" | "agent"; count: number; ts: number }
  | { type: "llm_request"; round: number; tools: string[]; ts: number }
  | { type: "llm_response"; round: number; hasToolCalls: boolean; content: string; ts: number }
  | { type: "tool_call"; name: string; arguments: string; ts: number }
  | { type: "tool_result"; name: string; ok: boolean; preview: string; ts: number }
  | { type: "skill_activated"; name: string; tools: string[]; ts: number }
  | { type: "final"; content: string; ts: number };

export interface SendChatResult {
  conversationId: string;
  reply: string;
  modelId: string | null;
  steps?: AgentStep[];
}

export async function listConversations(): Promise<ConversationSummary[]> {
  return http.get<ConversationSummary[]>("/api/conversations");
}

export async function getConversation(
  id: string
): Promise<ConversationDetail> {
  return http.get<ConversationDetail>(`/api/conversations/${id}`);
}

export async function deleteConversation(id: string): Promise<void> {
  await http.delete(`/api/conversations/${id}`);
}

export async function sendChat(input: {
  message: string;
  conversationId?: string;
  modelId?: string;
}): Promise<SendChatResult> {
  return http.post<SendChatResult>("/api/chat", input);
}
