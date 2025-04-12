import { MCPManifest, MCPInterface } from './types.ts';

export interface MCPManifestValidationResult {
    isValid: boolean;
    errors: string[];
}

export class MCPManifestValidator {
    private static requiredFields = [
        'version',
        'api_name',
        'semantic_purpose',
        'description'
    ] as const;

    static validateManifest(manifest: MCPManifest): MCPManifestValidationResult {
        const errors: string[] = [];

        // Validação de campos obrigatórios
        this.requiredFields.forEach(field => {
            if (!manifest[field]) {
                errors.push(`Campo obrigatório ausente: ${field}`);
            }
        });

        // Validação de versão
        if (manifest.version && !manifest.version.match(/^\d+\.\d+\.\d+$/)) {
            errors.push('Versão deve seguir o padrão semântico (ex: 1.0.0)');
        }

        // Validação de interfaces
        if (manifest.interfaces) {
            if (!Array.isArray(manifest.interfaces)) {
                errors.push('interfaces deve ser um array');
            } else {
                manifest.interfaces.forEach((iface: MCPInterface, index: number) => {
                    if (!iface.type) {
                        errors.push(`Interface ${index} deve especificar um tipo`);
                    }
                });
            }
        }

        // Validação de capabilities
        if (manifest.capabilities) {
            if (typeof manifest.capabilities !== 'object') {
                errors.push('capabilities deve ser um objeto');
            } else {
                Object.entries(manifest.capabilities).forEach(([key, value]) => {
                    if (typeof value !== 'boolean') {
                        errors.push(`Capability ${key} deve ser um booleano`);
                    }
                });
            }
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    }
}