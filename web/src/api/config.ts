import { read, write, uid, delay } from "./db";
import { AGENT_KEY, CHAT_DEFAULTS_KEY } from "./seed";
import { http, getCurrentUserId } from "./http";
import type {
  AgentConfigBundle,
  ChatDefaults,
  MemoryItem,
  ModelConfig,
  RagDocument,
} from "./types";

// =====================================================================
// Agent 本地配置（Agent 默认记忆仍走 localStorage，尚未提供后端；
// 模型、RAG 走真实后端）
// =====================================================================

type LocalBundle = Omit<AgentConfigBundle, "models">;

function loadLocal(): LocalBundle {
  return read<LocalBundle>(AGENT_KEY, {
    memories: [],
    ragDocs: [],
  });
}

function saveLocal(bundle: LocalBundle) {
  write(AGENT_KEY, bundle);
}

export async function getAgentConfig(): Promise<AgentConfigBundle> {
  const local = loadLocal();
  const [models, memories] = await Promise.all([
    http.get<ModelConfig[]>("/api/models"),
    http.get<MemoryItem[]>("/api/agent-memory"),
  ]);
  return { ...local, memories, models };
}

// ---------- Agent 全局记忆（真实后端，对所有用户/对话生效） ----------
export async function addAgentMemory(
  key: string,
  value: string
): Promise<void> {
  await http.post("/api/agent-memory", { key, value });
}

export async function importAgentMemories(
  items: { key: string; value: string }[]
): Promise<number> {
  const res = await http.post<{ count: number }>(
    "/api/agent-memory/import",
    items
  );
  return res.count;
}

export async function deleteAgentMemory(id: string): Promise<void> {
  await http.delete(`/api/agent-memory/${id}`);
}

export async function clearAgentMemory(): Promise<void> {
  await http.delete("/api/agent-memory");
}

// ---------- RAG（本地） ----------
export async function addRagDocs(
  docs: Omit<RagDocument, "id" | "createdAt" | "status" | "chunks">[]
): Promise<RagDocument[]> {
  const b = loadLocal();
  const created = docs.map((d) => ({
    ...d,
    id: uid(),
    chunks: 0,
    status: "pending" as const,
    createdAt: Date.now(),
  }));
  b.ragDocs.push(...created);
  saveLocal(b);
  return delay(created);
}

export async function updateRagDoc(
  id: string,
  patch: Partial<RagDocument>
): Promise<void> {
  const b = loadLocal();
  const idx = b.ragDocs.findIndex((d) => d.id === id);
  if (idx >= 0) {
    b.ragDocs[idx] = { ...b.ragDocs[idx], ...patch };
    saveLocal(b);
  }
  return delay(undefined);
}

export async function deleteRagDoc(id: string): Promise<void> {
  const b = loadLocal();
  b.ragDocs = b.ragDocs.filter((d) => d.id !== id);
  saveLocal(b);
  return delay(undefined);
}

// ---------- Model（真实后端） ----------
export async function upsertModel(
  model: Omit<ModelConfig, "id"> & { id?: string }
): Promise<ModelConfig> {
  return http.post<ModelConfig>("/api/models", model);
}

export async function deleteModel(id: string): Promise<void> {
  await http.delete(`/api/models/${id}`);
}

// ---------- 对话默认设置（本地） ----------
export async function getChatDefaults(): Promise<ChatDefaults> {
  return delay(
    read<ChatDefaults>(CHAT_DEFAULTS_KEY, {
      modelId: "",
      systemPrompt: "",
      enableMemory: true,
      enableRag: true,
    })
  );
}

export async function saveChatDefaults(defaults: ChatDefaults): Promise<void> {
  write(CHAT_DEFAULTS_KEY, defaults);
  return delay(undefined);
}

// =====================================================================
// 用户记忆（真实后端）
// 管理自己的记忆走 /api/me/memories；管理他人（管理员）走 /api/users/:id/memories
// =====================================================================

function memBase(userId: string): string {
  return userId === getCurrentUserId()
    ? "/api/me/memories"
    : `/api/users/${userId}/memories`;
}

export async function getUserMemory(userId: string): Promise<MemoryItem[]> {
  return http.get<MemoryItem[]>(memBase(userId));
}

export async function addUserMemory(
  userId: string,
  key: string,
  value: string
): Promise<void> {
  await http.post(memBase(userId), { key, value });
}

export async function importUserMemories(
  userId: string,
  items: { key: string; value: string }[]
): Promise<number> {
  const res = await http.post<{ count: number }>(
    `${memBase(userId)}/import`,
    items
  );
  return res.count;
}

export async function deleteUserMemory(
  userId: string,
  id: string
): Promise<void> {
  await http.delete(`${memBase(userId)}/${id}`);
}

export async function clearUserMemory(userId: string): Promise<void> {
  await http.delete(memBase(userId));
}
