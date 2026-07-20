import { createTool } from "../tool";
import type { Tool, ToolRegistry } from "../tool";
import type { Conversation } from "../conversation";
import type { AgentEventHandler } from "../agent/types";
import type { SkillRecord } from "./types";

interface UseSkillContext {
    skills: SkillRecord[]; // 已启用的技能
    registry: ToolRegistry; // 激活时把技能工具注册进来
    conversation: Conversation; // 激活时注入技能提示词
    emit: AgentEventHandler; // 发出轨迹事件
}

// 生成 use_skill 元工具：让模型自主决定激活哪个技能
export function createUseSkillTool(ctx: UseSkillContext): Tool {
    const activated = new Set<string>();
    const byKey = new Map(ctx.skills.map((s) => [s.key, s]));

    return createTool({
        name: "use_skill",
        description:
            "激活一个技能以获得对应的行为指导和工具。当用户的需求匹配某个技能时先激活它，再继续。",
        parameters: {
            type: "object",
            properties: {
                skill: {
                    type: "string",
                    enum: ctx.skills.map((s) => s.key),
                    description:
                        "要激活的技能 key。可选：" +
                        ctx.skills.map((s) => `${s.key}(${s.description})`).join("；"),
                },
            },
            required: ["skill"],
        },
        execute: async (input: any) => {
            const key = input?.skill;
            const skill = byKey.get(key);
            if (!skill) {
                return { ok: false, error: `未知技能：${key}` };
            }
            if (activated.has(key)) {
                return { ok: true, message: `技能「${skill.name}」已激活` };
            }
            activated.add(key);

            // 1. 注入技能提示词
            ctx.conversation.addSystem(`【技能：${skill.name}】\n${skill.systemPrompt}`);

            // 2. 注册技能自带的工具
            const newTools = skill.buildTools ? skill.buildTools() : [];
            for (const t of newTools) ctx.registry.register(t);
            const toolNames = newTools.map((t) => t.name);

            // 3. 发出轨迹事件
            ctx.emit({ type: "skill_activated", name: skill.name, tools: toolNames });

            return {
                ok: true,
                message: `技能「${skill.name}」已激活`,
                availableTools: toolNames,
            };
        },
    });
}

// 生成技能菜单（作为系统提示注入，告诉模型有哪些技能可用）
export function buildSkillMenu(skills: SkillRecord[]): string {
    const lines = skills.map((s) => `- ${s.key}：${s.description}`);
    return (
        "你具备以下可激活的技能。判断用户需求匹配某技能时，先用 use_skill 激活它，再执行：\n" +
        lines.join("\n")
    );
}
