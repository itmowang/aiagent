import fs from "node:fs/promises";
import path from "node:path";
import type { DocumentLoader } from "./types";

export function createPdfLoader(): DocumentLoader {
    return {
        async load(filePath: string) {
            return {
                path: filePath,
                name: path.basename(filePath),
                type: "pdf",
                content: await fs.readFile(filePath)
            };
        }
    };
}