import { Message ,ToolCall} from './types'

export function createConversation() {
    let messages: Message[] = [];

    return {
        add(message: Message) {
            messages.push(message)
        },

        addSystem(content: string) {
            messages.push({
                role: "system",
                content
            })
        },

        addUser(content: string) {
            messages.push({
                role: "user",
                content
            })
        },
        addAssistant(content:string) {
            messages.push({
                role: "assistant",
                content
            })
        },
        addAssistantToolCalls(toolCalls:ToolCall[]){
            messages.push({
                role: "assistant",
                content: "",
                tool_calls: toolCalls
            })
        },
        addTool(content: string, tool_call_id: string) {
            messages.push({
                role: "tool",
                content,
                tool_call_id
            })
        },
        messages() {
            return [...messages];
        },
        clear() {
            messages = []
        }

    }
}

export type Conversation = ReturnType<typeof createConversation>;