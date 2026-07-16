import type { Memory, MemoryItem } from "./types";

export function createMemory(): Memory {
    let store: MemoryItem[] = [];

    return {
        async set(key: string, value: string) {
            const exist = store.find(item => item.key === key)
            if (exist) {
                exist.value = value;
                return;
            }
            store.push({
                key,
                value,
                createdAt: Date.now()
            })
        },
        async get(key: string) {
            return store.find(item => item.key === key);
        },
        async all() {
            return [...store]
        },
        async clear() {
            store = []
        }
    }
}
