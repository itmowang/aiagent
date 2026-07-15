interface MarkdownHeading {
    level: number;
    title: string;
    start: number;
    end: number;
    headings: string[];
}

export interface MarkdownSection {
    content: string;
    start: number;
    end: number;
    headings: string[];
}

function scanMarkdownHeadings(
    content: string
): MarkdownHeading[] {
    const headings: MarkdownHeading[] = [];

    const lines = content.match(/[^\n]*\n|[^\n]+/g) ?? [];

    let offset = 0;
    let headingPath: string[] = [];

    let codeFenceCharacter: "`" | "~" | null = null;
    let codeFenceLength = 0;

    for (const rawLine of lines) {
        const line = rawLine.endsWith("\n")
            ? rawLine.slice(0, -1)
            : rawLine;

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

            offset += rawLine.length;
            continue;
        }

        if (codeFenceCharacter) {
            offset += rawLine.length;
            continue;
        }

        const headingMatch = line.match(
            /^(#{1,6})\s+(.+?)(?:\s+#+)?\s*$/
        );

        if (headingMatch) {
            const level = headingMatch[1].length;
            const title = headingMatch[2].trim();

            headingPath = headingPath.slice(0, level - 1);
            headingPath.push(title);

            headings.push({
                level,
                title,
                start: offset,
                end: offset + rawLine.length,
                headings: [...headingPath]
            });
        }

        offset += rawLine.length;
    }

    return headings;
}

export function parseMarkdownSections(
    content: string,
    preferredHeadingLevel: number = 2
): MarkdownSection[] {
    if (!content) {
        return [];
    }

    const headings = scanMarkdownHeadings(content);

    if (headings.length === 0) {
        return [
            {
                content,
                start: 0,
                end: content.length,
                headings: []
            }
        ];
    }

    const hasPreferredLevel = headings.some(
        (heading) => heading.level === preferredHeadingLevel
    );

    const sectionLevel = hasPreferredLevel
        ? preferredHeadingLevel
        : Math.min(
            ...headings.map((heading) => heading.level)
        );

    const sectionHeadings = headings.filter(
        (heading) => heading.level === sectionLevel
    );

    const sections: MarkdownSection[] = [];

    // 第一个 section 前的内容：
    // 通常包含 # 文档标题、文档介绍、引用说明等。
    const firstSectionHeading = sectionHeadings[0];

    if (
        firstSectionHeading &&
        content.slice(0, firstSectionHeading.start).trim()
    ) {
        const precedingHeading = [...headings]
            .reverse()
            .find(
                (heading) =>
                    heading.start < firstSectionHeading.start
            );

        sections.push({
            content: content.slice(
                0,
                firstSectionHeading.start
            ),
            start: 0,
            end: firstSectionHeading.start,
            headings: precedingHeading?.headings ?? []
        });
    }

    for (
        let index = 0;
        index < sectionHeadings.length;
        index += 1
    ) {
        const sectionHeading = sectionHeadings[index];
        const nextSectionHeading =
            sectionHeadings[index + 1];

        const start = sectionHeading.start;
        const end =
            nextSectionHeading?.start ?? content.length;

        const sectionContent = content.slice(start, end);

        if (!sectionContent.trim()) {
            continue;
        }

        sections.push({
            content: sectionContent,
            start,
            end,
            headings: sectionHeading.headings
        });
    }

    return sections;
}
