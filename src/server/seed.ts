import { prisma } from "../lib/prisma";
import { hashPassword } from "./auth";
import { seedBuiltinSkills } from "../skill";

// 首次启动写入默认管理员和默认模型
export async function ensureSeed() {
    const userCount = await prisma.user.count();
    if (userCount === 0) {
        await prisma.user.create({
            data: {
                username: "admin",
                displayName: "系统管理员",
                email: "admin@aiagent.local",
                role: "admin",
                status: "active",
                passwordHash: await hashPassword("admin123"),
            },
        });
        console.log("[seed] 已创建默认管理员 admin / admin123");
    }

    const modelCount = await prisma.modelConfig.count();
    if (modelCount === 0) {
        await prisma.modelConfig.create({
            data: {
                name: "通义千问 Plus",
                provider: "dashscope",
                model: "qwen-plus",
                baseUrl: "https://dashscope.aliyuncs.com/compatible-mode/v1",
                apiKey: process.env["DASHSCOPE_API_KEY"] ?? "",
                temperature: 0.7,
                maxTokens: 2048,
                isDefault: true,
            },
        });
        console.log("[seed] 已创建默认模型 通义千问 Plus");
    }

    // 内置技能落库（便于后台开关管理）
    await seedBuiltinSkills();
}
