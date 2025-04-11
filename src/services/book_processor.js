const pdf = require('pdf-parse');
const EPub = require('epub');
const { createWorker } = require('tesseract.js');
const { supabase, createEmbedding } = require('../config/supabase');
const driveManager = require('./drive_manager');
const axios = require('axios');
const path = require('path');
const fs = require('fs').promises;
const os = require('os');

class BookProcessor {
    constructor() {
        this.worker = null;
        this.tempDir = path.join(os.tmpdir(), 'book_processing');
    }

    async initOCR() {
        if (!this.worker) {
            this.worker = await createWorker('por');
        }
    }

    async processBook(fileId, userId) {
        try {
            // Valida acesso
            await driveManager.validateBookAccess(fileId, userId);

            // Download do arquivo
            const { metadata, content } = await driveManager.processBookFile(fileId, userId);
            
            // Extrai texto baseado no tipo do arquivo
            let text;
            switch (metadata.mimeType) {
                case 'application/pdf':
                    text = await this.extractPDFText(content);
                    break;
                case 'application/epub+zip':
                    text = await this.extractEPUBText(content);
                    break;
                case 'image/png':
                case 'image/jpeg':
                    text = await this.extractImageText(content);
                    break;
                default:
                    throw new Error(`Tipo de arquivo não suportado: ${metadata.mimeType}`);
            }

            // Gera embedding do texto
            const embedding = await createEmbedding(text);

            // Atualiza o registro do livro
            const { data, error } = await supabase
                .from('books')
                .update({
                    content_vector: embedding,
                    status: 'processed'
                })
                .eq('drive_file_id', fileId)
                .select();

            if (error) throw error;

            return {
                success: true,
                bookId: data[0].id,
                textLength: text.length
            };
        } catch (error) {
            console.error('Erro ao processar livro:', error);
            throw error;
        }
    }

    async processBookFromUrl(url, userId) {
        try {
            // Download do arquivo
            const { content, contentType, fileName } = await this.downloadFile(url);
            
            // Extrai texto baseado no tipo do arquivo
            let text;
            switch (contentType) {
                case 'application/pdf':
                    text = await this.extractPDFText(content);
                    break;
                case 'application/epub+zip':
                    text = await this.extractEPUBText(content);
                    break;
                case 'image/png':
                case 'image/jpeg':
                    text = await this.extractImageText(content);
                    break;
                default:
                    throw new Error(`Tipo de arquivo não suportado: ${contentType}`);
            }

            // Gera embedding do texto
            const embedding = await createEmbedding(text);

            // Atualiza o registro do livro
            const { data, error } = await supabase
                .from('books')
                .update({
                    content_vector: embedding,
                    status: 'processed'
                })
                .eq('url', url)
                .select();

            if (error) throw error;

            return {
                success: true,
                bookId: data[0].id,
                textLength: text.length
            };
        } catch (error) {
            console.error('Erro ao processar livro:', error);
            throw error;
        }
    }

    async downloadFile(url) {
        try {
            const response = await axios.get(url, {
                responseType: 'arraybuffer',
                timeout: 30000
            });
            
            return {
                content: response.data,
                contentType: response.headers['content-type'],
                fileName: path.basename(url)
            };
        } catch (error) {
            console.error('Erro ao baixar arquivo:', error);
            throw error;
        }
    }

    async extractPDFText(buffer) {
        try {
            const data = await pdf(buffer);
            return data.text;
        } catch (error) {
            console.error('Erro ao extrair texto do PDF:', error);
            throw error;
        }
    }

    async extractEPUBText(buffer) {
        // Salva temporariamente o arquivo EPUB
        const tempFile = path.join(this.tempDir, `temp_${Date.now()}.epub`);
        
        try {
            await fs.mkdir(this.tempDir, { recursive: true });
            await fs.writeFile(tempFile, buffer);

            return new Promise((resolve, reject) => {
                const epub = new EPub(tempFile);
                let text = '';

                epub.on('end', () => {
                    epub.flow.forEach(chapter => {
                        if (chapter.text) {
                            text += chapter.text + '\n';
                        }
                    });
                    resolve(text);
                });

                epub.on('error', reject);
                epub.parse();
            });
        } finally {
            try {
                await fs.unlink(tempFile);
            } catch (error) {
                console.warn('Erro ao deletar arquivo temporário:', error);
            }
        }
    }

    async extractImageText(buffer) {
        try {
            await this.initOCR();
            const { data: { text } } = await this.worker.recognize(buffer);
            return text;
        } catch (error) {
            console.error('Erro ao extrair texto da imagem:', error);
            throw error;
        }
    }

    async cleanup() {
        if (this.worker) {
            await this.worker.terminate();
            this.worker = null;
        }
        
        try {
            await fs.rmdir(this.tempDir, { recursive: true });
        } catch (error) {
            console.warn('Erro ao limpar diretório temporário:', error);
        }
    }
}

module.exports = new BookProcessor();