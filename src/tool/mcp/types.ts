export type McpTransport = "stdio" | "sse" | "http";


export interface McpServerConfig {
    name: string;
    transport: McpTransport;
    command?: string;  // studio
    args?: string[];    // studio
    url?:string;        // sse /http
    enabled: boolean;
    autoApprove?: string[];
}


