import "dotenv/config";
import assert from "node:assert/strict";

import { createAgent } from "./src/agent";
import { createConversation } from "./src/conversation";
import { createOpenAILLM } from "./src/llm/openai";

import {
    createToolRuntime
} from "./src/runtime";

import {
    createToolRegistry
} from "./src/tool";

import type {
    Memory,
    MemoryExtractor,
    MemoryItem
} from "./src/memory";

import {
    createQwenEmbedding
} from "./src/rag/embedding/embedding";

import {
    createQdrantVectorStore
} from "./src/rag/qdrant";

import {
    createRetriever
} from "./src/rag/retriever";

import {
    createKnowledgeTool
} from "./src/tool/ragTool";

function requireEnv(name: string): string {
    const value = process.env[name];

    if (!value) {
        throw new Error(
            `缺少环境变量 ${name}，请在 .env 中配置`
        );
    }

    return value;
}

/**
 * 测试用的内存实现：
 * 不依赖 Prisma / MySQL，避免 Agent + RAG 测试额外依赖数据库。
 */
function createTestMemory(): Memory {
    const items = new Map<string, MemoryItem>();

    return {
        set(key, value) {
            items.set(key, {
                key,
                value,
                createdAt: Date.now()
            });
        },

        async get(key) {
            return items.get(key);
        },

        async all() {
            return [...items.values()];
        },

        async clear() {
            items.clear();
        }
    };
}

/**
 * 测试重点是 Agent 调用 RAG 工具，
 * 因此不额外调用 LLM 做用户记忆抽取。
 */
function createEmptyMemoryExtractor(): MemoryExtractor {
    return {
        async extract() {
            return [];
        }
    };
}

async function main() {
    const apiKey =
        process.env.QWEN_API_KEY ??
        process.env.DASHSCOPE_API_KEY ??
        requireEnv("DASHSCOPE_API_KEY");

    const qdrantUrl =
        process.env.QDRANT_URL ??
        "http://localhost:6333";

    // 必须与 test-index-qdrant.ts 相同。
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

    // 动态获取 Embedding 维度，以连接正确的 Qdrant Collection。
    const vectorSize = (
        await embedding.embed("用于初始化向量维度的测试文本")
    ).length;

    const vectorStore = createQdrantVectorStore({
        url: qdrantUrl,
        collection,
        vectorSize
    });

    await vectorStore.init();

    const retriever = createRetriever({
        embedding,
        vectorStore
    });

    // 确认先前已经成功写入知识库。
    const preflightResults = await retriever.search(
        "产品专员的工作流程是什么？",
        3
    );

    assert.ok(
        preflightResults.length > 0,
        "Qdrant 中没有可检索知识。请先运行 test-index-qdrant.ts"
    );

    const llm = createOpenAILLM();

    const conversation = createConversation();

    conversation.addSystem(
        [
            "你是企业内部产品知识库助手。",
            "回答产品工作流程相关问题前，必须调用 search_knowledge 工具。",
            "只根据工具返回的知识回答；没有结果时明确说明。"
        ].join("\n")
    );

    const registry = createToolRegistry();

    registry.register(
        createKnowledgeTool(retriever)
    );

    const runtime = createToolRuntime({
        registry,
        conversation
    });

    const agent = createAgent({
        llm,
        conversation,
        runtime,
        registry,
        memory: createTestMemory(),
        extractor: createEmptyMemoryExtractor()
    });

    const question =
        "产品专员的工作流程是什么？请根据知识库回答。";

    console.log(`用户问题：${question}`);

    const answer = await agent.run(question);

    assert.ok(
        answer.trim().length > 0,
        "Agent 应返回非空回答"
    );

    assert.equal(
        agent.status(),
        "completed",
        "Agent 成功完成后状态应为 completed"
    );

    const usedKnowledgeTool = conversation
        .messages()
        .some(
            (message) =>
                message.role === "tool"
        );

    assert.ok(
        usedKnowledgeTool,
        "Agent 应调用 search_knowledge 工具"
    );

    console.log("Agent + RAG 测试通过：");

    console.log({
        status: agent.status(),
        usedKnowledgeTool,
        answer
    });
}

main().catch((error: unknown) => {
    console.error("Agent + RAG 测试失败：", error);
    process.exitCode = 1;
});
