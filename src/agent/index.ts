import type { LLM } from "../llm/types";
import type { Conversation } from "../conversation";
import type { ToolRuntime } from "../runtime";
import type { ToolRegistry } from "../tool";
import type { Memory, MemoryExtractor } from "../memory";
import type { AgentEventHandler } from "./types";

interface AgentOptions {
    llm: LLM;
    conversation: Conversation;
    runtime: ToolRuntime;
    registry: ToolRegistry;
    memory: Memory;
    extractor: MemoryExtractor;
    // 可选：接收执行过程中的步骤事件（用于前端展示轨迹 / 日志）
    onEvent?: AgentEventHandler;
    // 最大轮次，防止工具/技能反复调用陷入死循环
    maxRounds?: number;
}


export function createAgent(options: AgentOptions) {
    const { llm, conversation, runtime, registry, memory, extractor } = options;
    const emit: AgentEventHandler = options.onEvent ?? (() => {});
    const maxRounds = options.maxRounds ?? 12;

    let status = "idle";


    async function run(input: string) {
        // thinking
        status = "thinking";
        //  保存用户信息
        conversation.addUser(input);
        // 提取新的用户记忆
        const extractedMemories = await extractor.extract(input);
        if (extractedMemories.length > 0) {
            emit({ type: "memory_extracted", items: extractedMemories });
        }
        // 写入memory
        for (const item of extractedMemories) {
            await memory.set(item.key, item.value)
        }
        // 读取已有的memory
        const storedMemories = await memory.all();

        if (storedMemories.length > 0) {
            const memoryText = storedMemories.map(item => `${item.key}:${item.value}`).join("\n")
            conversation.addSystem(`用户长期记忆:\n ${memoryText}`)
            emit({ type: "memory_injected", scope: "user", count: storedMemories.length });
        }

        // 核心开始轮询
        let round = 0;
        while (true) {
            status = "thinking";
            round += 1;

            // 超过最大轮次，强制收尾，避免死循环
            if (round > maxRounds) {
                status = "completed";
                const fallback = "（已达到最大处理轮次，提前结束）";
                conversation.addAssistant(fallback);
                emit({ type: "final", content: fallback });
                return fallback;
            }
            const tools = registry.list();
            emit({ type: "llm_request", round, tools: tools.map((t) => t.name) });

            const response = await llm.chat({
                messages: conversation.messages(),
                tools
            });

            console.log(`LLM ${JSON.stringify(response, null, 2)}`);

            emit({
                type: "llm_response",
                round,
                hasToolCalls: !!(response.toolCalls && response.toolCalls.length > 0),
                content: response.content ?? "",
            });

            // 没有工具调用，就调用完成
            if (!response.toolCalls || response.toolCalls.length === 0) {
                status = "completed";
                conversation.addAssistant(response.content)
                emit({ type: "final", content: response.content ?? "" });
                return response.content;
            }
            status = "tool_calling";

            //继续的操作
            conversation.addAssistantToolCalls(response.toolCalls.map(toolCall => ({
                id: toolCall.id,
                type: "function",
                function: {
                    name: toolCall.name,
                    arguments: toolCall.arguments
                }
            })))

            status = "observing";

            // 执行工具
            for (const toolCall of response.toolCalls) {
                emit({ type: "tool_call", name: toolCall.name, arguments: toolCall.arguments });

                let args: unknown = {};
                try {
                    args = toolCall.arguments ? JSON.parse(toolCall.arguments) : {};
                } catch {
                    args = {};
                }

                const result = await runtime.execute(toolCall.name, args, toolCall.id)
                console.log("tool结果", result);

                const ok = (result as any)?.success !== false;
                const raw = ok ? (result as any)?.data : (result as any)?.error;
                let preview = typeof raw === "string" ? raw : JSON.stringify(raw ?? "");
                if (preview && preview.length > 300) preview = preview.slice(0, 300) + "…";
                emit({ type: "tool_result", name: toolCall.name, ok, preview: preview ?? "" });
            }


        }

    }

    return {
        run,
        status() {
            return status;
        }
    }
}
