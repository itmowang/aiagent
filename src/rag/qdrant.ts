import { QdrantClient } from '@qdrant/js-client-rest';
import type { VectorStore, Document } from './types';

interface Options {
    url: string;
    collection: string;
    vectorSize: number;
}


export function createQdrantVectorStore(options: Options): VectorStore {
    const client = new QdrantClient({
        url: options.url
    })

    async function init() {
        const collection = await client.getCollections();
        const exists = collection.collections.some(item => item.name === options.collection);
        if (!exists) {
            await client.createCollection(options.collection, {
                vectors: {
                    size: options.vectorSize,
                    distance: "Cosine"
                }
            })
        }
    }

    async function add(docs: Document[]) {
        await client.upsert(options.collection, {
            points: docs.map(doc => ({
                id: doc.id,
                vector: doc.vector,
                payload: {
                    content: doc.content,
                    ...doc.metadata
                }
            }))
        })
    }

    async function search(vector: number[], limit: number) {
        const result = await client.search(options.collection, {
            vector,
            limit
        })
        return result.map(item => ({
            id: String(item.id),
            content: item.payload?.content as string,
            metadata: item.payload as any,
        }))
    }

    return {
        init,
        add,
        search,
    }
}