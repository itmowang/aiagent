import { createOpenAILLM } from "./src/llm/openai";
import { createTool } from "./src/tool";
import { createToolRegistry } from "./src/tool";
import { createConversation } from "./src/conversation";
import { createToolRuntime } from "./src/runtime";
import { createAgent } from "./src/agent";

async function main() {

    // LLM
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


    // Tool Registry
    const registry = createToolRegistry();

    registry.register(calculator);


    // Conversation
    const conversation = createConversation();


    // Runtime
    const runtime = createToolRuntime({

        registry,

        conversation

    });


    // Agent
    const agent = createAgent({

        llm,

        registry,

        runtime,

        conversation

    });


    // 运行 Agent
    const result = await agent.run(
        "计算 10 加 20"
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

}

main().catch(console.error);