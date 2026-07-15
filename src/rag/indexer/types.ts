import type { DocumentChunker } from "../chunker";
import type { Embedding } from "../embedding/embedding";
import type { ParsedDocument } from "../parser";
import type { VectorStore } from "../types";

export type VectorIdFactory = (
    chunkId: string
) => string;

export interface DocumentIndexerOptions {
    /**
     * CharacterChunker 或 ParentChildChunker。
     */
    chunker: DocumentChunker;

    /**
     * OpenAI、Qwen 等 Embedding 实现。
     */
    embedding: Embedding;

    /**
     * Qdrant 等向量库实现。
     */
    vectorStore: VectorStore;

    /**
     * 将内部 chunkId 转换为向量库 Point ID。
     *
     * Qdrant 的 ID 应使用 UUID 或无符号整数。
     * 未提供时，Indexer 后续会生成稳定 UUID。
     */
    createVectorId?: VectorIdFactory;
}

export interface IndexingResult {
    /**
     * Parent chunk 数量。
     * Character Chunker 模式中为 0。
     */
    parentCount: number;

    /**
     * Child chunk 数量。
     * 这些 chunk 会被计算 Embedding。
     */
    childCount: number;

    /**
     * 实际成功写入 Vector Store 的向量数量。
     */
    indexedCount: number;

    /**
     * 实际写入 Qdrant 的 Point ID 列表。
     */
    vectorIds: string[];
}

export interface DocumentIndexer {
    /**
     * 输入已经经过 Parser 和 Cleaner 的完整文档，
     * 对 child chunks 做 Embedding 并写入 Vector Store。
     */
    index(
        document: ParsedDocument
    ): Promise<IndexingResult>;
}
