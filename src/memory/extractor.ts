import type { LLM } from "../llm/types";

export interface ExtractedMemory {
    key: string;
    value: string;
}

export interface MemoryExtractor {
    extract(input: string): Promise<ExtractedMemory[]>;
}

const memoryextact = `
你是一个用户记忆提取器。
从用户输入中提取长期有效的信息。
只返回JSON数组。
格式:
[
 {
  "key":"name",
  "value":"xxx"
 }
]
如果没有需要保存的信息，返回:
[]
只提取:
- 名字
- 喜好
- 城市
- 长期习惯
- 偏好
不要提取:
- 临时问题
- 一次性需求
`

export function createMemoryExtractor(llm: LLM): MemoryExtractor {
    async function extract(message: string): Promise<ExtractedMemory[]> {
        const response = await llm.chat({
            messages: [
                {
                    role: "system",
                    content: memoryextact
                },
                {
                    role: "user",
                    content: message
                }
            ]
        });

        try {
            return JSON.parse(response.content);
        } catch (error) {
            return [];
        }
    }

    return {
        extract
    }
}