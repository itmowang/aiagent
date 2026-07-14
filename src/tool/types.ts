export interface Tool {
    name: string;
    description: string;
    parameters:Record<string, unknown>;
    execute(input: any): Promise<any>;
}