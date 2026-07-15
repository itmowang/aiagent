import fs from "node:fs/promises";
import path from "node:path";
import type { DocumentLoader } from "./types";

export function createMarkdownLoader(): DocumentLoader {
    return {
        async load(filePath: string) {
            return {
                path: filePath,
                name: path.basename(filePath),
                type: "markdown",
                content: await fs.readFile(filePath)
            };
        }
    };
}