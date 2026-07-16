import OpenAI from "openai";
import type {
    LLM,
    ChatRequest,
    ChatResponse
} from './types'

export interface OpenAILLMConfig {
    apiKey: string;
    baseURL: string;
    model: string;
    temperature?: number;
    maxTokens?: number;
}

export function createOpenAILLM(config: OpenAILLMConfig): LLM {
    const client = new OpenAI({
        apiKey: config.apiKey,
        baseURL: config.baseURL,
    });

    return {
        async chat(request: ChatRequest): Promise<ChatResponse> {
            const res = await client.chat.completions.create({
                model: config.model,
                temperature: config.temperature,
                max_tokens: config.maxTokens,
                messages: request.messages as any,
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

            const toolCalls = message.tool_calls?.map((call: any) => ({
                id: call.id,
                name: call.function.name,
                arguments: call.function.arguments,
            }))

            return {
                content: message.content ?? "",
                toolCalls
            }
        }
    }
}
