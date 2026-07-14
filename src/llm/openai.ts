import OpenAI from "openai";
import type {
    LLM,
    ChatRequest,
    ChatResponse
} from './types'

const client = new OpenAI({
    apiKey: "sk-sp-D.LHXXM.Iq8A.MEQCIHMYjs3J/xRZgNGrYjoJYRCrQrfvSKe+TWav+gx5mPGOAiAtC/96ozGi+2+L8crqpSz8SzrmOWea/4eSCy6odP7lhg==",
    baseURL: "https://token-plan.cn-beijing.maas.aliyuncs.com/compatible-mode/v1",
});

export function createOpenAILLM(): LLM {
    return {
        async chat(request: ChatRequest): Promise<ChatResponse> {
            const res = await client.chat.completions.create({
                model: "qwen3.7-plus", // 必须指定 model（根据你可用的模型修改）
                messages: request.messages,
                tools: request.tools?.map(tool => ({
                    type: "function",
                    function: {
                        name: tool.name,
                        description: tool.description,
                        parameters: tool.parameters
                    }
                }))
            });

            const message = res.choices[0].message;

            const toolCalls = message.tool_calls?.map(call=>({
                id:call.id,
                name:call.function.name,
                arguments:call.function.arguments,
            }))

            return {
                content: message.content ?? "",
                toolCalls
            }
        }
    }
}



// test
// async function run() {
//     try {
//         const res = await client.chat.completions.create({
//             model: "qwen3.7-plus", // 必须指定 model（根据你可用的模型修改）
//             messages: [],
//             // 可选：max_tokens, temperature 等
//         });

//         // 注意返回结构，常见是 res.choices[0].message 或类似字段
//         console.log(res.choices[0].message);
//     } catch (err) {
//         console.error("调用失败：", err);
//     }
// }

//.test
// console.log(run());
