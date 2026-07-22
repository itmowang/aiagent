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
  const rows: any = await prisma.$queryRawUnsafe(
    "SELECT COUNT(*) AS c FROM (SELECT conversationId, createdAt FROM Message GROUP BY conversationId, createdAt HAVING COUNT(*) > 1) t"
  );
  const collisions = String(rows[0].c);
  console.log("COLLISIONS=" + collisions);
}
main().catch(e => { console.error("ERR", e); process.exitCode = 1; }).finally(() => prisma.$disconnect());
