import { MCPInterface } from '../core/types.ts';

export interface InterfaceAdapter {
    type: MCPInterface['type'];
    validateInterface(interfaceSpec: MCPInterface): boolean;
    generateClient(interfaceSpec: MCPInterface): string;
}

export class RESTAdapter implements InterfaceAdapter {
    type = 'REST' as const;

    validateInterface(interfaceSpec: MCPInterface): boolean {
        return !!(
            interfaceSpec.base_url &&
            interfaceSpec.endpoints &&
            Array.isArray(interfaceSpec.endpoints)
        );
    }

    generateClient(interfaceSpec: MCPInterface): string {
        // Template básico para geração de cliente
        return `
        class ${interfaceSpec.type}Client {
            constructor(baseUrl = '${interfaceSpec.base_url}') {
                this.baseUrl = baseUrl;
            }
            
            async request(endpoint, method, params = {}) {
                // Implementação básica de requisição
                const url = new URL(endpoint, this.baseUrl);
                return fetch(url, {
                    method,
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    ...params
                });
            }
        }`;
    }
}

export class GRPCAdapter implements InterfaceAdapter {
    type = 'GRPC' as const;

    validateInterface(interfaceSpec: MCPInterface): boolean {
        return !!(
            interfaceSpec.host &&
            interfaceSpec.port &&
            interfaceSpec.proto_files &&
            Array.isArray(interfaceSpec.proto_files)
        );
    }

    generateClient(interfaceSpec: MCPInterface): string {
        // Template básico para cliente gRPC
        return `
        // Gerado automaticamente para ${interfaceSpec.type}
        import * as grpc from '@grpc/grpc-js';
        import * as protoLoader from '@grpc/proto-loader';
        
        const PROTO_PATH = '${interfaceSpec.proto_files?.[0]}';
        
        export class ${interfaceSpec.type}Client {
            constructor(host = '${interfaceSpec.host}:${interfaceSpec.port}') {
                this.host = host;
                this.packageDefinition = protoLoader.loadSync(PROTO_PATH);
                this.client = new grpc.Client(host);
            }
        }`;
    }
}