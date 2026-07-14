import { createOpenAILLM } from "./src/llm/openai";
import { createTool, createToolRegistry } from "./src/tool";
import { createConversation } from "./src/conversation";
import { createToolRuntime } from "./src/runtime";


async function main() {


    const llm = createOpenAILLM();


    // 创建工具
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


    conversation.addUser(
        "计算 10 加 20"
    );



    // Tool Runtime

    const runtime = createToolRuntime({

        registry,

        conversation

    });



    // 第一次 LLM

    const response =
        await llm.chat({

            messages:
                conversation.messages(),


            tools:
                registry.list()

        });



    console.log(
        "第一次LLM:",
        JSON.stringify(response, null, 2)
    );



    // 执行工具

    if (response.toolCalls) {


        for (const toolCall of response.toolCalls) {


            const result =
                await runtime.execute(

                    toolCall.name,

                    JSON.parse(
                        toolCall.arguments
                    ),
                    toolCall.id

                );


            console.log(
                "Tool结果:",
                result
            );


        }

    }



    console.log(
        "Tool之后消息:",
        conversation.messages()
    );



    // 第二次调用 LLM

    const finalResponse =
        await llm.chat({

            messages:
                conversation.messages()

        });



    console.log(
        "最终回答:",
        finalResponse.content
    );

}


main().catch(console.error);