import type { DocumentFile } from "../loader";

export interface ParsedDocument {
    content: string;
    metadata: {
        source: string;
        fileName: string;
        fileType: string;
        frontmatter:Record<string,unknown>
    };
}

export interface DocumentParser {
    parse(file: DocumentFile): Promise<ParsedDocument>;
}
