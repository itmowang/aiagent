import { createHash } from "node:crypto";
import type { Document } from "../types";
import type {
    DocumentIndexer,
    DocumentIndexerOptions
} from "./types";

function createStableUuid(input: string): string {
    const hash = createHash("sha256")
        .update(input)
        .digest("hex");

    const version = `5${hash.slice(13, 16)}`;

    const variantFirstCharacter = (
        (Number.parseInt(hash[16] ?? "0", 16) & 0x3) |
        0x8
    ).toString(16);

    const variant =
        variantFirstCharacter +
        hash.slice(17, 20);

    return [
        hash.slice(0, 8),
        hash.slice(8, 12),
        version,
        variant,
        hash.slice(20, 32)
    ].join("-");
}

export function createDocumentIndexer(
    options: DocumentIndexerOptions
): DocumentIndexer {
    const {
        chunker,
        embedding,
        vectorStore,
        createVectorId = createStableUuid
    } = options;

    return {
        async index(document) {
            const {
                parents,
                chunks
            } = chunker.chunk(document);

            if (chunks.length === 0) {
                return {
                    parentCount: parents.length,
                    childCount: 0,
                    indexedCount: 0,
                    vectorIds: []
                };
            }

            const parentMap = new Map(
                parents.map((parent) => [
                    parent.chunkId,
                    parent
                ])
            );

            const childContents = chunks.map(
                (chunk) => chunk.content
            );

            // 使用批量 Embedding，避免逐个请求。
            const vectors = await embedding.embedMany(
                childContents
            );

            if (vectors.length !== chunks.length) {
                throw new Error(
                    "Embedding 返回的向量数量与 child chunk 数量不一致"
                );
            }

            const vectorIds: string[] = [];

            const documents: Document[] = chunks.map(
                (chunk, index) => {
                    const vector = vectors[index];

                    if (!vector) {
                        throw new Error(
                            `第 ${index} 个 child chunk 缺少 Embedding 向量`
                        );
                    }

                    const parent = chunk.parentId
                        ? parentMap.get(chunk.parentId)
                        : undefined;

                    if (chunk.parentId && !parent) {
                        throw new Error(
                            `child ${chunk.chunkId} 找不到 parent ${chunk.parentId}`
                        );
                    }

                    const vectorId = createVectorId(
                        chunk.chunkId
                    );

                    vectorIds.push(vectorId);

                    return {
                        id: vectorId,
                        content: chunk.content,
                        vector,

                        metadata: {
                            // 文档级 metadata
                            ...chunk.metadata,

                            // Chunk 级 metadata
                            chunkId: chunk.chunkId,
                            chunkIndex: chunk.chunkIndex,
                            start: chunk.start,
                            end: chunk.end,
                            headings: chunk.headings,

                            // Parent-Child 关系
                            ...(chunk.parentId
                                ? {
                                    parentId: chunk.parentId
                                }
                                : {}),

                            // ParentChildChunker 才会写入。
                            // CharacterChunker 模式不会有该字段。
                            ...(parent
                                ? {
                                    parentContent: parent.content,
                                    parentHeadings: parent.headings
                                }
                                : {})
                        }
                    };
                }
            );

            // 若 Collection 不存在，自动创建。
            await vectorStore.init();

            // 批量写入 Qdrant。
            await vectorStore.add(documents);

            return {
                parentCount: parents.length,
                childCount: chunks.length,
                indexedCount: documents.length,
                vectorIds
            };
        }
    };
}
