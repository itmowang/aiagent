import { createOpenAILLM } from './src/llm/openai';
import { createTool } from './src/tool';
import { createToolRegistry } from "./src/tool";
import { createToolRuntime } from "./src/runtime";
import { createConversation } from "./src/conversation";


const calculator = createTool({
        name: "calculator",

        description: "计算器",

        parameters: {
            type: "object",

            properties: {
                a: {
                    type: "number"
                },

                b: {
                    type: "number"
                }
            }
        },

        async execute(input: any) {

            return input.a + input.b;

        }
    });
async function main() {
    const llm = createOpenAILLM();
    

    const result = await llm.chat({

        messages: [
            {
                role: "user",
                content: "计算 10 加 20"
            }
        ],

        tools: [
            calculator
        ]

    });


    console.log(
        JSON.stringify(result, null, 2)
    );

}
main().catch(console.error);