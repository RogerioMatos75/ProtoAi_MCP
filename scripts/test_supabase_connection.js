// Importa as dependências
require('dotenv').config();
const { Pool } = require('pg');
const { createClient } = require('@supabase/supabase-js');

async function main() {
    console.log('🔄 Iniciando teste de conexão...');
    
    try {
        // Extrai informações da URL do Supabase
        const dbUrl = new URL(process.env.DATABASE_URL);
        const directUrl = new URL(process.env.DIRECT_URL);
        
        // Configuração do pool PostgreSQL
        const pool = new Pool({
            user: dbUrl.username,
            password: decodeURIComponent(dbUrl.password),
            host: dbUrl.hostname,
            port: dbUrl.port,
            database: dbUrl.pathname.split('/')[1],
            ssl: { rejectUnauthorized: false }
        });

        // Teste da conexão PostgreSQL
        console.log('🔍 Testando conexão PostgreSQL...');
        const client = await pool.connect();
        const result = await client.query('SELECT NOW()');
        console.log('✅ Conexão PostgreSQL OK -', result.rows[0].now);
        client.release();

        // Teste da conexão Supabase
        console.log('\n🔍 Testando conexão Supabase...');
        
        // Configura o cliente Supabase
        const supabaseUrl = `https://${directUrl.hostname}`;
        const supabaseKey = decodeURIComponent(dbUrl.password);
        
        console.log('📍 Conectando ao Supabase em:', supabaseUrl);
        const supabase = createClient(supabaseUrl, supabaseKey);

        // Testa a conexão fazendo uma consulta
        console.log('🔍 Tentando fazer uma consulta no Supabase...');
        const { data, error } = await supabase
            .from('models')
            .select('*')
            .limit(1);

        if (error) throw error;
        
        console.log('✅ Conexão Supabase OK!');
        console.log('📊 Dados recebidos:', data);
        
        console.log('\n🎉 Todos os testes completados com sucesso!');
        process.exit(0);
    } catch (error) {
        console.error('\n❌ Erro durante os testes:', error.message);
        if (error.stack) {
            console.error('Stack:', error.stack);
        }
        process.exit(1);
    }
}

main();