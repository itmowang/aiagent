import "dotenv/config";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PrismaClient } from "./generated/prisma/client.js";
const adapter = new PrismaMariaDb({
  host: process.env["DATABASE_HOST"] ?? "localhost",
  user: process.env["DATABASE_USER"] ?? "root",
  password: process.env["DATABASE_PASSWORD"] ?? "root123456",
  database: process.env["DATABASE_NAME"] ?? "aiagent",
  port: Number(process.env["DATABASE_PORT"] ?? 3306),
  connectionLimit: 5,
});
const prisma = new PrismaClient({ adapter });
async function main() {
  const convs = await prisma.conversation.findMany({ select: { id: true } });
  let totalMsgs = 0, sameRole = 0, convsWithSameRole = 0;
  // 距离分布：相邻消息时间差 =1ms 的对数（疑似我上次 +1ms 拆开的“同刻簇”）
  let gap1ms = 0;
  for (const cv of convs) {
    const msgs = await prisma.message.findMany({
      where: { conversationId: cv.id },
      orderBy: { createdAt: "asc" },
      select: { role: true, createdAt: true },
    });
    totalMsgs += msgs.length;
    let localSame = 0;
    for (let i = 1; i < msgs.length; i++) {
      if (msgs[i].role === msgs[i - 1].role) { sameRole++; localSame++; }
      if (msgs[i].createdAt.getTime() - msgs[i - 1].createdAt.getTime() === 1) gap1ms++;
    }
    if (localSame > 0) convsWithSameRole++;
  }
  console.log("METRIC totalMsgs=" + totalMsgs + " adjacentSameRole=" + sameRole + " convsAffected=" + convsWithSameRole + " gap1ms=" + gap1ms);
}
main().catch(e => { console.error("ERR", e && e.message ? e.message : e); process.exitCode = 1; }).finally(() => prisma.$disconnect());
