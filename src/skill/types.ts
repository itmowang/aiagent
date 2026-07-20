import type { Tool } from "../tool";

// 内置技能定义（写在代码里）
export interface SkillDefinition {
    key: string;
    name: string;
    description: string;
    systemPrompt: string;
    // 激活时额外注册的工具（技能自带的能力，如发邮件）
    buildTools?: () => Tool[];
}

// 合并 DB 覆盖后的技能记录（内置 + 自定义统一形态）
export interface SkillRecord {
    key: string;
    name: string;
    description: string;
    systemPrompt: string;
    builtin: boolean;
    enabled: boolean;
    buildTools?: () => Tool[];
}
