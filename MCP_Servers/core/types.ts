export interface MCPManifest {
    version: string;
    api_name: string;
    semantic_purpose: string;
    description: string;
    auth?: {
        methods: string[];
        requires_payment?: boolean;
        security_level?: 'low' | 'medium' | 'high';
        rate_limit?: {
            requests_per_minute: number;
            burst: number;
        };
    };
    interfaces: MCPInterface[];
    capabilities?: Record<string, boolean>;
    metadata?: {
        creator?: string;
        repository?: string;
        tags?: string[];
    };
}

export interface MCPInterface {
    type: 'REST' | 'GRPC' | 'GraphQL' | 'WebSocket';
    base_url?: string;
    host?: string;
    port?: number;
    proto_files?: string[];
    endpoints?: MCPEndpoint[];
}

export interface MCPEndpoint {
    path: string;
    method: string;
    semantic_purpose: string;
    parameters?: MCPParameter[];
    response_format?: string;
    rate_limit?: {
        requests_per_minute: number;
    };
}

export interface MCPParameter {
    name: string;
    type: string;
    description: string;
    required: boolean;
}