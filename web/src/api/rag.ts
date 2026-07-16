import { http, getToken } from "./http";
import type { RagDocument } from "./types";

export interface RagSearchResult {
  content: string;
  source: string;
  score?: number;
  headings?: string[];
}

export async function listRagDocs(): Promise<RagDocument[]> {
  return http.get<RagDocument[]>("/api/rag/docs");
}

// 上传并索引（multipart）
export async function uploadRagDocs(files: File[]): Promise<RagDocument[]> {
  const form = new FormData();
  for (const f of files) form.append("files", f);

  const token = getToken();
  const res = await fetch("/api/rag/docs", {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: form,
  });
  const text = await res.text();
  const data = text ? JSON.parse(text) : undefined;
  if (!res.ok) {
    throw new Error((data && data.error) || `上传失败 (${res.status})`);
  }
  return data as RagDocument[];
}

export interface RagDocumentDetail extends RagDocument {
  content: string;
}

// 获取单个文档详情（含原文，供编辑）
export async function getRagDoc(id: string): Promise<RagDocumentDetail> {
  return http.get<RagDocumentDetail>(`/api/rag/docs/${id}`);
}

// 编辑：改文件名 / 启停 / 正文（改正文会自动重新索引）
export async function updateRagDoc(
  id: string,
  patch: { filename?: string; enabled?: boolean; content?: string }
): Promise<RagDocument> {
  return http.patch<RagDocument>(`/api/rag/docs/${id}`, patch);
}

// 手动重新索引
export async function reindexRagDoc(id: string): Promise<RagDocument> {
  return http.post<RagDocument>(`/api/rag/docs/${id}/reindex`);
}

export async function deleteRagDoc(id: string): Promise<void> {
  await http.delete(`/api/rag/docs/${id}`);
}

export async function searchRag(
  query: string,
  limit = 5
): Promise<RagSearchResult[]> {
  return http.post<RagSearchResult[]>("/api/rag/search", { query, limit });
}
