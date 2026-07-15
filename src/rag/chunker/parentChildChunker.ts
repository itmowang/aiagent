import { createCharacterChunker } from "./characterChunker";
import { parseMarkdownSections } from "./markdownSectionParser";
import type {
    Chunk,
    DocumentChunker,
    ParentChildChunkerOptions
} from "./types";

export function createParentChildChunker(
    options: ParentChildChunkerOptions
): DocumentChunker {
    const {
        parentMaxCharacters,
        childMaxCharacters,
        childOverlapCharacters
    } = options;

    if (
        !Number.isInteger(parentMaxCharacters) ||
        parentMaxCharacters <= 0
    ) {
        throw new Error(
            "parentMaxCharacters 必须是大于 0 的整数"
        );
    }

    if (
        !Number.isInteger(childMaxCharacters) ||
        childMaxCharacters <= 0
    ) {
        throw new Error(
            "childMaxCharacters 必须是大于 0 的整数"
        );
    }

    if (
        !Number.isInteger(childOverlapCharacters) ||
        childOverlapCharacters < 0
    ) {
        throw new Error(
            "childOverlapCharacters 必须是大于等于 0 的整数"
        );
    }

    if (childOverlapCharacters >= childMaxCharacters) {
        throw new Error(
            "childOverlapCharacters 必须小于 childMaxCharacters"
        );
    }

    const childChunker = createCharacterChunker({
        maxCharacters: childMaxCharacters,
        overlapCharacters: childOverlapCharacters
    });

    return {
        chunk(document) {
            const sections = parseMarkdownSections(
                document.content
            );

            const parents: Chunk[] = [];
            const chunks: Chunk[] = [];

            // 1. 每个 Markdown section 生成一个或多个 parent chunk。
            for (const section of sections) {
                let sectionOffset = 0;

                while (
                    sectionOffset < section.content.length
                ) {
                    const parentStart =
                        section.start + sectionOffset;

                    const parentEnd = Math.min(
                        parentStart + parentMaxCharacters,
                        section.end
                    );

                    const parentContent =
                        document.content.slice(
                            parentStart,
                            parentEnd
                        );

                    const parentIndex = parents.length;

                    const parent: Chunk = {
                        chunkId:
                            `${document.metadata.source}` +
                            `:parent:${parentIndex}`,

                        content: parentContent,

                        chunkIndex: parentIndex,

                        start: parentStart,
                        end: parentEnd,

                        headings: [...section.headings],

                        metadata: document.metadata
                    };

                    parents.push(parent);

                    sectionOffset += parentContent.length;
                }
            }

            // 2. 每个 parent chunk 再生成多个 child chunk。
            for (const parent of parents) {
                const childResult = childChunker.chunk({
                    content: parent.content,
                    metadata: document.metadata
                });

                for (const child of childResult.chunks) {
                    const childIndex = chunks.length;

                    chunks.push({
                        chunkId:
                            `${parent.chunkId}` +
                            `:child:${child.chunkIndex}`,

                        content: child.content,

                        chunkIndex: childIndex,

                        // CharacterChunker 的 start/end 是相对于 parent，
                        // 这里转换为相对于清洗后完整正文的位置。
                        start: parent.start + child.start,
                        end: parent.start + child.end,

                        headings: [...parent.headings],

                        parentId: parent.chunkId,

                        metadata: document.metadata
                    });
                }
            }

            return {
                chunks,
                parents
            };
        }
    };
}
