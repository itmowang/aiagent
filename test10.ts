import assert from "node:assert/strict";
import path from "node:path";
import { createMarkdownLoader } from "./src/rag/loader";
import { createMarkdownParser } from "./src/rag/parser";
import { createMarkdownCleaner } from "./src/rag/cleaner";

async function main() {
    const inputPath = process.argv[2];

    if (!inputPath) {
        throw new Error(
            "请提供 Markdown 文件路径，例如：tsx test10.ts ./产品工作.md"
        );
    }

    const filePath = path.resolve(inputPath);

    const loader = createMarkdownLoader();
    const parser = createMarkdownParser();
    const cleaner = createMarkdownCleaner();

    // 1. Loader → Parser → Cleaner
    const file = await loader.load(filePath);
    const parsedDocument = await parser.parse(file);
    const cleanedDocument = cleaner.clean(parsedDocument);

    // 2. Parser 应正确提取 Front Matter
    const rawContent = file.content.toString("utf8");

    const frontMatterMatch = rawContent.match(
        /^(?:\uFEFF)?---[ \t]*\r?\n[\s\S]*?\r?\n---[ \t]*(?:\r?\n|$)/
    );

    assert.ok(
        frontMatterMatch,
        "测试文件应包含 Markdown Front Matter"
    );

    assert.equal(
        parsedDocument.content,
        rawContent.slice(frontMatterMatch[0].length),
        "Parser 应只移除 Front Matter，正文不应被修改"
    );

    assert.ok(
        Object.keys(parsedDocument.metadata.frontmatter).length > 0,
        "Front Matter 应被解析为 metadata"
    );

    assert.ok(
        !parsedDocument.content.includes("doc_id:"),
        "Parser 输出正文不应包含 Front Matter"
    );

    // 3. Cleaner 不应改动 metadata
    assert.deepEqual(
        cleanedDocument.metadata,
        parsedDocument.metadata,
        "Cleaner 不应修改 metadata"
    );

    // 4. Cleaner 应统一换行符
    assert.ok(
        !cleanedDocument.content.includes("\r"),
        "Cleaner 应将换行符统一为 \\n"
    );

    assert.ok(
        cleanedDocument.content.includes("# 产品工作知识库"),
        "Cleaner 不应删除 Markdown 正文标题"
    );

    // 5. 用内存样例验证 Cleaner 的具体清洗规则
    const cleanerTestInput = {
        content: [
            "第一段内容",
            " \t",
            "",
            "",
            "第二段内容  ",
            "```ts",
            "const value = 1;  ",
            "",
            "",
            "",
            "```",
            ""
        ].join("\r\n"),

        metadata: parsedDocument.metadata
    };

    const cleanerTestOutput = cleaner.clean(cleanerTestInput);

    const expectedCleanedContent = [
        "第一段内容",
        "",
        "",
        "第二段内容  ",
        "```ts",
        "const value = 1;  ",
        "",
        "",
        "",
        "```",
        ""
    ].join("\n");

    assert.equal(
        cleanerTestOutput.content,
        expectedCleanedContent,
        "Cleaner 应压缩普通区域空行，但保留代码块内容"
    );

    assert.deepEqual(
        cleanerTestOutput.metadata,
        cleanerTestInput.metadata,
        "Cleaner 测试样例不应修改 metadata"
    );

    console.log("Markdown Loader + Parser + Cleaner 测试通过：");

    console.log({
        metadata: cleanedDocument.metadata,
        parsedContentLength: parsedDocument.content.length,
        cleanedContentLength: cleanedDocument.content.length,
        removedCharacters:
            parsedDocument.content.length - cleanedDocument.content.length,
        contentPreview: cleanedDocument.content.slice(0, 300)
    });
}

main().catch((error: unknown) => {
    console.error("Markdown Cleaner 测试失败：", error);
    process.exitCode = 1;
});
