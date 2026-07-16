import type { Tool } from "../tool";
import type { Message } from "../conversation";

export type { Message };

export interface ChatRequest {
    messages: Message[];
    tools?: Tool[];
}

export interface ToolCall {
    id: string;
    name: string;
    arguments: string;
}

export interface ChatResponse {
    content: string;
    toolCalls?: ToolCall[];
}

export interface LLM {
    chat(
        request: ChatRequest
    ): Promise<ChatResponse>
}

