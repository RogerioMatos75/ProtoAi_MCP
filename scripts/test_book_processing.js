require('dotenv').config();
const driveManager = require('../src/services/drive_manager');
const bookProcessor = require('../src/services/book_processor');
const connectionManager = require('../src/services/connection_manager');
const modelRegistry = require('../src/services/model_registry');
const { supabase, semanticSearch } = require('../src/config/supabase');

async function testBookProcessingFlow() {
    try {
        console.log('🚀 Iniciando teste do fluxo completo de processamento de livros...\n');

        // Simula um usuário de teste
        const testUserId = '00000000-0000-0000-0000-000000000000';

        // 1. Registra um livro de teste do Google Drive
        console.log('1️⃣ Registrando livro de teste...');
        const testBook = {
            title: "Dom Casmurro",
            author: "Machado de Assis",
            description: "Romance clássico da literatura brasileira que narra a história de Bentinho e Capitu.",
            drive_file_id: process.env.TEST_DRIVE_FILE_ID,
            language: "pt-BR",
            is_free: true,
            price: 0,
            license_type: "public_domain",
            mime_type: "application/pdf"
        };

        const model = await modelRegistry.registerBookAsModel(testBook, testUserId);
        console.log('✅ Livro registrado como modelo:', {
            modelId: model.id,
            title: testBook.title
        });

        // 2. Estabelece conexão para processamento
        console.log('\n2️⃣ Estabelecendo conexão para processamento...');
        const connection = await connectionManager.establishConnection(
            model.id,
            'book_processor',
            'process_book_content',
            {
                type: 'GOOGLE_DRIVE',
                fileId: testBook.drive_file_id,
                userId: testUserId,
                ...testBook
            }
        );
        console.log('✅ Conexão estabelecida:', {
            connectionId: connection.connectionId,
            status: connection.status
        });

        // 3. Aguarda processamento inicial
        console.log('\n3️⃣ Aguardando processamento inicial...');
        await new Promise(resolve => setTimeout(resolve, 5000));

        // 4. Testa busca semântica
        console.log('\n4️⃣ Testando busca semântica...');
        const searchResults = await semanticSearch(
            "relacionamento entre Bentinho e Capitu", 
            0.7,
            3
        );
        console.log('✅ Resultados da busca:', searchResults);

        // 5. Testa recomendações
        console.log('\n5️⃣ Testando sistema de recomendações...');
        const { data: recommendations } = await supabase.rpc(
            'recommend_books',
            { user_id: testUserId, recommendation_count: 3 }
        );
        console.log('✅ Recomendações geradas:', recommendations);

        // 6. Valida status final
        console.log('\n6️⃣ Verificando status final do livro...');
        const { data: finalStatus } = await supabase
            .from('books')
            .select('*')
            .eq('drive_file_id', testBook.drive_file_id)
            .single();

        console.log('📚 Status final do livro:', {
            id: finalStatus.id,
            title: finalStatus.title,
            status: finalStatus.status,
            hasEmbedding: !!finalStatus.content_vector
        });

        console.log('\n✨ Teste do fluxo completo finalizado com sucesso!');
    } catch (error) {
        console.error('\n❌ Erro durante o teste:', error);
        process.exit(1);
    }
}

// Executa o teste
testBookProcessingFlow();