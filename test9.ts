import assert from "node:assert/strict";
import path from "node:path";
import { createMarkdownLoader } from "./src/rag/loader";
import { createMarkdownParser } from "./src/rag/parser";

async function main() {
    const inputPath = process.argv[2];

    if (!inputPath) {
        throw new Error(
            "请提供 Markdown 文件路径，例如：tsx test9.ts ./产品工作.md"
        );
    }

    const filePath = path.resolve(inputPath);

    const loader = createMarkdownLoader();
    const parser = createMarkdownParser();

    const file = await loader.load(filePath);
    const document = await parser.parse(file);

    const rawContent = file.content.toString("utf8");

    const frontMatterMatch = rawContent.match(
        /^(?:\uFEFF)?---[ \t]*\r?\n[\s\S]*?\r?\n---[ \t]*(?:\r?\n|$)/
    );

    assert.ok(
        frontMatterMatch,
        "测试文件应包含 Markdown Front Matter"
    );

    // Parser 只移除 Front Matter；后面的正文必须原样保留。
    const expectedBody = rawContent.slice(frontMatterMatch[0].length);

    assert.equal(
        document.content,
        expectedBody,
        "Parser 应只移除 Front Matter，不能修改正文"
    );

    // 基础元数据
    assert.equal(document.metadata.source, file.path);
    assert.equal(document.metadata.fileName, file.name);
    assert.equal(document.metadata.fileType, "markdown");

    // Front Matter 元数据
    assert.equal(
        document.metadata.frontmatter["doc_id"],
        "product_workflow"
    );

    assert.equal(
        document.metadata.frontmatter["title"],
        "产品工作知识库"
    );

    assert.deepEqual(
        document.metadata.frontmatter["allowed_dept_names"],
        ["产品部"]
    );

    assert.equal(
        document.metadata.frontmatter["deny_message"],
        "抱歉，该内容仅限产品部员工查阅，您暂无权限。"
    );

    assert.equal(
        document.metadata.frontmatter["last_updated"],
        "2026-07-08"
    );

    // Front Matter 不应还留在正文中
    assert.ok(
        !document.content.includes("doc_id: product_workflow"),
        "正文不应包含 Front Matter"
    );

    assert.ok(
        document.content.includes("# 产品工作知识库"),
        "正文应保留 Markdown 标题"
    );

    console.log("Markdown Loader + Parser 测试通过：");
    console.log({
        metadata: document.metadata,
        contentLength: document.content.length,
        contentPreview: document.content.slice(0, 300)
    });
}

main().catch((error: unknown) => {
    console.error("Markdown Parser 测试失败：", error);
    process.exitCode = 1;
});
