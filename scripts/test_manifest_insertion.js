const { supabase } = require('../src/config/supabase');

const testManifest = {
    version: "1.0.0",
    api_name: "Test API",
    semantic_purpose: "Teste de integração do MCP Server com Supabase",
    description: "Manifesto usado para validar a integração entre o MCP Server e o Supabase",
    interfaces: [
        {
            type: "REST",
            base_url: "http://localhost:8080",
            documentation_url: "http://localhost:8080/docs",
            endpoints: [
                {
                    path: "/test",
                    method: "GET",
                    semantic_purpose: "Endpoint de teste"
                }
            ]
        }
    ],
    capabilities: {
        semantic_discovery: true,
        version_control: true
    },
    metadata: {
        creator: "Test Script",
        tags: ["test", "integration"]
    }
};

async function testManifestInsertion() {
    try {
        console.log('🔄 Iniciando teste de inserção de manifesto...\n');

        // Tenta inserir o manifesto
        const { data, error } = await supabase
            .from('mcp_manifests')
            .insert({
                manifest: testManifest,
                version: testManifest.version
            })
            .select()
            .single();

        if (error) {
            console.error('❌ Erro ao inserir manifesto:', error.message);
            if (error.details) console.error('Detalhes:', error.details);
            return false;
        }

        console.log('✅ Manifesto inserido com sucesso!');
        console.log('📄 ID do manifesto:', data.id);
        
        // Tenta recuperar o manifesto inserido
        const { data: retrieved, error: retrieveError } = await supabase
            .from('mcp_manifests')
            .select('*')
            .eq('id', data.id)
            .single();

        if (retrieveError) {
            console.error('❌ Erro ao recuperar manifesto:', retrieveError.message);
            return false;
        }

        console.log('✅ Manifesto recuperado com sucesso!');
        console.log('📊 Dados do manifesto:', JSON.stringify(retrieved, null, 2));
        return true;

    } catch (error) {
        console.error('❌ Erro durante o teste:', error.message);
        if (error.stack) {
            console.error('\nStack trace:', error.stack);
        }
        return false;
    }
}

testManifestInsertion();