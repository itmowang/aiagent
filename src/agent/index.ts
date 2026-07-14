import type { LLM } from "../llm/types";
import type { Conversation } from "../conversation";
import type { ToolRuntime } from "../runtime";
import type { ToolRegistry } from "../tool";
import type { Memory } from "../memory";

interface AgentOptions {
    llm: LLM;
    conversation: Conversation;
    runtime: ToolRuntime;
    registry: ToolRegistry;
    memory: Memory;
}


export function createAgent(options: AgentOptions) {
    const { llm, conversation, runtime, registry, memory } = options;

    let status = "idle";


    async function run(input: string) { 
        // thinking
        status = "thinking";
         // 调用memory
        const memories = memory.all();

        if(memories.length>0){
            const memoryText = memories .map(item => `${item.key}: ${item.value}`).join("\n");
            conversation.addSystem(`用户记忆${memoryText}`)
        }
        //  用户发起
        conversation.addUser(input);

        // 核心开始轮询
        while (true) {
            status = "thinking";
            const response = await llm.chat({
                messages: conversation.messages(),
                tools: registry.list()
            });

            console.log(`LLM ${JSON.stringify(response, null, 2)}`);

            // 没有工具调用，就调用完成
            if (!response.toolCalls || response.toolCalls.length === 0) {
                status = "completed";
                conversation.addAssistant(response.content)
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
                const result = await runtime.execute(toolCall.name, JSON.parse(toolCall.arguments), toolCall.id)
                console.log("tool结果", result);
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