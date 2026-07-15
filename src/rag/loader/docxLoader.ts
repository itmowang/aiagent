import fs from "node:fs/promises";
import path from "node:path";
import type { DocumentLoader } from "./types";

export function createDocxLoader(): DocumentLoader {
    return {
        async load(filePath: string) {
            return {
                path: filePath,
                name: path.basename(filePath),
                type: "docx",
                content: await fs.readFile(filePath)
            };
        }
    };
}