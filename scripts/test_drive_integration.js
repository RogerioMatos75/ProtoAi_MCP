const driveManager = require('../src/services/drive_manager');
const bookProcessor = require('../src/services/book_processor');
const connectionManager = require('../src/services/connection_manager');
const { supabase } = require('../src/config/supabase');
require('dotenv').config();

async function testDriveIntegration() {
    try {
        console.log('🔍 Iniciando teste de integração com Google Drive...');

        // Testa conexão com Supabase
        const { data: testData, error: testError } = await supabase.from('books').select('count');
        if (testError) throw new Error(`Erro de conexão com Supabase: ${testError.message}`);
        console.log('✅ Conexão com Supabase OK');

        // ID de teste do arquivo no Google Drive (substitua pelo ID real)
        const testFileId = process.env.TEST_DRIVE_FILE_ID;
        if (!testFileId) throw new Error('TEST_DRIVE_FILE_ID não definido no .env');

        // Testa acesso ao Drive
        console.log('🔍 Testando acesso ao Google Drive...');
        const metadata = await driveManager.getFileMetadata(testFileId);
        console.log('✅ Metadados do arquivo recuperados:', {
            name: metadata.name,
            mimeType: metadata.mimeType,
            size: metadata.size
        });

        // Simula um usuário de teste
        const testUserId = '00000000-0000-0000-0000-000000000000';

        // Testa estabelecimento de conexão
        console.log('🔍 Testando estabelecimento de conexão...');
        const connection = await connectionManager.establishConnection(
            'source_test_id',
            'target_test_id',
            'TEST_BOOK_PROCESSING',
            {
                type: 'GOOGLE_DRIVE',
                fileId: testFileId,
                userId: testUserId,
                author: 'Autor Teste',
                description: 'Livro de teste para validar integração'
            }
        );
        console.log('✅ Conexão estabelecida:', connection);

        // Aguarda processamento (em produção isso seria assíncrono)
        console.log('⏳ Aguardando processamento do livro...');
        await new Promise(resolve => setTimeout(resolve, 5000));

        // Verifica status final
        const { data: bookData } = await supabase
            .from('books')
            .select('*')
            .eq('drive_file_id', testFileId)
            .single();

        console.log('📚 Status final do livro:', {
            id: bookData.id,
            title: bookData.title,
            status: bookData.status
        });

        console.log('✅ Teste de integração concluído com sucesso!');
    } catch (error) {
        console.error('❌ Erro durante teste de integração:', error);
        process.exit(1);
    }
}

testDriveIntegration();