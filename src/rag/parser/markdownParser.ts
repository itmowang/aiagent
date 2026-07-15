import { parse } from "yaml";
import type { DocumentParser } from "./types";

function extractFrontMatter(rawContent: string) {
    const frontMatterPattern =
        /^(?:\uFEFF)?---[ \t]*\r?\n([\s\S]*?)\r?\n---[ \t]*(?:\r?\n|$)/;

    const match = rawContent.match(frontMatterPattern);

    if (!match) {
        return {
            frontmatter: {},
            content: rawContent
        };
    }

    const frontMatterText = match[1];
    const parsed = parse(frontMatterText);

    if (
        parsed !== null &&
        (typeof parsed !== "object" || Array.isArray(parsed))
    ) {
        throw new Error("Markdown Front Matter 必须是 YAML 对象");
    }

    return {
        frontmatter: (parsed ?? {}) as Record<string, unknown>,

        // 只移除 Front Matter 本身；
        // 后面的 Markdown 正文不 trim、不统一换行、不修改内容。
        content: rawContent.slice(match[0].length)
    };
}

export function createMarkdownParser(): DocumentParser {
    return {
        async parse(file) {
            if (file.type !== "markdown") {
                throw new Error(
                    `MarkdownParser 不支持 ${file.type} 类型的文件`
                );
            }

            const rawContent = file.content.toString("utf8");

            const {
                frontmatter,
                content
            } = extractFrontMatter(rawContent);

            return {
                content,
                metadata: {
                    source: file.path,
                    fileName: file.name,
                    fileType: file.type,
                    frontmatter
                }
            };
        }
    };
}
