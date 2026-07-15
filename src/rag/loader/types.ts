export interface DocumentFile {
    path: string;
    name: string;
    type: string;
    content: Buffer;
}


export interface DocumentLoader {
    load(path: string): Promise<DocumentFile>;
}