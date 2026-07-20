export type AgentStatus = | "idle" | "thinking" | "tool_calling" | "observing" | "completed" | "error";

// Agent 执行过程中发出的步骤事件，用于前端展示"执行轨迹"
export type AgentEvent =
    | { type: "memory_extracted"; items: { key: string; value: string }[] }
    | { type: "memory_injected"; scope: "user" | "agent"; count: number }
    | { type: "llm_request"; round: number; tools: string[] }
    | { type: "llm_response"; round: number; hasToolCalls: boolean; content: string }
    | { type: "tool_call"; name: string; arguments: string }
    | { type: "tool_result"; name: string; ok: boolean; preview: string }
    | { type: "skill_activated"; name: string; tools: string[] }
    | { type: "final"; content: string };

export type AgentEventHandler = (event: AgentEvent) => void;

// 带时间戳的步骤（返回给前端）
export type AgentStep = AgentEvent & { ts: number };
