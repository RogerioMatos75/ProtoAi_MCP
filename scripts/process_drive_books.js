require('dotenv').config();
const { google } = require('googleapis');
const batchProcessor = require('../src/services/batch_processor');
const driveManager = require('../src/services/drive_manager');

async function processDriveBooks() {
    try {
        console.log('🚀 Iniciando processamento de livros do Google Drive...\n');

        // ID da pasta compartilhada
        const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;
        if (!folderId) {
            throw new Error('GOOGLE_DRIVE_FOLDER_ID não definido no .env');
        }

        // Configura cliente do Google Drive
        const auth = new google.auth.GoogleAuth({
            keyFile: process.env.GOOGLE_APPLICATION_CREDENTIALS,
            scopes: ['https://www.googleapis.com/auth/drive.readonly']
        });
        const drive = google.drive({ version: 'v3', auth });

        // Lista arquivos na pasta
        console.log('📂 Listando arquivos na pasta do Drive...');
        const response = await drive.files.list({
            q: `'${folderId}' in parents and trashed = false`,
            fields: 'files(id, name, mimeType, size, webContentLink)',
            pageSize: 1000
        });

        const files = response.data.files;
        if (!files || files.length === 0) {
            console.log('Nenhum arquivo encontrado na pasta.');
            return;
        }

        console.log(`\n📚 Encontrados ${files.length} arquivos:`);
        files.forEach(file => {
            console.log(`- ${file.name} (${file.mimeType})`);
        });

        // Filtra apenas arquivos suportados
        const supportedTypes = [
            'application/pdf',
            'application/epub+zip',
            'image/png',
            'image/jpeg'
        ];

        const supportedFiles = files.filter(file => 
            supportedTypes.includes(file.mimeType)
        );

        console.log(`\n✅ ${supportedFiles.length} arquivos suportados para processamento`);

        // Processa cada arquivo
        console.log('\n🔄 Iniciando processamento em lote...');
        const urls = supportedFiles.map(file => file.webContentLink);

        // Adiciona URLs à fila de processamento
        const result = await batchProcessor.addUrlsToQueue(urls, 'system');

        console.log('\n📊 Resultado do processamento:');
        console.log(`Total de arquivos: ${result.totalUrls}`);
        console.log(`Adicionados à fila: ${result.addedToQueue}`);
        
        // Monitora progresso
        console.log('\n⏳ Monitorando progresso do processamento...');
        let processing = true;
        while (processing) {
            const status = await batchProcessor.getQueueStatus();
            console.log('\nStatus atual:', {
                aguardando: status.waiting,
                processando: status.active,
                concluídos: status.completed,
                falhas: status.failed
            });

            if (status.active === 0 && status.waiting === 0) {
                processing = false;
            } else {
                await new Promise(resolve => setTimeout(resolve, 2000));
            }
        }

        console.log('\n✨ Processamento concluído!');

    } catch (error) {
        console.error('\n❌ Erro durante o processamento:', error);
        process.exit(1);
    }
}

// Executa o processamento
processDriveBooks();