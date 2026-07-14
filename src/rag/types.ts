export interface Document {
    id: string;
    content: string;
    vector: number[];
    metadata?: Record<string, any>
}


export interface VectorStore {
    init(): Promise<void>;
    add(docs: Document[]): Promise<void>;
    search(vector: number[], limit: number): Promise<Document[]>
}

