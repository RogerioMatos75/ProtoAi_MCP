import { MCPManifestValidator, MCPManifestValidationResult } from '../core/manifest_validator.ts';
import { RESTAdapter, GRPCAdapter } from '../adapters/interface_adapter.ts';
import { MCPManifest, MCPInterface } from '../core/types.ts';

export interface ManifestProcessingResult {
    success: boolean;
    manifest_id?: string;
    errors?: string[];
    validation_result?: MCPManifestValidationResult;
}

export class ManifestHandler {
    private adapters: Record<MCPInterface['type'], RESTAdapter | GRPCAdapter> = {
        'REST': new RESTAdapter(),
        'GRPC': new GRPCAdapter(),
        'GraphQL': new RESTAdapter(), // Temporariamente usando REST adapter
        'WebSocket': new RESTAdapter() // Temporariamente usando REST adapter
    };

    async processManifest(manifest: MCPManifest): Promise<ManifestProcessingResult> {
        // 1. Validação básica do manifesto
        const validationResult = MCPManifestValidator.validateManifest(manifest);
        if (!validationResult.isValid) {
            return {
                success: false,
                errors: validationResult.errors
            };
        }

        // 2. Validação de interfaces específicas
        if (manifest.interfaces) {
            for (const iface of manifest.interfaces) {
                const adapter = this.adapters[iface.type];
                if (!adapter) {
                    return {
                        success: false,
                        errors: [`Interface não suportada: ${iface.type}`]
                    };
                }

                if (!adapter.validateInterface(iface)) {
                    return {
                        success: false,
                        errors: [`Configuração inválida para interface ${iface.type}`]
                    };
                }
            }
        }

        // 3. Geração de ID único para o manifesto
        const manifestId = await this.generateManifestId(manifest);

        return {
            success: true,
            manifest_id: manifestId,
            validation_result: validationResult
        };
    }

    private async generateManifestId(manifest: MCPManifest): Promise<string> {
        // Gera um hash baseado no conteúdo do manifesto e timestamp
        const manifestStr = JSON.stringify(manifest);
        const encoder = new TextEncoder();
        const data = encoder.encode(manifestStr + Date.now().toString());
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    }
}