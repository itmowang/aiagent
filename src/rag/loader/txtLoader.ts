import fs from "node:fs/promises";
import path from "node:path";
import type { DocumentLoader } from "./types";

export function createTxtLoader(): DocumentLoader {
    return {
        async load(filePath: string) {
            const buffer = await fs.readFile(filePath);
            return {
                path: filePath,
                name: path.basename(filePath),
                type: "txt",
                content: buffer
            };
        }
    };
}