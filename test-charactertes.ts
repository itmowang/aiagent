import assert from "node:assert/strict";
import path from "node:path";
import { createMarkdownLoader } from "./src/rag/loader";
import { createMarkdownParser } from "./src/rag/parser";
import { createMarkdownCleaner } from "./src/rag/cleaner";
import { createCharacterChunker } from "./src/rag/chunker";

async function main() {
    const inputPath = process.argv[2];

    if (!inputPath) {
        throw new Error(
            "请提供 Markdown 文件路径，例如：tsx test-charactertes.ts ./产品工作.md"
        );
    }

    const filePath = path.resolve(inputPath);

    const maxCharacters = 800;
    const overlapCharacters = 120;

    const loader = createMarkdownLoader();
    const parser = createMarkdownParser();
    const cleaner = createMarkdownCleaner();

    const chunker = createCharacterChunker({
        maxCharacters,
        overlapCharacters
    });

    // Loader → Parser → Cleaner → CharacterChunker
    const file = await loader.load(filePath);
    const parsedDocument = await parser.parse(file);
    const cleanedDocument = cleaner.clean(parsedDocument);

    const result = chunker.chunk(cleanedDocument);

    const {
        chunks,
        parents
    } = result;

    // 字符切割模式不产生 parent chunks
    assert.equal(
        parents.length,
        0,
        "Character Chunker 不应生成 parent chunks"
    );

    assert.ok(
        chunks.length > 0,
        "非空文档应至少生成一个 chunk"
    );

    for (const [index, chunk] of chunks.entries()) {
        // 每个 chunk 不得超过最大字符数
        assert.ok(
            chunk.content.length <= maxCharacters,
            `第 ${index} 个 chunk 超过 maxCharacters`
        );

        // Chunk 的内容必须等于原文指定范围
        assert.equal(
            chunk.content,
            cleanedDocument.content.slice(
                chunk.start,
                chunk.end
            ),
            `第 ${index} 个 chunk 的 content 与 start/end 不一致`
        );

        // end - start 应等于当前 chunk 内容长度
        assert.equal(
            chunk.end - chunk.start,
            chunk.content.length,
            `第 ${index} 个 chunk 的字符范围不正确`
        );

        // chunkIndex 应与实际数组顺序一致
        assert.equal(
            chunk.chunkIndex,
            index,
            `第 ${index} 个 chunk 的 chunkIndex 不正确`
        );

        // 字符切割模式没有 Markdown 标题路径
        assert.deepEqual(
            chunk.headings,
            [],
            `第 ${index} 个字符 chunk 的 headings 应为空数组`
        );

        // 字符切割模式没有父 chunk
        assert.equal(
            chunk.parentId,
            undefined,
            `第 ${index} 个字符 chunk 不应有 parentId`
        );

        // metadata 必须完整继承
        assert.deepEqual(
            chunk.metadata,
            cleanedDocument.metadata,
            `第 ${index} 个 chunk 的 metadata 未正确继承`
        );

        // 内部 chunkId 格式验证
        assert.equal(
            chunk.chunkId,
            `${cleanedDocument.metadata.source}:character:${index}`,
            `第 ${index} 个 chunkId 不正确`
        );
    }

    // 验证相邻 Chunk 的 overlap
    for (let index = 1; index < chunks.length; index += 1) {
        const previousChunk = chunks[index - 1];
        const currentChunk = chunks[index];

        assert.ok(previousChunk);
        assert.ok(currentChunk);

        const expectedStart =
            previousChunk.start +
            maxCharacters -
            overlapCharacters;

        assert.equal(
            currentChunk.start,
            expectedStart,
            `第 ${index} 个 chunk 的 start 不符合 overlap 规则`
        );

        const previousOverlap = previousChunk.content.slice(
            -overlapCharacters
        );

        const currentOverlap = currentChunk.content.slice(
            0,
            overlapCharacters
        );

        assert.equal(
            currentOverlap,
            previousOverlap,
            `第 ${index - 1} 与第 ${index} 个 chunk 的 overlap 内容不一致`
        );
    }

    console.log("Character Chunker 测试通过：");

    console.log({
        source: cleanedDocument.metadata.source,
        originalLength: cleanedDocument.content.length,
        chunkCount: chunks.length,
        maxCharacters,
        overlapCharacters
    });

    console.table(
        chunks.map((chunk) => ({
            chunkIndex: chunk.chunkIndex,
            chunkId: chunk.chunkId,
            start: chunk.start,
            end: chunk.end,
            length: chunk.content.length,
            preview: chunk.content
                .replace(/\n/g, " ")
                .slice(0, 80)
        }))
    );
}

main().catch((error: unknown) => {
    console.error("Character Chunker 测试失败：", error);
    process.exitCode = 1;
});
