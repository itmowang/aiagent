// 前端 localStorage 中 Agent 本地配置的存储键。
// 用户、模型、记忆、RAG 已迁移到真实后端，这里仅保留仍走本地的
// Agent 默认记忆与对话默认设置。

export const AGENT_KEY = "agent:config";
export const CHAT_DEFAULTS_KEY = "agent:chatDefaults";
