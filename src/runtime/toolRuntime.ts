import type { ToolRuntimeOptions } from "./types";


// 创建工具运行时
export function createToolRuntime(options: ToolRuntimeOptions) {
    const { conversation, registry } = options

    return {
        async execute(name: string, input: unknown, toolCallId: string) {
            const tool = registry.get(name);

            if (!tool) {
                // throw new Error(`Tool ${name} not found`);
                const error = `Tool ${name} not found`

                conversation.addTool(error, toolCallId);

                return {
                    success: false,
                    error
                }
            }

            try {
                const result = await tool.execute(input);
                conversation.addTool(JSON.stringify(result), toolCallId);
                return {
                    success: true,
                    data: result
                }
            } catch (error: any) {
                const message = error instanceof Error ? error.message : String(error)
                const errorResult = {
                    success: false,
                    error: message
                }
                conversation.addTool(JSON.stringify(errorResult), toolCallId)
                return errorResult;
            }
        }
    }
}

export type ToolRuntime = ReturnType<typeof createToolRuntime>;