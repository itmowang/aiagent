import { prisma } from "../lib/prisma";
import type { SkillDefinition, SkillRecord } from "./types";
import { knowledgeCheckSkill } from "./builtin/knowledgeCheck";
import { sendEmailSkill } from "./builtin/sendEmail";

// 所有内置技能定义（代码维护）
export const builtinSkills: SkillDefinition[] = [
    knowledgeCheckSkill,
    sendEmailSkill,
];

const builtinMap = new Map(builtinSkills.map((s) => [s.key, s]));

// 合并：内置技能（代码定义 + DB 的 enabled/prompt 覆盖）+ 自定义技能（纯 DB）
export async function loadSkills(): Promise<SkillRecord[]> {
    const rows = await prisma.skill.findMany({ orderBy: { createdAt: "asc" } });
    const rowByKey = new Map(rows.map((r) => [r.key, r]));

    const result: SkillRecord[] = [];

    // 内置技能：以代码定义为准，用 DB 行覆盖 enabled 和（可选）prompt
    for (const def of builtinSkills) {
        const row = rowByKey.get(def.key);
        result.push({
            key: def.key,
            name: def.name,
            description: def.description,
            systemPrompt: row?.systemPrompt || def.systemPrompt,
            builtin: true,
            enabled: row ? row.enabled : true,
            buildTools: def.buildTools,
        });
    }

    // 自定义技能：DB 中 builtin=false 的行
    for (const row of rows) {
        if (row.builtin || builtinMap.has(row.key)) continue;
        result.push({
            key: row.key,
            name: row.name,
            description: row.description,
            systemPrompt: row.systemPrompt,
            builtin: false,
            enabled: row.enabled,
            // 自定义技能不带代码工具，仅注入提示词（引用已注册的工具）
        });
    }

    return result;
}

// 首次启动时把内置技能落库，便于后台开关管理
export async function seedBuiltinSkills(): Promise<void> {
    for (const def of builtinSkills) {
        const exists = await prisma.skill.findUnique({ where: { key: def.key } });
        if (!exists) {
            await prisma.skill.create({
                data: {
                    key: def.key,
                    name: def.name,
                    description: def.description,
                    systemPrompt: def.systemPrompt,
                    builtin: true,
                    enabled: true,
                },
            });
        }
    }
}
