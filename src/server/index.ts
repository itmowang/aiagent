import "dotenv/config";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { serve } from "@hono/node-server";
import type { AppEnv } from "./middleware";
import { ensureSeed } from "./seed";
import { authRoutes } from "./routes/auth";
import { userRoutes } from "./routes/users";
import { modelRoutes } from "./routes/models";
import { meRoutes } from "./routes/me";
import { conversationRoutes } from "./routes/conversations";
import { chatRoutes } from "./routes/chat";
import { ragRoutes } from "./routes/rag";
import { agentMemoryRoutes } from "./routes/agentMemory";
import { mcpRoutes } from "./routes/mcp";
import { toolRoutes } from "./routes/tools";
import { skillRoutes } from "./routes/skill";

const app = new Hono<AppEnv>();

app.use("*", cors());

// 全局错误处理：把真实错误打到服务端日志，返回可读信息
app.onError((err, c) => {
    console.error("[server error]", err);
    return c.json({ error: err instanceof Error ? err.message : String(err) }, 500);
});

app.get("/api/health", (c) => c.json({ ok: true }));

app.route("/api/auth", authRoutes);
app.route("/api/users", userRoutes);
app.route("/api/models", modelRoutes);
app.route("/api/me", meRoutes);
app.route("/api/conversations", conversationRoutes);
app.route("/api/chat", chatRoutes);
app.route("/api/rag", ragRoutes);
app.route("/api/agent-memory", agentMemoryRoutes);
app.route("/api/mcp", mcpRoutes);
app.route("/api/tools", toolRoutes);
app.route("/api/skills", skillRoutes);

const port = Number(process.env["PORT"] ?? 8787);

async function main() {
    await ensureSeed();
    serve({ fetch: app.fetch, hostname: "0.0.0.0", port }, (info) => {
        console.log(`API server listening on http://0.0.0.0:${info.port}`);
    });
}

main();
