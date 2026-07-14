import { createAgent } from "./src/agent";
import { createConversation } from "./src/conversation";
import { createOpenAILLM } from "./src/llm/openai";
import { createMemory } from "./src/memory";
import { createToolRuntime } from "./src/runtime";
import { createTool, createToolRegistry } from "./src/tool";

async function main() {

    const llm = createOpenAILLM();

    // Tool
    const calculator = createTool({

        name: "calculator",

        description: "计算两个数字相加",

        parameters: {

            type: "object",

            properties: {

                a: {
                    type: "number"
                },

                b: {
                    type: "number"
                }

            },

            required: [
                "a",
                "b"
            ]

        },

        async execute(input: any) {

            return input.a + input.b;

        }

    });

    // Registry
    const registry = createToolRegistry();

    registry.register(calculator);

    // Conversation
    const conversation = createConversation();

    // Memory
    const memory = createMemory();

    memory.set(
        "name",
        "魔王"
    );

    memory.set(
        "taste",
        "喜欢吃辣"
    );

    memory.set(
        "city",
        "长沙"
    );

    // Runtime
    const runtime = createToolRuntime({

        registry,

        conversation

    });

    // Agent
    const agent = createAgent({

        llm,

        conversation,

        runtime,

        registry,

        memory

    });

    // Run
    const result = await agent.run(

        "我叫什么名字？"

    );

    console.log();
    console.log("==============");
    console.log("最终回答");
    console.log("==============");
    console.log(result);

    console.log();
    console.log("==============");
    console.log("Conversation");
    console.log("==============");
    console.log(
        JSON.stringify(
            conversation.messages(),
            null,
            2
        )
    );

    console.log();
    console.log("==============");
    console.log("Memory");
    console.log("==============");
    console.log(
        memory.all()
    );

}

main().catch(console.error);