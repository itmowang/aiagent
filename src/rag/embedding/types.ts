export interface Embedding {
    embed(text: string): Promise<number[]>;
    embedMany(texts: string[]): Promise<number[][]>;
}