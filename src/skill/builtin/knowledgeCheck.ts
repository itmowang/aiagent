import type { SkillDefinition } from "../types";

// 知识库核对技能：不带自带工具，复用已注册的 search_knowledge。
export const knowledgeCheckSkill: SkillDefinition = {
    key: "knowledge_check",
    name: "知识库核对",
    description: "核对某内容是否属于/符合知识库中的信息",
    systemPrompt:
        "你现在具备知识库核对能力。当用户想确认某个说法、内容是否属于或符合知识库时：\n" +
        "1. 用 search_knowledge 工具检索相关内容。\n" +
        "2. 对比用户提供的内容与检索结果，判断是否属于知识库、是否一致。\n" +
        "3. 给出结论（属于/不属于/部分符合），并引用检索到的原文片段作为依据。\n" +
        "4. 若知识库中没有相关内容，明确告知“知识库中未找到相关信息”，不要编造。",
    // 不提供 buildTools：它依赖已全局注册的 search_knowledge 工具
};
