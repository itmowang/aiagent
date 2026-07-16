import { connectMcp } from "./src/tool/mcp/client";

async function main() {
    const conn = await connectMcp({
        name: "everything",
        transport: "stdio",
        // Windows 上 npx 是 npx.cmd，直接 spawn "npx" 会失败，用 cmd /c 包一层
        command: "cmd",
        args: ["/c", "npx", "-y", "@modelcontextprotocol/server-everything"],
        enabled: true,
    });
    const tools = await conn.listTools();
    console.log("工具数量:", tools.length);
    console.log("工具:", tools.map((t) => t.name));
    await conn.close();
}

main().catch((e) => {
    console.error("MCP 测试失败:", e);
    process.exit(1);
});
