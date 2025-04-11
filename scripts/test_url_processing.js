require('dotenv').config();
const batchProcessor = require('../src/services/batch_processor');
const bookProcessor = require('../src/services/book_processor');
const cacheManager = require('../src/services/cache_manager');
const { supabase } = require('../src/config/supabase');

async function testUrlProcessing() {
    try {
        console.log('🚀 Iniciando teste de processamento via URLs...\n');

        // Simula um usuário de teste
        const testUserId = '00000000-0000-0000-0000-000000000000';

        // Lista de URLs de teste (será substituída pelas URLs reais)
        const testUrls = process.env.TEST_BOOK_URLS ? 
            process.env.TEST_BOOK_URLS.split(',') : 
            [];

        if (testUrls.length === 0) {
            throw new Error('TEST_BOOK_URLS não definido no .env');
        }

        // 1. Valida URLs
        console.log('1️⃣ Validando URLs...');
        for (const url of testUrls) {
            const validation = await cacheManager.validateUrl(url);
            console.log(`URL: ${url}`);
            console.log('Status:', validation.valid ? '✅ Válida' : '❌ Inválida');
            if (validation.valid) {
                console.log('Tipo:', validation.contentType);
                console.log('Tamanho:', validation.contentLength);
            } else {
                console.log('Erro:', validation.error);
            }
            console.log('---');
        }

        // 2. Adiciona URLs à fila de processamento
        console.log('\n2️⃣ Adicionando URLs à fila de processamento...');
        const queueResult = await batchProcessor.addUrlsToQueue(testUrls, testUserId);
        console.log('✅ URLs adicionadas:', {
            total: queueResult.totalUrls,
            processando: queueResult.addedToQueue
        });

        // 3. Monitora status da fila
        console.log('\n3️⃣ Monitorando processamento...');
        let processing = true;
        while (processing) {
            const status = await batchProcessor.getQueueStatus();
            console.log('Status atual:', {
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

        // 4. Verifica resultados no cache
        console.log('\n4️⃣ Verificando cache...');
        const { data: books } = await supabase
            .from('books')
            .select('*')
            .in('url', testUrls);

        for (const book of books) {
            const cached = await cacheManager.getCachedBook(book.id);
            console.log(`Livro: ${book.title}`);
            console.log('Cache:', cached ? '✅ Presente' : '❌ Ausente');
            console.log('Status:', book.status);
            console.log('---');
        }

        // 5. Verifica estatísticas
        console.log('\n5️⃣ Estatísticas do cache:');
        const stats = await cacheManager.getCacheStats();
        console.log(stats);

        console.log('\n✨ Teste de processamento via URLs concluído!');
    } catch (error) {
        console.error('\n❌ Erro durante teste:', error);
        process.exit(1);
    } finally {
        // Limpa recursos
        await bookProcessor.cleanup();
    }
}

// Executa o teste
testUrlProcessing();