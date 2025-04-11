const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

function executeCommand(command, explanation) {
    console.log(`\n🔧 ${explanation}...`);
    try {
        execSync(command, { stdio: 'inherit' });
        console.log('✅ Concluído com sucesso');
    } catch (error) {
        console.error('❌ Erro:', error.message);
        process.exit(1);
    }
}

function createEnvFile() {
    console.log('\n📝 Criando arquivo .env de exemplo...');
    const envContent = `
# Supabase
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_supabase_anon_key
DATABASE_URL=your_database_url
DIRECT_URL=your_direct_url

# Google Drive
GOOGLE_APPLICATION_CREDENTIALS=path_to_your_credentials.json
TEST_DRIVE_FILE_ID=your_test_file_id

# OpenAI (para embeddings)
OPENAI_API_KEY=your_openai_api_key

# Configurações do servidor
PORT=3000
NODE_ENV=development
`;

    try {
        fs.writeFileSync('.env.example', envContent.trim());
        console.log('✅ Arquivo .env.example criado');
        
        if (!fs.existsSync('.env')) {
            fs.copyFileSync('.env.example', '.env');
            console.log('✅ Arquivo .env criado a partir do exemplo');
        }
    } catch (error) {
        console.error('❌ Erro ao criar arquivos .env:', error.message);
        process.exit(1);
    }
}

function createCredentialsFolder() {
    console.log('\n📁 Criando pasta para credenciais...');
    const credentialsPath = path.join(__dirname, '..', 'credentials');
    
    try {
        if (!fs.existsSync(credentialsPath)) {
            fs.mkdirSync(credentialsPath);
            console.log('✅ Pasta credentials criada');
        }
    } catch (error) {
        console.error('❌ Erro ao criar pasta credentials:', error.message);
        process.exit(1);
    }
}

async function setup() {
    console.log('🚀 Iniciando setup do ambiente...\n');

    // Instala dependências
    executeCommand('npm install', 'Instalando dependências do Node.js');

    // Cria estrutura de arquivos necessária
    createEnvFile();
    createCredentialsFolder();

    // Verifica requisitos do sistema
    executeCommand('npm list pdf-parse epub tesseract.js', 'Verificando dependências de processamento de documentos');

    console.log('\n✨ Setup concluído! Próximos passos:');
    console.log('1. Configure suas credenciais no arquivo .env');
    console.log('2. Adicione seu arquivo de credenciais do Google Drive na pasta credentials/');
    console.log('3. Execute npm run dev para iniciar o servidor');
    console.log('4. Use o script test_book_processing.js para testar a integração\n');
}

// Executa setup
setup();