import OpenAI from "openai";
import type { Embedding } from "./types";

interface Options {
    apiKey:string;
    baseURL?:string;
    model:string;
}

export function createOpenAIEmbedding(options:Options):Embedding{
    const client = new OpenAI({
        apiKey:options.apiKey,
        baseURL:options.baseURL
    })

    return {
        async embed(text:string){
            const response = await client.embeddings.create({
                model:options.model,
                input:text
            })
            return response.data[0].embedding
        },
        async embedMany(texts:string[]){
            const response = await client.embeddings.create({
                model:options.model,
                input:texts
            })
            return  response.data.map(item=>item.embedding)
        }
    }
}