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

const APPLY = process.argv.includes("--apply");
const ROLE_ORDER = { system: 0, user: 1, assistant: 2, tool: 3 };

async function main() {
  const conversations = await prisma.conversation.findMany({ select: { id: true } });
  let totalFixed = 0, affected = 0;
  for (const cv of conversations) {
    const msgs = await prisma.message.findMany({ where: { conversationId: cv.id } });
    msgs.sort((a, b) => {
      const dt = a.createdAt.getTime() - b.createdAt.getTime();
      if (dt !== 0) return dt;
      return (ROLE_ORDER[a.role] ?? 9) - (ROLE_ORDER[b.role] ?? 9);
    });
    let prev = -Infinity, convFixed = 0;
    for (const m of msgs) {
      const orig = m.createdAt.getTime();
      const next = orig <= prev ? prev + 1 : orig;
      if (next !== orig) {
        convFixed++;
        if (APPLY) await prisma.message.update({ where: { id: m.id }, data: { createdAt: new Date(next) } });
      }
      prev = next;
    }
    if (convFixed > 0) { affected++; totalFixed += convFixed; }
  }
  console.log("RESULT " + (APPLY ? "APPLIED" : "DRYRUN") + " scanned=" + conversations.length + " reordered=" + totalFixed + " conversations_affected=" + affected);
}

main().catch(e => { console.error("ERR", e); process.exitCode = 1; }).finally(() => prisma.$disconnect());
