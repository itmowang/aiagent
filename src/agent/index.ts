import type { LLM } from "../llm/types";
import type { Conversation } from "../conversation";
import type { ToolRuntime } from "../runtime";
import type { ToolRegistry } from "../tool";
import type { Memory, MemoryExtractor } from "../memory";

interface AgentOptions {
    llm: LLM;
    conversation: Conversation;
    runtime: ToolRuntime;
    registry: ToolRegistry;
    memory: Memory;
    extractor: MemoryExtractor;
}


export function createAgent(options: AgentOptions) {
    const { llm, conversation, runtime, registry, memory,extractor } = options;

    let status = "idle";


    async function run(input: string) {
        // thinking
        status = "thinking";
        // 调用memory
        // const memories = memory.all();

        // if (memories.length > 0) {
        //     const memoryText = memories.map(item => `${item.key}: ${item.value}`).join("\n");
        //     conversation.addSystem(`用户记忆${memoryText}`)
        // }
        //  保存用户信息
        conversation.addUser(input);
        // 提取新的用户记忆
        const extractedMemories = await extractor.extract(input);
        // 写入memory
        for (const item of extractedMemories) {
            await memory.set(item.key,item.value)            
        }
        // 读取已有的memory
        const storedMemories = await memory.all();

        if(storedMemories.length>0){
            const memoryText = storedMemories.map(item=>`${item.key}:${item.value}`).join("\n")
            conversation.addSystem(`用户长期记忆:\n ${memoryText}`)
        }

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