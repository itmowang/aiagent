import type { Retriever } from "../rag/retriever"
import { createTool } from "./tool";

// 内置的Rag工具

export function createKnowledgeTool(retriever: Retriever) {
    return createTool({
        name: "search_knowledge",
        description: "搜索知识库，获取相关知识信息",
        parameters: {
            type: "object",
            properties: {
                query: {
                    type: "string",
                    description: "需要查询的问题"
                }
            },
            require: ["query"]
        },
        execute: async function (input: any): Promise<any> {
            const result = await retriever.search(input.query, 3);
            return result;
        }
    })

}