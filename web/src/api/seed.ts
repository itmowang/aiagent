// 首次运行时写入默认数据：一个管理员账号、Agent 全局配置、对话默认设置。
import { read, write, uid } from "./db";
import type {
  AgentConfigBundle,
  ChatDefaults,
  ModelConfig,
  User,
} from "./types";

const SEED_FLAG = "seeded:v2";

export interface StoredCredential {
  userId: string;
  username: string;
  password: string; // 演示用途明文，接入真实后端时改为哈希+服务端校验
}

export const AGENT_KEY = "agent:config";
export const CHAT_DEFAULTS_KEY = "agent:chatDefaults";

function defaultModels(): ModelConfig[] {
  return [
    {
      id: uid(),
      name: "通义千问 Plus",
      provider: "dashscope",
      model: "qwen-plus",
      baseUrl: "https://dashscope.aliyuncs.com/compatible-mode/v1",
      apiKey: "",
      temperature: 0.7,
      maxTokens: 2048,
      isDefault: true,
    },
    {
      id: uid(),
      name: "GPT-4o",
      provider: "openai",
      model: "gpt-4o",
      baseUrl: "https://api.openai.com/v1",
      apiKey: "",
      temperature: 0.7,
      maxTokens: 4096,
      isDefault: false,
    },
  ];
}

function defaultAgentConfig(models: ModelConfig[]): AgentConfigBundle {
  return {
    memories: [],
    skills: [
      {
        id: uid(),
        name: "长期记忆抽取",
        description: "从对话中自动抽取用户偏好并写入长期记忆",
        enabled: true,
      },
      {
        id: uid(),
        name: "知识库检索",
        description: "回答前检索 RAG 知识库补充上下文",
        enabled: true,
      },
    ],
    ragDocs: [],
    models,
    mcpServers: [],
  };
}

export function ensureSeed(): void {
  if (read(SEED_FLAG, false)) return;

  const now = Date.now();
  const admin: User = {
    id: uid(),
    username: "admin",
    displayName: "系统管理员",
    role: "admin",
    status: "active",
    email: "admin@aiagent.local",
    createdAt: now,
    updatedAt: now,
  };

  write("users", [admin]);
  write("credentials", [
    { userId: admin.id, username: "admin", password: "admin123" },
  ]);

  // Agent 全局配置
  const models = defaultModels();
  write(AGENT_KEY, defaultAgentConfig(models));

  const defaults: ChatDefaults = {
    modelId: models[0].id,
    systemPrompt: "你是一个乐于助人的 AI 助手，请用简洁专业的中文回答。",
    enableMemory: true,
    enableRag: true,
    enabledSkillIds: [],
    enabledMcpIds: [],
  };
  write(CHAT_DEFAULTS_KEY, defaults);

  write(SEED_FLAG, true);
}
