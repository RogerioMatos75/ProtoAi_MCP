process.stderr.write('🚀 Iniciando teste do Supabase...\n');

const dotenv = require('dotenv');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Carrega as variáveis de ambiente
dotenv.config({ path: path.resolve(__dirname, '../.env') });

async function testSupabase() {
    try {
        process.stderr.write('📝 Configurando cliente Supabase...\n');
        process.stderr.write(`URL: ${process.env.SUPABASE_URL}\n`);
        
        const supabase = createClient(
            process.env.SUPABASE_URL,
            process.env.SUPABASE_ANON_KEY,
            {
                auth: { persistSession: false },
                db: { schema: 'public' }
            }
        );

        process.stderr.write('🔍 Tentando fazer uma consulta...\n');
        
        const { data, error } = await supabase
            .from('models')
            .select('*')
            .limit(1);

        if (error) {
            process.stderr.write(`❌ Erro na consulta: ${error.message}\n`);
            process.stderr.write(`Detalhes: ${JSON.stringify(error, null, 2)}\n`);
            process.exit(1);
        }
        
        process.stderr.write('✅ Conexão bem sucedida!\n');
        process.stderr.write(`📊 Dados recebidos: ${JSON.stringify(data, null, 2)}\n`);
        process.exit(0);
    } catch (error) {
        process.stderr.write(`❌ Erro: ${error.message}\n`);
        if (error.stack) {
            process.stderr.write(`Stack: ${error.stack}\n`);
        }
        process.exit(1);
    }
}

// Executa o teste e garante que erros não tratados também sejam exibidos
process.on('unhandledRejection', (error) => {
    process.stderr.write(`❌ Erro não tratado: ${error.message}\n`);
    process.stderr.write(`Stack: ${error.stack}\n`);
    process.exit(1);
});

testSupabase().catch((error) => {
    process.stderr.write(`❌ Erro na execução: ${error.message}\n`);
    process.exit(1);
});