export interface MemoryItem {
    key: string;
    value: string;
    createdAt: number;
}


export interface Memory {
    set(key: string, value: string): void;
    get(key: string): MemoryItem | undefined;
    all(): MemoryItem[];
    clear(): void;
}

