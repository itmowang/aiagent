import type {
    CharacterChunkerOptions,
    Chunk,
    DocumentChunker
} from "./types";

export function createCharacterChunker(
    options: CharacterChunkerOptions
): DocumentChunker {
    const {
        maxCharacters,
        overlapCharacters
    } = options;

    if (
        !Number.isInteger(maxCharacters) ||
        maxCharacters <= 0
    ) {
        throw new Error(
            "maxCharacters 必须是大于 0 的整数"
        );
    }

    if (
        !Number.isInteger(overlapCharacters) ||
        overlapCharacters < 0
    ) {
        throw new Error(
            "overlapCharacters 必须是大于等于 0 的整数"
        );
    }

    if (overlapCharacters >= maxCharacters) {
        throw new Error(
            "overlapCharacters 必须小于 maxCharacters，否则会导致无限循环"
        );
    }

    const step = maxCharacters - overlapCharacters;

    return {
        chunk(document) {
            const {
                content,
                metadata
            } = document;

            if (!content) {
                return {
                    chunks: [],
                    parents: []
                };
            }

            const chunks: Chunk[] = [];

            let start = 0;
            let chunkIndex = 0;

            while (start < content.length) {
                const end = Math.min(
                    start + maxCharacters,
                    content.length
                );

                chunks.push({
                    chunkId: `${metadata.source}:character:${chunkIndex}`,
                    content: content.slice(start, end),
                    chunkIndex,
                    start,
                    end,
                    headings: [],
                    metadata
                });

                if (end === content.length) {
                    break;
                }

                start += step;
                chunkIndex += 1;
            }

            return {
                chunks,
                parents: []
            };
        }
    };
}
