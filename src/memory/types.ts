export interface MemoryItem {
    key: string;
    value: string;
    createdAt: number;
}


export interface Memory {
    set(key: string, value: string): Promise<void>;
    get(key: string): Promise<MemoryItem | undefined>;
    all(): Promise<MemoryItem[]>;
    clear(): Promise<void>;
}
