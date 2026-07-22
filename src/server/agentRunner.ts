import { prisma } from "../lib/prisma";
import { createOpenAILLM, type OpenAILLMConfig } from "../llm/openai";
import { createConversation } from "../conversation";
import { createToolRegistry } from "../tool";
import { createToolRuntime } from "../runtime";
import { createPrismaMemory, createMemoryExtractor } from "../memory";
import { createAgent } from "../agent";
import { registerAgentTools } from "./toolsService";
import type { AgentStep, AgentEvent } from "../agent/types";
import { loadSkills, createUseSkillTool, buildSkillMenu } from "../skill";

// 根据 ModelConfig 行构造 LLM 配置
function toLLMConfig(model: {
    provider: string;
    model: string;
    baseUrl: string | null;
    apiKey: string | null;
    temperature: number;
    maxTokens: number;
}): OpenAILLMConfig {
    const apiKey =
        model.apiKey && model.apiKey.length > 0
            ? model.apiKey
            : process.env["DASHSCOPE_API_KEY"] ?? "";
    return {
        apiKey,
        baseURL:
            model.baseUrl ??
            "https://dashscope.aliyuncs.com/compatible-mode/v1",
        model: model.model,
        temperature: model.temperature,
        maxTokens: model.maxTokens,
    };
}

// 解析要使用的模型：优先指定的 modelId，其次默认模型
async function resolveModel(modelId?: string | null) {
    if (modelId) {
        const m = await prisma.modelConfig.findUnique({ where: { id: modelId } });
        if (m) return m;
    }
    const def = await prisma.modelConfig.findFirst({
        where: { isDefault: true },
    });
    if (def) return def;
    // 兜底：任意一个
    return prisma.modelConfig.findFirst();
}

export interface RunChatInput {
    userId: string;
    conversationId?: string;
    message: string;
    modelId?: string;
}

export interface RunChatResult {
    conversationId: string;
    reply: string;
    modelId: string | null;
    steps: AgentStep[];
}

export async function runChat(input: RunChatInput): Promise<RunChatResult> {
    const { userId, message } = input;

    // 记录用户发问时刻，用于持久化时保证 user 消息早于 assistant 回复
    const userMessageAt = new Date();

    // 1. 找到或创建会话
    let conversationId = input.conversationId;
    let modelId = input.modelId ?? null;

    if (conversationId) {
        const conv = await prisma.conversation.findFirst({
            where: { id: conversationId, userId },
        });
        if (!conv) throw new Error("会话不存在或无权访问");
        modelId = modelId ?? conv.modelId;
    } else {
        const created = await prisma.conversation.create({
            data: {
                userId,
                title: message.slice(0, 20) || "新对话",
                modelId,
            },
        });
        conversationId = created.id;
    }

    // 2. 解析模型 → 构造 LLM（模型切换的核心）
    const model = await resolveModel(modelId);
    if (!model) throw new Error("未配置任何模型，请先在后台添加模型");
    const llm = createOpenAILLM(toLLMConfig(model));

    // 3. 组装 agent 所需组件
    const conversation = createConversation();
    const registry = createToolRegistry();
    const runtime = createToolRuntime({ conversation, registry });
    const memory = createPrismaMemory({ userId });
    const extractor = createMemoryExtractor(llm);

    // 收集执行步骤（返回给前端展示轨迹）；emit 统一给 agent 与 use_skill 使用
    const steps: AgentStep[] = [];
    const emit = (e: AgentEvent) => steps.push({ ...e, ts: Date.now() });

    // 注册所有工具：内置知识库工具 + 启用的 MCP 服务工具
    await registerAgentTools(registry);

    // 注册技能：启用的技能生成技能菜单 + use_skill 元工具，由模型自主激活
    const enabledSkills = (await loadSkills()).filter((s) => s.enabled);
    if (enabledSkills.length > 0) {
        conversation.addSystem(buildSkillMenu(enabledSkills));
        registry.register(
            createUseSkillTool({ skills: enabledSkills, registry, conversation, emit })
        );
    }

    // 4. 预加载历史消息作为上下文
    const history = await prisma.message.findMany({
        where: { conversationId },
        orderBy: { createdAt: "asc" },
    });
    for (const m of history) {
        if (m.role === "user") conversation.addUser(m.content);
        else if (m.role === "assistant") conversation.addAssistant(m.content);
        else if (m.role === "system") conversation.addSystem(m.content);
    }

    // 注入 Agent 全局记忆（对所有用户生效），与用户个人记忆一起作为上下文
    const agentMemories = await prisma.agentMemory.findMany({
        orderBy: { createdAt: "asc" },
    });
    if (agentMemories.length > 0) {
        const text = agentMemories
            .map((m) => `${m.key}:${m.value}`)
            .join("\n");
        conversation.addSystem(`Agent 全局记忆:\n${text}`);
        emit({ type: "memory_injected", scope: "agent", count: agentMemories.length });
    }

    // 5. 运行 agent
    const agent = createAgent({
        llm,
        conversation,
        runtime,
        registry,
        memory,
        extractor,
        onEvent: emit,
    });
    const reply = await agent.run(message);

    // 6. 持久化本轮用户消息与助手回复
    // 显式设置 createdAt：user 用发问时刻，assistant 用回复完成时刻，
    // 并兜底保证 assistant 严格晚于 user，避免同一时刻导致历史消息排序颠倒。
    const assistantMessageAt = new Date(
        Math.max(Date.now(), userMessageAt.getTime() + 1)
    );
    await prisma.message.createMany({
        data: [
            {
                conversationId,
                role: "user",
                content: message,
                createdAt: userMessageAt,
            },
            {
                conversationId,
                role: "assistant",
                content: reply ?? "",
                createdAt: assistantMessageAt,
            },
        ],
    });
    await prisma.conversation.update({
        where: { id: conversationId },
        data: { updatedAt: new Date(), modelId },
    });

    return { conversationId, reply: reply ?? "", modelId: model.id, steps };
}
