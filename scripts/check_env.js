process.stderr.write('🚀 Iniciando verificação de ambiente...\n');

const path = require('path');
const dotenv = require('dotenv');
const fs = require('fs');

// Verifica se o arquivo .env existe
const envPath = path.resolve(__dirname, '../.env');
process.stderr.write(`📂 Verificando arquivo .env em: ${envPath}\n`);

if (!fs.existsSync(envPath)) {
    process.stderr.write('❌ Arquivo .env não encontrado!\n');
    process.exit(1);
}

process.stderr.write('✅ Arquivo .env encontrado\n');

// Tenta ler o arquivo diretamente
try {
    const envContent = fs.readFileSync(envPath, 'utf8');
    process.stderr.write(`📄 Conteúdo do arquivo .env:\n${envContent}\n`);
} catch (error) {
    process.stderr.write(`❌ Erro ao ler arquivo .env: ${error.message}\n`);
    process.exit(1);
}

// Carrega as variáveis de ambiente
const result = dotenv.config({ path: envPath });

if (result.error) {
    process.stderr.write(`❌ Erro ao carregar .env: ${result.error.message}\n`);
    process.exit(1);
}

process.stderr.write('\n🔍 Variáveis de ambiente carregadas:\n');
process.stderr.write(`SUPABASE_URL: ${process.env.SUPABASE_URL ? '✅ Presente' : '❌ Ausente'}\n`);
process.stderr.write(`SUPABASE_ANON_KEY: ${process.env.SUPABASE_ANON_KEY ? '✅ Presente' : '❌ Ausente'}\n`);
process.stderr.write(`DATABASE_URL: ${process.env.DATABASE_URL ? '✅ Presente' : '❌ Ausente'}\n`);
process.stderr.write(`DIRECT_URL: ${process.env.DIRECT_URL ? '✅ Presente' : '❌ Ausente'}\n`);