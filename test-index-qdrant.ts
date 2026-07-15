import "dotenv/config";
import assert from "node:assert/strict";
import path from "node:path";

import { createMarkdownLoader } from "./src/rag/loader";
import { createMarkdownParser } from "./src/rag/parser";
import { createMarkdownCleaner } from "./src/rag/cleaner";
import { createParentChildChunker } from "./src/rag/chunker";
import { createDocumentIndexer } from "./src/rag/indexer";

import {
    createQwenEmbedding
} from "./src/rag/embedding/embedding";

import {
    createQdrantVectorStore
} from "./src/rag/qdrant";

import {
    createRetriever
} from "./src/rag/retriever";

function requireEnv(name: string): string {
    const value = process.env[name];

    if (!value) {
        throw new Error(
            `缺少环境变量 ${name}，请在 .env 中配置`
        );
    }

    return value;
}

async function main() {
    const inputPath = process.argv[2] ?? "./产品工作.md";

    const filePath = path.resolve(inputPath);

    const apiKey =
        process.env.QWEN_API_KEY ??
        process.env.DASHSCOPE_API_KEY ??
        requireEnv("DASHSCOPE_API_KEY");

    const qdrantUrl =
        process.env.QDRANT_URL ??
        "http://localhost:6333";

    // 使用测试 Collection，避免影响已有 knowledge Collection。
    const collection =
        process.env.QDRANT_COLLECTION ??
        "product_workflow_test";

    const embedding = createQwenEmbedding({
        apiKey,
        baseURL:
            process.env.QWEN_BASE_URL ??
            "https://dashscope.aliyuncs.com/compatible-mode/v1",
        model:
            process.env.QWEN_EMBEDDING_MODEL ??
            "text-embedding-v4"
    });

    console.log("读取、解析并清洗 Markdown...");

    const loader = createMarkdownLoader();
    const parser = createMarkdownParser();
    const cleaner = createMarkdownCleaner();

    const file = await loader.load(filePath);
    const parsedDocument = await parser.parse(file);
    const cleanedDocument = cleaner.clean(parsedDocument);

    const chunker = createParentChildChunker({
        parentMaxCharacters: 2000,
        childMaxCharacters: 600,
        childOverlapCharacters: 100
    });

    // 动态获取模型向量维度，确保 Qdrant Collection 配置正确。
    console.log("获取 Embedding 向量维度...");

    const vectorSize = (
        await embedding.embed("用于初始化向量维度的测试文本")
    ).length;

    const vectorStore = createQdrantVectorStore({
        url: qdrantUrl,
        collection,
        vectorSize
    });

    const indexer = createDocumentIndexer({
        chunker,
        embedding,
        vectorStore
    });

    console.log("开始生成 Embedding 并写入 Qdrant...");

    const indexingResult = await indexer.index(
        cleanedDocument
    );

    assert.ok(
        indexingResult.childCount > 0,
        "文档应至少生成一个 child chunk"
    );

    assert.equal(
        indexingResult.indexedCount,
        indexingResult.childCount,
        "写入 Qdrant 的数量应等于 child chunk 数量"
    );

    assert.equal(
        indexingResult.vectorIds.length,
        indexingResult.indexedCount,
        "每个写入向量都应有一个 Vector ID"
    );

    for (const vectorId of indexingResult.vectorIds) {
        assert.match(
            vectorId,
            /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
            "Indexer 应生成 Qdrant 可用的稳定 UUID"
        );
    }

    // 额外验证：写入后可立即检索。
    const retriever = createRetriever({
        embedding,
        vectorStore
    });

    const searchResults = await retriever.search(
        "产品专员的工作流程是什么？",
        5
    );

    assert.ok(
        searchResults.length > 0,
        "Qdrant 写入后应能检索到结果"
    );

    const documentResult = searchResults.find(
        (item) =>
            item.metadata?.source ===
            cleanedDocument.metadata.source
    );

    assert.ok(
        documentResult,
        "检索结果中应包含刚刚写入的产品工作文档"
    );

    assert.ok(
        documentResult.metadata?.parentId,
        "Parent-Child 模式的 child 应保存 parentId"
    );

    assert.ok(
        documentResult.metadata?.parentContent,
        "Parent-Child 模式的 child 应保存 parentContent"
    );

    console.log("Qdrant 入库与检索测试通过：");

    console.log({
        collection,
        vectorSize,
        parentCount: indexingResult.parentCount,
        childCount: indexingResult.childCount,
        indexedCount: indexingResult.indexedCount,
        topResult: {
            id: documentResult.id,
            contentPreview:
                documentResult.content.slice(0, 150),
            headings:
                documentResult.metadata?.headings,
            parentId:
                documentResult.metadata?.parentId
        }
    });
}

main().catch((error: unknown) => {
    console.error("Qdrant 入库测试失败：", error);
    process.exitCode = 1;
});
