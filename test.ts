import { createConversation } from './src/conversation';
import { createToolRegistry, createTool } from "./src/tool";
import { createToolRuntime } from './src/runtime'

async function main() {

    const conversation = createConversation();

    const registry = createToolRegistry();

    registry.register(
        createTool({
            name: "calculator",
            description: "计算器",
            parameters: {
                type: "object",
                properties: {
                    a: {
                        type: "number"
                    },
                    b: {
                        type: "number"
                    }
                }
            },
            async execute(input: any) {
                return input.a + input.b;
            },
        })
    );

    const runtime = createToolRuntime({
        conversation,
        registry,
    });

    const result = await runtime.execute("calculator", {
        a: 10,
        b: 20,
    });

    console.log(result);
    console.log(conversation.messages());
}

main().catch(console.error);