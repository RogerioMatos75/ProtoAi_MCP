// Importa as dependências
require('dotenv').config();
const { supabase } = require('../src/config/supabase');

async function testConnection() {
    try {
        console.log('🔍 Testando conexão com Supabase...');
        
        // Testa conexão verificando a tabela mcp_manifests
        console.log('📋 Verificando tabela mcp_manifests...');
        const { data: manifests, error: manifestError } = await supabase
            .from('mcp_manifests')
            .select('count');

        if (manifestError) {
            console.error('❌ Erro ao acessar mcp_manifests:', manifestError.message);
            return false;
        }
        console.log('✅ Tabela mcp_manifests OK');

        // Testa tabela semantic_cache
        console.log('📋 Verificando tabela semantic_cache...');
        const { data: cache, error: cacheError } = await supabase
            .from('semantic_cache')
            .select('count');

        if (cacheError) {
            console.error('❌ Erro ao acessar semantic_cache:', cacheError.message);
            return false;
        }
        console.log('✅ Tabela semantic_cache OK');

        // Testa tabela cache_metrics
        console.log('📋 Verificando tabela cache_metrics...');
        const { data: metrics, error: metricsError } = await supabase
            .from('cache_metrics')
            .select('count');

        if (metricsError) {
            console.error('❌ Erro ao acessar cache_metrics:', metricsError.message);
            return false;
        }
        console.log('✅ Tabela cache_metrics OK');

        console.log('\n✨ Todas as tabelas verificadas com sucesso!');
        return true;
    } catch (error) {
        console.error('❌ Erro durante o teste:', error.message);
        if (error.stack) {
            console.error('\nStack trace:', error.stack);
        }
        return false;
    }
}

async function runTest() {
    console.log('🔄 Iniciando teste de conexão com Supabase...\n');
    
    try {
        const isConnected = await testConnection();
        
        if (isConnected) {
            console.log('\n✅ Teste concluído com sucesso!');
            process.exit(0);
        } else {
            console.error('\n❌ Falha no teste de conexão');
            process.exit(1);
        }
    } catch (error) {
        console.error('\n❌ Erro durante o teste:', error.message);
        if (error.stack) {
            console.error('\nStack trace:', error.stack);
        }
        process.exit(1);
    }
}

runTest();