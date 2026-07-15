import assert from "node:assert/strict";
import path from "node:path";
import { createMarkdownLoader } from "./src/rag/loader";
import { createMarkdownParser } from "./src/rag/parser";
import { createMarkdownCleaner } from "./src/rag/cleaner";
import { createParentChildChunker } from "./src/rag/chunker";

async function main() {
    const inputPath = process.argv[2];

    if (!inputPath) {
        throw new Error(
            "请提供 Markdown 文件路径，例如：tsx test-parentchildChucker.ts ./产品工作.md"
        );
    }

    const filePath = path.resolve(inputPath);

    const parentMaxCharacters = 2000;
    const childMaxCharacters = 600;
    const childOverlapCharacters = 100;

    const loader = createMarkdownLoader();
    const parser = createMarkdownParser();
    const cleaner = createMarkdownCleaner();

    const chunker = createParentChildChunker({
        parentMaxCharacters,
        childMaxCharacters,
        childOverlapCharacters
    });

    // Loader → Parser → Cleaner → ParentChildChunker
    const file = await loader.load(filePath);
    const parsedDocument = await parser.parse(file);
    const cleanedDocument = cleaner.clean(parsedDocument);

    const {
        parents,
        chunks: children
    } = chunker.chunk(cleanedDocument);

    assert.ok(
        parents.length > 0,
        "非空 Markdown 文档应至少生成一个 parent chunk"
    );

    assert.ok(
        children.length > 0,
        "非空 Markdown 文档应至少生成一个 child chunk"
    );

    const parentMap = new Map(
        parents.map((parent) => [
            parent.chunkId,
            parent
        ])
    );

    // 1. 验证 Parent Chunks
    for (const [index, parent] of parents.entries()) {
        assert.equal(
            parent.chunkIndex,
            index,
            `第 ${index} 个 parent 的 chunkIndex 不正确`
        );

        assert.equal(
            parent.chunkId,
            `${cleanedDocument.metadata.source}:parent:${index}`,
            `第 ${index} 个 parent 的 chunkId 不正确`
        );

        assert.ok(
            parent.content.length <= parentMaxCharacters,
            `第 ${index} 个 parent 超过 parentMaxCharacters`
        );

        assert.equal(
            parent.end - parent.start,
            parent.content.length,
            `第 ${index} 个 parent 的 start/end 范围不正确`
        );

        assert.equal(
            parent.content,
            cleanedDocument.content.slice(
                parent.start,
                parent.end
            ),
            `第 ${index} 个 parent 内容与原文范围不一致`
        );

        assert.equal(
            parent.parentId,
            undefined,
            `第 ${index} 个 parent 不应拥有 parentId`
        );

        assert.deepEqual(
            parent.metadata,
            cleanedDocument.metadata,
            `第 ${index} 个 parent 未继承完整 metadata`
        );
    }

    // 2. 验证 Child Chunks
    for (const [index, child] of children.entries()) {
        assert.equal(
            child.chunkIndex,
            index,
            `第 ${index} 个 child 的 chunkIndex 不正确`
        );

        assert.ok(
            child.content.length <= childMaxCharacters,
            `第 ${index} 个 child 超过 childMaxCharacters`
        );

        assert.ok(
            child.parentId,
            `第 ${index} 个 child 必须拥有 parentId`
        );

        const parent = parentMap.get(child.parentId);

        assert.ok(
            parent,
            `第 ${index} 个 child 的 parentId 找不到对应 parent`
        );

        assert.ok(
            child.start >= parent.start,
            `第 ${index} 个 child 的 start 不应在 parent 范围外`
        );

        assert.ok(
            child.end <= parent.end,
            `第 ${index} 个 child 的 end 不应在 parent 范围外`
        );

        assert.equal(
            child.end - child.start,
            child.content.length,
            `第 ${index} 个 child 的 start/end 范围不正确`
        );

        assert.equal(
            child.content,
            cleanedDocument.content.slice(
                child.start,
                child.end
            ),
            `第 ${index} 个 child 内容与清洗后正文范围不一致`
        );

        assert.equal(
            child.content,
            parent.content.slice(
                child.start - parent.start,
                child.end - parent.start
            ),
            `第 ${index} 个 child 内容与所属 parent 范围不一致`
        );

        assert.deepEqual(
            child.headings,
            parent.headings,
            `第 ${index} 个 child 应继承 parent 的 headings`
        );

        assert.deepEqual(
            child.metadata,
            parent.metadata,
            `第 ${index} 个 child 应继承 parent 的 metadata`
        );
    }

    // 3. 每个 Parent 至少应有一个 Child
    for (const parent of parents) {
        const parentChildren = children.filter(
            (child) => child.parentId === parent.chunkId
        );

        assert.ok(
            parentChildren.length > 0,
            `Parent ${parent.chunkId} 没有任何 child chunk`
        );
    }

    // 4. 验证同一个 Parent 内 Child 的 overlap
    for (const parent of parents) {
        const parentChildren = children
            .filter(
                (child) => child.parentId === parent.chunkId
            )
            .sort((a, b) => a.start - b.start);

        for (
            let index = 1;
            index < parentChildren.length;
            index += 1
        ) {
            const previousChild = parentChildren[index - 1];
            const currentChild = parentChildren[index];

            assert.ok(previousChild);
            assert.ok(currentChild);

            const expectedStart =
                previousChild.start +
                childMaxCharacters -
                childOverlapCharacters;

            assert.equal(
                currentChild.start,
                expectedStart,
                `Parent ${parent.chunkId} 内 child overlap 的 start 不正确`
            );

            const previousOverlap =
                previousChild.content.slice(
                    -childOverlapCharacters
                );

            const currentOverlap =
                currentChild.content.slice(
                    0,
                    childOverlapCharacters
                );

            assert.equal(
                currentOverlap,
                previousOverlap,
                `Parent ${parent.chunkId} 内相邻 child overlap 内容不一致`
            );
        }
    }

    console.log("Parent-Child Chunker 测试通过：");

    console.log({
        source: cleanedDocument.metadata.source,
        documentLength: cleanedDocument.content.length,
        parentCount: parents.length,
        childCount: children.length,
        parentMaxCharacters,
        childMaxCharacters,
        childOverlapCharacters
    });

    console.log("\nParents：");

    console.table(
        parents.map((parent) => ({
            parentIndex: parent.chunkIndex,
            parentId: parent.chunkId,
            start: parent.start,
            end: parent.end,
            length: parent.content.length,
            headings: parent.headings.join(" > "),
            preview: parent.content
                .replace(/\n/g, " ")
                .slice(0, 70)
        }))
    );

    console.log("\nChildren：");

    console.table(
        children.map((child) => ({
            childIndex: child.chunkIndex,
            parentId: child.parentId,
            start: child.start,
            end: child.end,
            length: child.content.length,
            headings: child.headings.join(" > "),
            preview: child.content
                .replace(/\n/g, " ")
                .slice(0, 70)
        }))
    );
}

main().catch((error: unknown) => {
    console.error("Parent-Child Chunker 测试失败：", error);
    process.exitCode = 1;
});
