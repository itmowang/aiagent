import type { Tool } from "../tool";

export type Message =
    | SystemMessage
    | UserMessage
    | AssistantMessage
    | ToolMessage;


export interface SystemMessage {
    role: "system";
    content: string;
}


export interface UserMessage {
    role: "user";
    content: string;
}


export interface AssistantMessage {
    role: "assistant";
    content: string;
}


export interface ToolMessage {
    role: "tool";
    content: string;
    tool_call_id: string;

}

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

