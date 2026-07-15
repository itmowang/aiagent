import type { ParsedDocument } from "../parser";

export interface DocumentCleaner {
    clean(document: ParsedDocument): ParsedDocument;
}
