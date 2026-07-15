import type { ParsedDocument } from "../parser";

export type ChunkStrategy =
    | "character"
    | "parent-child";

export interface Chunk {
    /**
     * Chunker 内部使用的稳定标识。
     * 后续写入向量库时，可将它映射为 Vector Store 所需的 id。
     */
    chunkId: string;

    /**
     * 当前 chunk 的正文内容。
     */
    content: string;

    /**
     * 在当前文档、当前层级中的序号，从 0 开始。
     */
    chunkIndex: number;

    /**
     * 当前 chunk 在清洗后正文中的字符位置。
     * start 包含，end 不包含。
     */
    start: number;
    end: number;

    /**
     * 当前 chunk 的标题路径。
     * 例如：["产品工作知识库", "工作流程概览"]。
     */
    headings: string[];

    /**
     * 父子切割时，子 chunk 指向所属父 chunk。
     * 字符切割模式中不需要该字段。
     */
    parentId?: string;

    /**
     * 原文档的 metadata，必须完整继承：
     * source、fileName、fileType、frontmatter 等。
     */
    metadata: ParsedDocument["metadata"];
}

export interface ChunkingResult {
    /**
     * 需要计算 Embedding、写入向量库的 chunk。
     *
     * - character 模式：所有字符 chunk
     * - parent-child 模式：所有 child chunk
     */
    chunks: Chunk[];

    /**
     * 仅父子切割模式使用。
     * 父 chunk 用于检索命中 child 后，读取完整上下文。
     */
    parents: Chunk[];
}

export interface DocumentChunker {
    chunk(document: ParsedDocument): ChunkingResult;
}

export interface CharacterChunkerOptions {
    /**
     * 每个 chunk 最大字符数，例如 800。
     */
    maxCharacters: number;

    /**
     * 相邻 chunk 重叠字符数，例如 120。
     */
    overlapCharacters: number;
}

export interface ParentChildChunkerOptions {
    /**
     * 父 chunk 最大字符数，例如 2_000。
     */
    parentMaxCharacters: number;

    /**
     * 子 chunk 最大字符数，例如 600。
     */
    childMaxCharacters: number;

    /**
     * 相邻子 chunk 重叠字符数，例如 100。
     */
    childOverlapCharacters: number;
}
