import { read, write, uid, delay, remove } from "./db";
import { AGENT_KEY, CHAT_DEFAULTS_KEY } from "./seed";
import type {
  AgentConfigBundle,
  ChatDefaults,
  MemoryItem,
  McpServerConfig,
  ModelConfig,
  RagDocument,
  SkillConfig,
} from "./types";

// =====================================================================
// Agent 全局配置（单 Agent，所有管理员共享维护）
// =====================================================================

function loadAgent(): AgentConfigBundle {
  return read<AgentConfigBundle>(AGENT_KEY, {
    memories: [],
    skills: [],
    ragDocs: [],
    models: [],
    mcpServers: [],
  });
}

function saveAgent(bundle: AgentConfigBundle) {
  write(AGENT_KEY, bundle);
}

export async function getAgentConfig(): Promise<AgentConfigBundle> {
  return delay(loadAgent());
}

// ---------- Agent 默认记忆 ----------
export async function addAgentMemory(
  key: string,
  value: string
): Promise<void> {
  const b = loadAgent();
  const now = Date.now();
  const existing = b.memories.find((m) => m.key === key);
  if (existing) {
    existing.value = value;
    existing.updatedAt = now;
  } else {
    b.memories.push({ id: uid(), key, value, createdAt: now, updatedAt: now });
  }
  saveAgent(b);
  return delay(undefined);
}

export async function importAgentMemories(
  items: { key: string; value: string }[]
): Promise<number> {
  const b = loadAgent();
  const now = Date.now();
  let count = 0;
  for (const it of items) {
    if (!it.key) continue;
    const existing = b.memories.find((m) => m.key === it.key);
    if (existing) {
      existing.value = it.value;
      existing.updatedAt = now;
    } else {
      b.memories.push({
        id: uid(),
        key: it.key,
        value: it.value,
        createdAt: now,
        updatedAt: now,
      });
    }
    count++;
  }
  saveAgent(b);
  return delay(count);
}

export async function deleteAgentMemory(id: string): Promise<void> {
  const b = loadAgent();
  b.memories = b.memories.filter((m) => m.id !== id);
  saveAgent(b);
  return delay(undefined);
}

export async function clearAgentMemory(): Promise<void> {
  const b = loadAgent();
  b.memories = [];
  saveAgent(b);
  return delay(undefined);
}

// ---------- Skill ----------
export async function upsertSkill(
  skill: Omit<SkillConfig, "id"> & { id?: string }
): Promise<SkillConfig> {
  const b = loadAgent();
  if (skill.id) {
    const idx = b.skills.findIndex((s) => s.id === skill.id);
    if (idx >= 0) {
      b.skills[idx] = { ...b.skills[idx], ...skill } as SkillConfig;
      saveAgent(b);
      return delay(b.skills[idx]);
    }
  }
  const created: SkillConfig = { ...skill, id: uid() } as SkillConfig;
  b.skills.push(created);
  saveAgent(b);
  return delay(created);
}

export async function deleteSkill(id: string): Promise<void> {
  const b = loadAgent();
  b.skills = b.skills.filter((s) => s.id !== id);
  saveAgent(b);
  return delay(undefined);
}

// ---------- RAG ----------
export async function addRagDocs(
  docs: Omit<RagDocument, "id" | "createdAt" | "status" | "chunks">[]
): Promise<RagDocument[]> {
  const b = loadAgent();
  const created = docs.map((d) => ({
    ...d,
    id: uid(),
    chunks: 0,
    status: "pending" as const,
    createdAt: Date.now(),
  }));
  b.ragDocs.push(...created);
  saveAgent(b);
  return delay(created);
}

export async function updateRagDoc(
  id: string,
  patch: Partial<RagDocument>
): Promise<void> {
  const b = loadAgent();
  const idx = b.ragDocs.findIndex((d) => d.id === id);
  if (idx >= 0) {
    b.ragDocs[idx] = { ...b.ragDocs[idx], ...patch };
    saveAgent(b);
  }
  return delay(undefined);
}

export async function deleteRagDoc(id: string): Promise<void> {
  const b = loadAgent();
  b.ragDocs = b.ragDocs.filter((d) => d.id !== id);
  saveAgent(b);
  return delay(undefined);
}

// ---------- Model ----------
export async function upsertModel(
  model: Omit<ModelConfig, "id"> & { id?: string }
): Promise<ModelConfig> {
  const b = loadAgent();
  if (model.isDefault) {
    b.models.forEach((m) => (m.isDefault = false));
  }
  if (model.id) {
    const idx = b.models.findIndex((m) => m.id === model.id);
    if (idx >= 0) {
      b.models[idx] = { ...b.models[idx], ...model } as ModelConfig;
      saveAgent(b);
      return delay(b.models[idx]);
    }
  }
  const created: ModelConfig = { ...model, id: uid() } as ModelConfig;
  b.models.push(created);
  saveAgent(b);
  return delay(created);
}

export async function deleteModel(id: string): Promise<void> {
  const b = loadAgent();
  b.models = b.models.filter((m) => m.id !== id);
  saveAgent(b);
  return delay(undefined);
}

// ---------- MCP ----------
export async function upsertMcp(
  server: Omit<McpServerConfig, "id"> & { id?: string }
): Promise<McpServerConfig> {
  const b = loadAgent();
  if (server.id) {
    const idx = b.mcpServers.findIndex((m) => m.id === server.id);
    if (idx >= 0) {
      b.mcpServers[idx] = { ...b.mcpServers[idx], ...server } as McpServerConfig;
      saveAgent(b);
      return delay(b.mcpServers[idx]);
    }
  }
  const created: McpServerConfig = { ...server, id: uid() } as McpServerConfig;
  b.mcpServers.push(created);
  saveAgent(b);
  return delay(created);
}

export async function deleteMcp(id: string): Promise<void> {
  const b = loadAgent();
  b.mcpServers = b.mcpServers.filter((m) => m.id !== id);
  saveAgent(b);
  return delay(undefined);
}

// ---------- 对话默认设置（全局） ----------
export async function getChatDefaults(): Promise<ChatDefaults> {
  return delay(
    read<ChatDefaults>(CHAT_DEFAULTS_KEY, {
      modelId: "",
      systemPrompt: "",
      enableMemory: true,
      enableRag: true,
      enabledSkillIds: [],
      enabledMcpIds: [],
    })
  );
}

export async function saveChatDefaults(defaults: ChatDefaults): Promise<void> {
  write(CHAT_DEFAULTS_KEY, defaults);
  return delay(undefined);
}

// =====================================================================
// 用户个人记忆（每个用户只能管理/清空自己的 Memory）
// =====================================================================

function userMemKey(userId: string) {
  return `userMemory:${userId}`;
}

export async function getUserMemory(userId: string): Promise<MemoryItem[]> {
  return delay(read<MemoryItem[]>(userMemKey(userId), []));
}

export async function addUserMemory(
  userId: string,
  key: string,
  value: string
): Promise<void> {
  const list = read<MemoryItem[]>(userMemKey(userId), []);
  const now = Date.now();
  const existing = list.find((m) => m.key === key);
  if (existing) {
    existing.value = value;
    existing.updatedAt = now;
  } else {
    list.push({ id: uid(), key, value, createdAt: now, updatedAt: now });
  }
  write(userMemKey(userId), list);
  return delay(undefined);
}

export async function importUserMemories(
  userId: string,
  items: { key: string; value: string }[]
): Promise<number> {
  const list = read<MemoryItem[]>(userMemKey(userId), []);
  const now = Date.now();
  let count = 0;
  for (const it of items) {
    if (!it.key) continue;
    const existing = list.find((m) => m.key === it.key);
    if (existing) {
      existing.value = it.value;
      existing.updatedAt = now;
    } else {
      list.push({
        id: uid(),
        key: it.key,
        value: it.value,
        createdAt: now,
        updatedAt: now,
      });
    }
    count++;
  }
  write(userMemKey(userId), list);
  return delay(count);
}

export async function deleteUserMemory(
  userId: string,
  id: string
): Promise<void> {
  const list = read<MemoryItem[]>(userMemKey(userId), []).filter(
    (m) => m.id !== id
  );
  write(userMemKey(userId), list);
  return delay(undefined);
}

export async function clearUserMemory(userId: string): Promise<void> {
  remove(userMemKey(userId));
  return delay(undefined);
}
