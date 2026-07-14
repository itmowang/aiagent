import type { Embedding } from "./embedding/embedding";
import type { VectorStore } from "./types";

interface RetrieverOptions {
    embedding: Embedding;
    vectorStore: VectorStore;
}

export function createRetriever(options: RetrieverOptions) {
    const { embedding, vectorStore } = options
    async function search(query: string, limit: number = 5) {
        // 1. 问题转向量
        const vector = await embedding.embed(query);
        // 2. 向量搜索
        return vectorStore.search(vector, limit)
    }

    return {
        search
    }
}


export type Retriever = ReturnType<typeof createRetriever>;