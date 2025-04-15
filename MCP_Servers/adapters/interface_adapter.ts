import { MCPInterface, MCPEndpoint } from '../core/types.ts';

// Tipos específicos para cada adaptador
interface RESTEndpoint extends MCPEndpoint {
    path: string;
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
}

interface GRPCEndpoint extends MCPEndpoint {
    service: string;
    method: string;
    requestType: string;
    responseType: string;
}

interface RequestParams {
    headers?: Record<string, string>;
    body?: unknown;
    query?: Record<string, string>;
}

export interface InterfaceAdapter {
    type: MCPInterface['type'];
    validateInterface(interfaceSpec: MCPInterface): boolean;
    generateClient(interfaceSpec: MCPInterface): string;
}

export class RESTAdapter implements InterfaceAdapter {
    type = 'REST' as const;

    validateInterface(interfaceSpec: MCPInterface): boolean {
        if (!interfaceSpec.base_url || !interfaceSpec.endpoints) {
            return false;
        }

        try {
            // Valida se base_url é uma URL válida
            new URL(interfaceSpec.base_url);

            // Valida endpoints
            return interfaceSpec.endpoints.every(endpoint => {
                const restEndpoint = endpoint as RESTEndpoint;
                return (
                    restEndpoint.path &&
                    restEndpoint.method &&
                    ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'].includes(restEndpoint.method)
                );
            });
        } catch {
            return false;
        }
    }

    generateClient(interfaceSpec: MCPInterface): string {
        // Template melhorado para cliente REST
        return `
        export class ${interfaceSpec.type}Client {
            private baseUrl: string;
            private headers: Record<string, string>;

            constructor(baseUrl = '${interfaceSpec.base_url}', headers = {}) {
                if (!baseUrl) throw new Error('baseUrl é obrigatório');
                this.baseUrl = baseUrl;
                this.headers = {
                    'Content-Type': 'application/json',
                    ...headers
                };
            }
            
            async request<T>(
                endpoint: string,
                method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH',
                params: RequestParams = {}
            ): Promise<T> {
                const url = new URL(endpoint, this.baseUrl);
                
                // Adiciona query params
                if (params.query) {
                    Object.entries(params.query).forEach(([key, value]) => {
                        url.searchParams.append(key, value);
                    });
                }

                const response = await fetch(url, {
                    method,
                    headers: {
                        ...this.headers,
                        ...params.headers
                    },
                    ...(params.body ? { body: JSON.stringify(params.body) } : {})
                });

                if (!response.ok) {
                    throw new Error(\`HTTP error! status: \${response.status}\`);
                }

                return response.json();
            }
        }`;
    }
}

export class GRPCAdapter implements InterfaceAdapter {
    type = 'GRPC' as const;

    validateInterface(interfaceSpec: MCPInterface): boolean {
        if (!interfaceSpec.host || !interfaceSpec.port || !interfaceSpec.proto_files) {
            return false;
        }

        // Valida host e porta
        const isValidHost = /^[a-zA-Z0-9.-]+$/.test(interfaceSpec.host);
        const isValidPort = Number.isInteger(interfaceSpec.port) &&
            interfaceSpec.port > 0 &&
            interfaceSpec.port <= 65535;

        // Valida proto_files
        const hasValidProtos = Array.isArray(interfaceSpec.proto_files) &&
            interfaceSpec.proto_files.length > 0 &&
            interfaceSpec.proto_files.every(file =>
                typeof file === 'string' && file.endsWith('.proto')
            );

        return isValidHost && isValidPort && hasValidProtos;
    }

    generateClient(interfaceSpec: MCPInterface): string {
        // Template melhorado para cliente gRPC
        return `
        import * as grpc from '@grpc/grpc-js';
        import * as protoLoader from '@grpc/proto-loader';
        
        export class ${interfaceSpec.type}Client {
            private client: grpc.Client;
            private packageDefinition: grpc.PackageDefinition;
            private services: Record<string, any>;

            constructor(
                host = '${interfaceSpec.host}:${interfaceSpec.port}',
                options: grpc.ChannelCredentials = grpc.credentials.createInsecure()
            ) {
                const PROTO_PATH = '${interfaceSpec.proto_files?.[0]}';
                
                try {
                    this.packageDefinition = protoLoader.loadSync(PROTO_PATH, {
                        keepCase: true,
                        longs: String,
                        enums: String,
                        defaults: true,
                        oneofs: true
                    });

                    const protoDescriptor = grpc.loadPackageDefinition(this.packageDefinition);
                    this.client = new grpc.Client(host, options);
                    this.services = {};

                    // Carrega todos os serviços do proto
                    Object.entries(protoDescriptor).forEach(([name, service]) => {
                        if (service.service) {
                            this.services[name] = service;
                        }
                    });
                } catch (error) {
                    throw new Error(\`Erro ao inicializar cliente gRPC: \${error.message}\`);
                }
            }

            async call<T>(service: string, method: string, request: unknown): Promise<T> {
                return new Promise((resolve, reject) => {
                    const serviceClient = this.services[service];
                    if (!serviceClient) {
                        reject(new Error(\`Serviço \${service} não encontrado\`));
                        return;
                    }

                    this.client.makeUnaryRequest(
                        \`/\${service}/\${method}\`,
                        (arg) => arg,
                        (arg) => arg,
                        request,
                        (error, response) => {
                            if (error) reject(error);
                            else resolve(response as T);
                        }
                    );
                });
            }

            close(): void {
                this.client.close();
            }
        }`;
    }
}