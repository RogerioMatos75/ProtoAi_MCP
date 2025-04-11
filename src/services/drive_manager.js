const { google } = require('googleapis');
const { Readable } = require('stream');
const { supabase, logAudit } = require('../config/supabase');

class DriveManager {
    constructor() {
        this.drive = google.drive({
            version: 'v3',
            auth: this._getAuthClient()
        });
    }

    _getAuthClient() {
        return new google.auth.GoogleAuth({
            keyFile: process.env.GOOGLE_APPLICATION_CREDENTIALS,
            scopes: ['https://www.googleapis.com/auth/drive.readonly']
        });
    }

    async getFileMetadata(fileId) {
        try {
            const response = await this.drive.files.get({
                fileId,
                fields: 'id, name, mimeType, size, createdTime, modifiedTime'
            });

            return response.data;
        } catch (error) {
            console.error('Erro ao obter metadados do arquivo:', error);
            throw error;
        }
    }

    async downloadFile(fileId) {
        try {
            const response = await this.drive.files.get({
                fileId,
                alt: 'media'
            }, {
                responseType: 'stream'
            });

            return response.data;
        } catch (error) {
            console.error('Erro ao baixar arquivo:', error);
            throw error;
        }
    }

    async streamToBuffer(stream) {
        const chunks = [];
        return new Promise((resolve, reject) => {
            stream.on('data', chunk => chunks.push(chunk));
            stream.on('error', reject);
            stream.on('end', () => resolve(Buffer.concat(chunks)));
        });
    }

    async processBookFile(fileId, userId) {
        try {
            // Obtém metadados do arquivo
            const metadata = await this.getFileMetadata(fileId);
            
            // Faz download do arquivo
            const fileStream = await this.downloadFile(fileId);
            const buffer = await this.streamToBuffer(fileStream);
            
            // Aqui você pode adicionar lógica para processar diferentes tipos de arquivo
            // Por exemplo, converter PDF para texto, processar EPUB, etc.
            
            // Registra na auditoria
            await logAudit(userId, 'DOWNLOAD_BOOK', 'book', fileId, {
                fileName: metadata.name,
                fileSize: metadata.size
            });

            return {
                success: true,
                metadata,
                content: buffer
            };
        } catch (error) {
            console.error('Erro ao processar arquivo do livro:', error);
            throw error;
        }
    }

    async validateBookAccess(fileId, userId) {
        try {
            const { data: permission } = await supabase
                .from('user_permissions')
                .select('*')
                .eq('user_id', userId)
                .eq('book_id', fileId)
                .single();

            if (!permission || new Date(permission.valid_until) < new Date()) {
                throw new Error('Acesso não autorizado ao livro');
            }

            return true;
        } catch (error) {
            console.error('Erro ao validar acesso ao livro:', error);
            throw error;
        }
    }
}

module.exports = new DriveManager();