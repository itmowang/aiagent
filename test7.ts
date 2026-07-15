import readline from "node:readline/promises";
import { stdin, stdout } from "node:process";

import { createAgent } from "./src/agent";
import { createConversation } from "./src/conversation";
import { createOpenAILLM } from "./src/llm/openai";
import {
    createMemory,
    createMemoryExtractor,
    createPrismaMemory
} from "./src/memory";
import { createToolRuntime } from "./src/runtime";
import { createToolRegistry } from "./src/tool";

import { createQwenEmbedding } from "./src/rag/embedding/embedding";
import { createQdrantVectorStore } from "./src/rag/qdrant";
import { createRetriever } from "./src/rag/retriever";
import { createKnowledgeTool } from "./src/tool/ragTool";

async function main() {

    const llm = createOpenAILLM();

    const conversation = createConversation();

    const registry = createToolRegistry();

    const runtime = createToolRuntime({
        registry,
        conversation
    });

    // Memory
    const memory = createPrismaMemory({
        userId: "test-user"
    });

    const extractor = createMemoryExtractor(llm);

    // Embedding
    const embedding = createQwenEmbedding({
        apiKey: "sk-a533d2c940f948feb39615fb2545ded7",
        baseURL: "https://dashscope.aliyuncs.com/compatible-mode/v1",
        model: "text-embedding-v4"
    });

    // Vector Store
    const vectorStore = createQdrantVectorStore({
        url: "http://localhost:6333",
        collection: "knowledge",
        vectorSize: 1024
    });

    await vectorStore.init();

    // Retriever
    const retriever = createRetriever({
        embedding,
        vectorStore
    });

    // 注册知识库工具
    registry.register(
        createKnowledgeTool(retriever)
    );

    // Agent
    const agent = createAgent({
        llm,
        conversation,
        runtime,
        registry,
        memory,
        extractor
    });

    const rl = readline.createInterface({
        input: stdin,
        output: stdout
    });

    console.log("==================================");
    console.log("AI Agent + RAG");
    console.log("输入 exit 退出");
    console.log("==================================");

    while (true) {

        const input = await rl.question("\n你：");

        if (
            input === "exit" ||
            input === "quit"
        ) {
            break;
        }

        const answer = await agent.run(input);

        console.log("\nAI：");
        console.log(answer);
    }

    rl.close();

}

main().catch(console.error);