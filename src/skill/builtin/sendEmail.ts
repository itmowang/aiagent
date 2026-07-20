import nodemailer from "nodemailer";
import { createTool } from "../../tool";
import type { Tool } from "../../tool";
import type { SkillDefinition } from "../types";

// 邮件发送工具：读取 .env 里的 SMTP 配置。未配置时返回清晰错误。
function createSendEmailTool(): Tool {
    return createTool({
        name: "send_email",
        description:
            "发送一封邮件到指定邮箱。当用户要求把内容/对话发送到某个邮箱时调用。",
        parameters: {
            type: "object",
            properties: {
                to: { type: "string", description: "收件人邮箱地址" },
                subject: { type: "string", description: "邮件主题" },
                body: { type: "string", description: "邮件正文（纯文本）" },
            },
            required: ["to", "subject", "body"],
        },
        execute: async (input: any) => {
            const host = process.env["SMTP_HOST"];
            const user = process.env["SMTP_USER"];
            const pass = process.env["SMTP_PASS"];
            const from = process.env["SMTP_FROM"] ?? user;

            if (!host || !user || !pass) {
                return {
                    ok: false,
                    error:
                        "邮件服务未配置，请在 .env 设置 SMTP_HOST / SMTP_USER / SMTP_PASS（可选 SMTP_PORT / SMTP_SECURE / SMTP_FROM）",
                };
            }
            if (!input?.to || !input?.subject || !input?.body) {
                return { ok: false, error: "缺少 to / subject / body" };
            }

            const transporter = nodemailer.createTransport({
                host,
                port: Number(process.env["SMTP_PORT"] ?? 465),
                secure: (process.env["SMTP_SECURE"] ?? "true") === "true",
                auth: { user, pass },
            });

            const info = await transporter.sendMail({
                from,
                to: input.to,
                subject: input.subject,
                text: input.body,
            });

            return { ok: true, messageId: info.messageId, to: input.to };
        },
    });
}

export const sendEmailSkill: SkillDefinition = {
    key: "send_email",
    name: "发送邮件",
    description: "把内容或对话总结发送到指定邮箱",
    systemPrompt:
        "你现在具备发送邮件的能力。当用户希望把对话内容、总结或任意文本发送到某个邮箱时：\n" +
        "1. 确认收件人邮箱地址；若用户没给，主动询问。\n" +
        "2. 用 send_email 工具发送，自行拟定合适的主题，正文可对对话做简洁总结。\n" +
        "3. 发送成功后告知用户已发送到哪个邮箱；失败则如实说明原因。",
    buildTools: () => [createSendEmailTool()],
};
