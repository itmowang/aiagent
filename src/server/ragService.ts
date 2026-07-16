import { prisma } from "../lib/prisma";
import { createQwenEmbedding } from "../rag/embedding/embedding";
import { createQdrantVectorStore } from "../rag/qdrant";
import { createParentChildChunker } from "../rag/chunker";
import { createDocumentIndexer } from "../rag/indexer";
import type { Embedding } from "../rag/embedding/types";
import type { VectorStore, SearchResult } from "../rag/types";
import type { ParsedDocument } from "../rag/parser";

export const RAG_COLLECTION =
    process.env["QDRANT_COLLECTION"] ?? "aiagent_knowledge";

const QDRANT_URL = process.env["QDRANT_URL"] ?? "http://localhost:6333";

function embeddingConfig() {
    const apiKey =
        process.env["QWEN_API_KEY"] ??
        process.env["DASHSCOPE_API_KEY"] ??
        "";
    return {
        apiKey,
        baseURL:
            process.env["QWEN_BASE_URL"] ??
            "https://dashscope.aliyuncs.com/compatible-mode/v1",
        model: process.env["QWEN_EMBEDDING_MODEL"] ?? "text-embedding-v4",
    };
}

// 惰性单例，避免每次请求都探测向量维度
let cached: {
    embedding: Embedding;
    vectorStore: VectorStore;
} | null = null;

async function getRag() {
    if (cached) return cached;

    const embedding = createQwenEmbedding(embeddingConfig());

    // 探测向量维度以正确初始化 Qdrant collection
    const vectorSize = (await embedding.embed("dimension probe")).length;

    const vectorStore = createQdrantVectorStore({
        url: QDRANT_URL,
        collection: RAG_COLLECTION,
        vectorSize,
    });
    await vectorStore.init();

    cached = { embedding, vectorStore };
    return cached;
}

export interface IndexTextResult {
    chunks: number;
    vectorIds: string[];
}

// 将纯文本内容索引进 Qdrant，metadata.source 记为 ragDocId 便于溯源
export async function indexText(params: {
    ragDocId: string;
    filename: string;
    type: string;
    text: string;
}): Promise<IndexTextResult> {
    const { embedding, vectorStore } = await getRag();

    const chunker = createParentChildChunker({
        parentMaxCharacters: 2000,
        childMaxCharacters: 600,
        childOverlapCharacters: 100,
    });

    const indexer = createDocumentIndexer({ chunker, embedding, vectorStore });

    const parsed: ParsedDocument = {
        content: params.text,
        metadata: {
            source: params.ragDocId,
            fileName: params.filename,
            fileType: params.type,
            frontmatter: {},
        },
    };

    const result = await indexer.index(parsed);
    return { chunks: result.indexedCount, vectorIds: result.vectorIds };
}

export async function removeVectors(ids: string[]): Promise<void> {
    if (!ids || ids.length === 0) return;
    const { vectorStore } = await getRag();
    await vectorStore.remove?.(ids);
}

export async function searchKnowledge(
    query: string,
    limit = 5
): Promise<SearchResult[]> {
    const { embedding, vectorStore } = await getRag();

    // 排除被停用的文档：按 source(=ragDocId) 过滤
    const disabled = await prisma.ragDocument.findMany({
        where: { enabled: false },
        select: { id: true },
    });
    const disabledIds = disabled.map((d) => d.id);
    const filter =
        disabledIds.length > 0
            ? { must_not: [{ key: "source", match: { any: disabledIds } }] }
            : undefined;

    const vector = await embedding.embed(query);
    return vectorStore.search(vector, limit, filter);
}
