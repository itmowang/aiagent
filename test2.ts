import { createOpenAILLM } from "./src/llm/openai";
import { createTool } from "./src/tool";
import { createToolRegistry } from "./src/tool";
import { createConversation } from "./src/conversation";
import { createToolRuntime } from "./src/runtime";


async function main() {


    // 1. 创建 LLM

    const llm = createOpenAILLM();



    // 2. 创建 Tool

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


        async execute(input:any) {

            return input.a + input.b;

        }

    });



    // 3. 创建 ToolRegistry

    const registry = createToolRegistry();

    registry.register(calculator);



    // 4. 创建 Conversation

    const conversation = createConversation();


    conversation.addUser(
        "计算 10 加 20"
    );



    // 5. 创建 ToolRuntime

    const runtime = createToolRuntime({

        registry,

        conversation

    });



    // 6. 第一次调用 LLM

    const response = await llm.chat({
        messages: conversation.messages(),
        tools:
            registry.list()

    });



    console.log(
        "LLM返回:",
        JSON.stringify(response,null,2)
    );



    // 7. 判断是否需要执行工具

    if(response.toolCalls){


        for(const toolCall of response.toolCalls){


            const result =
                await runtime.execute(

                    toolCall.name,

                    JSON.parse(
                        toolCall.arguments
                    )

                );


            console.log(
                "工具结果:",
                result
            );


        }

    }



    // 8. 查看当前消息

    console.log(
        "Conversation:",
        conversation.messages()
    );


}


main().catch(console.error);