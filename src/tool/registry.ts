import type { Tool } from "./types";

export function createToolRegistry() {
    const tools = new Map<string, Tool>();

    return {
        register(tool: Tool) {
            tools.set(
                tool.name,
                tool
            )
        },
        get(name: string) {
            return tools.get(name);
        },
        list() {
            return Array.from(
                tools.values()
            )
        }
    }

}

export type ToolRegistry =  ReturnType<typeof createToolRegistry>;