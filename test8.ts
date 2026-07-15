import assert from "node:assert/strict";
import path from "node:path";
import { createMarkdownLoader } from "./src/rag/loader";

async function main() {
    const inputPath = process.argv[2];

    if (!inputPath) {
        throw new Error(
            "请提供要测试的 Markdown 文件路径，例如：pnpm exec tsx test8.ts ./example.md"
        );
    }

    const filePath = path.resolve(inputPath);
    const loader = createMarkdownLoader();
    const document = await loader.load(filePath);

    assert.equal(document.path, filePath);
    assert.equal(document.name, path.basename(filePath));
    assert.equal(document.type, "markdown");
    assert.ok(Buffer.isBuffer(document.content), "content 应为 Buffer");

    console.log("Markdown loader 测试通过：");
    console.log({
        path: document.path,
        name: document.name,
        type: document.type,
        content: document.content.toString("utf8")
    });
}

main().catch((error: unknown) => {
    console.error("Markdown loader 测试失败：", error);
    process.exitCode = 1;
});
