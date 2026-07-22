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
  // 取消息数最多的 3 个会话
  const grouped = await prisma.message.groupBy({
    by: ["conversationId"],
    _count: { _all: true },
    orderBy: { _count: { conversationId: "desc" } },
    take: 3,
  });
  for (const g of grouped) {
    const msgs = await prisma.message.findMany({
      where: { conversationId: g.conversationId },
      orderBy: { createdAt: "asc" },
      select: { role: true },
    });
    console.log("SEQ n=" + msgs.length + " " + msgs.map(m => m.role[0]).join(""));
  }
}
main().catch(e => { console.error("ERR", e && e.message ? e.message : e); process.exitCode = 1; }).finally(() => prisma.$disconnect());
