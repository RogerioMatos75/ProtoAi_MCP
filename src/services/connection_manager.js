const driveManager = require('./drive_manager');
const bookProcessor = require('./book_processor');
const { supabase, logAudit } = require('../config/supabase');

class ConnectionManager {
    async establishConnection(sourceId, targetId, intent, params = {}) {
        try {
            // Valida se é uma conexão com Google Drive
            if (params.type === 'GOOGLE_DRIVE') {
                return this.handleDriveConnection(sourceId, targetId, intent, params);
            }

            // Outros tipos de conexão podem ser implementados aqui
            const { data, error } = await supabase
                .from('model_connections')
                .insert({
                    source_model_id: sourceId,
                    target_model_id: targetId,
                    intent: intent,
                    connection_params: params,
                    status: 'active'
                })
                .select()
                .single();

            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Erro ao estabelecer conexão:', error);
            throw error;
        }
    }

    async handleDriveConnection(sourceId, targetId, intent, params) {
        try {
            // Valida o arquivo no Drive
            const fileMetadata = await driveManager.getFileMetadata(params.fileId);
            
            // Insere registro do livro
            const { data: book, error } = await supabase
                .from('books')
                .insert({
                    title: fileMetadata.name,
                    author: params.author || 'Desconhecido',
                    description: params.description || '',
                    drive_file_id: params.fileId,
                    status: 'processing'
                })
                .select()
                .single();

            if (error) throw error;

            // Processa o livro em background
            this.processBookInBackground(book.id, params.fileId, params.userId);

            // Registra a conexão
            const { data: connection, error: connError } = await supabase
                .from('model_connections')
                .insert({
                    source_model_id: sourceId,
                    target_model_id: targetId,
                    intent: intent,
                    connection_params: {
                        ...params,
                        book_id: book.id
                    },
                    status: 'processing'
                })
                .select()
                .single();

            if (connError) throw connError;

            return {
                success: true,
                bookId: book.id,
                connectionId: connection.id,
                status: 'processing'
            };
        } catch (error) {
            console.error('Erro ao estabelecer conexão com Drive:', error);
            throw error;
        }
    }

    async processBookInBackground(bookId, fileId, userId) {
        try {
            // Inicia processamento do livro
            const result = await bookProcessor.processBook(fileId, userId);

            // Atualiza status da conexão
            await supabase
                .from('model_connections')
                .update({ status: 'active' })
                .eq('connection_params->>book_id', bookId);

            // Registra na auditoria
            await logAudit(userId, 'PROCESS_BOOK', 'book', bookId, {
                success: true,
                textLength: result.textLength
            });

        } catch (error) {
            console.error('Erro no processamento em background:', error);
            
            // Atualiza status para erro
            await supabase
                .from('books')
                .update({ status: 'error' })
                .eq('id', bookId);

            // Registra erro na auditoria
            await logAudit(userId, 'PROCESS_BOOK_ERROR', 'book', bookId, {
                error: error.message
            });
        }
    }

    async listConnections(userId, filters = {}) {
        try {
            let query = supabase
                .from('model_connections')
                .select(`
                    *,
                    books:books(*)
                `)
                .order('created_at', { ascending: false });

            // Aplica filtros
            if (filters.status) {
                query = query.eq('status', filters.status);
            }
            if (filters.intent) {
                query = query.ilike('intent', `%${filters.intent}%`);
            }

            const { data, error } = await query;
            if (error) throw error;

            return data;
        } catch (error) {
            console.error('Erro ao listar conexões:', error);
            throw error;
        }
    }

    async terminateConnection(connectionId, userId) {
        try {
            const { data, error } = await supabase
                .from('model_connections')
                .update({ status: 'terminated' })
                .eq('id', connectionId)
                .select()
                .single();

            if (error) throw error;

            // Registra na auditoria
            await logAudit(userId, 'TERMINATE_CONNECTION', 'connection', connectionId);

            return data;
        } catch (error) {
            console.error('Erro ao terminar conexão:', error);
            throw error;
        }
    }
}

module.exports = new ConnectionManager();