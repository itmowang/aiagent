import readline from "node:readline";

import { createAgent } from "./src/agent";
import { createConversation } from "./src/conversation";
import { createOpenAILLM } from "./src/llm/openai";
import {
    createPrismaMemory,
    createMemoryExtractor
} from "./src/memory";

import { createToolRuntime } from "./src/runtime";
import {
    createTool,
    createToolRegistry
} from "./src/tool";



async function main() {


    // LLM

    const llm = createOpenAILLM();



    // ======================
    // Tool
    // ======================

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

    const conversation =
        createConversation();



    // Prisma Memory

    const memory =
        createPrismaMemory({

            userId: "user_001"

        });



    // Memory Extractor

    const extractor =
        createMemoryExtractor(llm);



    // Runtime

    const runtime =
        createToolRuntime({

            registry,

            conversation

        });



    // Agent

    const agent =
        createAgent({

            llm,

            conversation,

            runtime,

            registry,

            memory,

            extractor

        });



    console.log(`
========================
 AI Agent 已启动
 输入 exit 退出
========================
`);




    const rl =
        readline.createInterface({

            input: process.stdin,

            output: process.stdout

        });



    function ask() {


        rl.question(
            "\n用户: ",
            async(input)=>{


                if(input.trim()==="exit"){

                    rl.close();

                    return;

                }


                try {


                    const result =
                        await agent.run(input);



                    console.log(
                        "\nAI:",
                        result
                    );



                    console.log(
                        "\n当前状态:",
                        agent.status()
                    );


                }catch(error){

                    console.error(
                        error
                    );

                }



                ask();


            }
        );

    }


    ask();

}


main();