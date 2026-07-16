import OpenAI from "openai";
import type { Embedding } from "./types";


interface QwenEmbeddingOptions {
    apiKey: string;
    baseURL: string;
    model: string;
    // 单次请求最大文本数，通义 text-embedding 限制为 10
    batchSize?: number;
}



export function createQwenEmbedding(
    options: QwenEmbeddingOptions
): Embedding {
    const client = new OpenAI({ apiKey: options.apiKey, baseURL: options.baseURL });
    const batchSize = options.batchSize ?? 10;

    return {
        async embed(text: string) {
            const response = await client.embeddings.create({
                model: options.model,
                input: text
            });
            return response.data[0].embedding;
        },

        async embedMany(texts: string[]) {
            const vectors: number[][] = [];
            // 按 batchSize 分批请求，规避通义"一次最多 10 条"的限制
            for (let i = 0; i < texts.length; i += batchSize) {
                const batch = texts.slice(i, i + batchSize);
                const response = await client.embeddings.create({
                    model: options.model,
                    input: batch
                });
                // 按 index 排序，确保顺序与输入一致
                const sorted = [...response.data].sort((a, b) => a.index - b.index);
                for (const item of sorted) {
                    vectors.push(item.embedding);
                }
            }
            return vectors;
        }
    };
}