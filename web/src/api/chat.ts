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

export interface SendChatResult {
  conversationId: string;
  reply: string;
  modelId: string | null;
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
