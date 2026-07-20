import { http } from "./http";

export interface SkillItem {
  key: string;
  name: string;
  description: string;
  systemPrompt: string;
  builtin: boolean;
  enabled: boolean;
  hasOwnTools: boolean;
}

export async function listSkills(): Promise<SkillItem[]> {
  return http.get<SkillItem[]>("/api/skills");
}

export async function createSkill(input: {
  name: string;
  description: string;
  systemPrompt: string;
}): Promise<SkillItem> {
  return http.post<SkillItem>("/api/skills", input);
}

export async function updateSkill(
  key: string,
  patch: {
    enabled?: boolean;
    name?: string;
    description?: string;
    systemPrompt?: string;
  }
): Promise<SkillItem> {
  return http.patch<SkillItem>(`/api/skills/${encodeURIComponent(key)}`, patch);
}

export async function deleteSkill(key: string): Promise<void> {
  await http.delete(`/api/skills/${encodeURIComponent(key)}`);
}
