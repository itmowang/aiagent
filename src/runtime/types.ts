import type { Conversation } from '../conversation'
import type { ToolRegistry } from "../tool"

export interface ToolRuntimeOptions {
    conversation: Conversation;
    registry: ToolRegistry;
}