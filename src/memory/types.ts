export interface MemoryItem {
    key: string;
    value: string;
    createdAt: number;
}


export interface Memory {
    set(key: string, value: string): void;
    get(key: string): Promise<MemoryItem|undefined>;
    all(): Promise<MemoryItem[]>;
    clear(): Promise<void>
}

