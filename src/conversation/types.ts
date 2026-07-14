export type MessageRole =
    | "system"
    | "user"
    | "assistant"
    | "tool";

export interface ToolCall {
    id: string;
    type: "function";
    function: {
        name: string;
        arguments: string;
    }
}

export interface Message {
    role: MessageRole;

    content: string;

    tool_call_id?: string;

    tool_calls?: ToolCall[];

}


export interface Conversation {

    addUser(content: string): void;

    addAssistant(content: string): void;

    addAssistantToolCall(
        toolCalls: unknown[]
    ): void;

    addSystem(content: string): void;

    addTool(
        content: string,
        tool_call_id: string
    ): void;

    messages(): Message[];

    clear(): void;

}