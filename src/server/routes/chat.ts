import { Hono } from "hono";
import { authMiddleware, type AppEnv } from "../middleware";
import { runChat } from "../agentRunner";

export const chatRoutes = new Hono<AppEnv>();

chatRoutes.use("*", authMiddleware);

// 发送一条消息，运行 agent（支持指定 modelId 切换模型）
chatRoutes.post("/", async (c) => {
    const userId = c.get("user").sub;
    const body = await c.req.json<{
        message: string;
        conversationId?: string;
        modelId?: string;
    }>();

    if (!body.message || !body.message.trim()) {
        return c.json({ error: "message 不能为空" }, 400);
    }

    try {
        const result = await runChat({
            userId,
            message: body.message,
            conversationId: body.conversationId,
            modelId: body.modelId,
        });
        return c.json(result);
    } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        return c.json({ error: msg }, 500);
    }
});
