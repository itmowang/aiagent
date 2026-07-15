import type { DocumentCleaner } from "./types";

export function createMarkdownCleaner(): DocumentCleaner {
    return {
        clean(document) {
            const normalizedContent = document.content
                .replace(/^\uFEFF/, "")
                .replace(/\r\n?/g, "\n");

            const lines = normalizedContent.split("\n");
            const cleanedLines: string[] = [];

            let blankLineCount = 0;

            let codeFenceCharacter: "`" | "~" | null = null;
            let codeFenceLength = 0;

            for (const line of lines) {
                const fenceMatch = line.match(
                    /^\s*(`{3,}|~{3,})/
                );

                if (fenceMatch) {
                    const fence = fenceMatch[1];
                    const character = fence[0] as "`" | "~";

                    if (!codeFenceCharacter) {
                        codeFenceCharacter = character;
                        codeFenceLength = fence.length;
                    } else if (
                        codeFenceCharacter === character &&
                        fence.length >= codeFenceLength
                    ) {
                        codeFenceCharacter = null;
                        codeFenceLength = 0;
                    }

                    cleanedLines.push(line);
                    blankLineCount = 0;
                    continue;
                }

                // 代码块中完全保留内容，包括空行和末尾空格。
                if (codeFenceCharacter) {
                    cleanedLines.push(line);
                    continue;
                }

                // 仅将“空格或 Tab 组成的行”规范为空行。
                if (line.trim() === "") {
                    blankLineCount += 1;

                    // 正文中最多保留两个连续空行。
                    if (blankLineCount <= 2) {
                        cleanedLines.push("");
                    }

                    continue;
                }

                blankLineCount = 0;
                cleanedLines.push(line);
            }

            return {
                ...document,
                content: cleanedLines.join("\n")
            };
        }
    };
}
