import readline from "node:readline";
import { createAgent } from "./src/agent";
import { createConversation } from "./src/conversation";
import { createOpenAILLM } from "./src/llm/openai";
import { createPrismaMemory, createMemoryExtractor } from "./src/memory";
import { createToolRuntime } from "./src/runtime";
import { createToolRegistry } from "./src/tool";
import { createKnowledgeTool } from "./src/tool/ragTool";
import { createRetriever } from "./src/rag/retriever";
import { createQdrantVectorStore } from "./src/rag/qdrant";
import { createQwenEmbedding } from "./src/rag/embedding/embedding";

async function main() {
  const llm = createOpenAILLM();

  // RAG
  const embedding = createQwenEmbedding({
    apiKey: "sk-a533d2c940f948feb39615fb2545ded7",
    baseURL: "https://dashscope.aliyuncs.com/compatible-mode/v1",
    model: "text-embedding-v4"
  });

  const vectorStore = createQdrantVectorStore({
    url: "http://localhost:6333",
    collection: "knowledge",
    vectorSize: 1024
  });

  await vectorStore.init();

  const retriever = createRetriever({ embedding, vectorStore });
  const knowledgeTool = createKnowledgeTool(retriever);

  // Tool Registry
  const registry = createToolRegistry();
  registry.register(knowledgeTool);

  // Conversation
  const conversation = createConversation();

  // Memory
  const memory = createPrismaMemory({ userId: "user_001" });
  const extractor = createMemoryExtractor(llm);

  // Runtime
  const runtime = createToolRuntime({ registry, conversation });

  // Agent
  const agent = createAgent({
    llm,
    conversation,
    runtime,
    registry,
    memory,
    extractor
  });

  console.log("========================");
  console.log(" AI Agent 已启动 (RAG Tool)");
  console.log(" 输入 exit 退出");
  console.log("========================");

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  function ask() {
    rl.question("\n用户: ", async (input) => {
      if (input.trim() === "exit") {
        rl.close();
        return;
      }
      try {
        const result = await agent.run(input);
        console.log("\nAI:", result);
        console.log("\n当前状态:", agent.status());
      } catch (error) {
        console.error(error);
      }
      ask();
    });
  }

  ask();
}

main();
