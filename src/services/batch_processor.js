const Queue = require('bull');
const { supabase, logAudit } = require('../config/supabase');
const bookProcessor = require('./book_processor');
const modelRegistry = require('./model_registry');
const cacheManager = require('./cache_manager');
const axios = require('axios');
const path = require('path');

const bookQueue = new Queue('book-processing', {
    redis: {
        port: process.env.REDIS_PORT || 6379,
        host: process.env.REDIS_HOST || 'localhost'
    }
});

class BatchProcessor {
    constructor() {
        this.setupQueueHandlers();
    }

    setupQueueHandlers() {
        bookQueue.process(async (job) => {
            const { url, userId, metadata } = job.data;
            try {
                await this.processBookUrl(url, userId, metadata);
                return { success: true, url };
            } catch (error) {
                console.error(`Erro ao processar arquivo ${url}:`, error);
                throw error;
            }
        });

        bookQueue.on('completed', async (job) => {
            const { url, userId } = job.data;
            await logAudit(userId, 'BATCH_PROCESS_COMPLETED', 'book', null, { url });
        });

        bookQueue.on('failed', async (job, error) => {
            const { url, userId } = job.data;
            await logAudit(userId, 'BATCH_PROCESS_FAILED', 'book', null, {
                url,
                error: error.message
            });
        });
    }

    async addUrlsToQueue(urls, userId) {
        try {
            let addedCount = 0;
            const results = [];

            for (const url of urls) {
                // Valida URL antes de adicionar à fila
                const validation = await cacheManager.validateUrl(url);
                
                if (validation.valid) {
                    await bookQueue.add({
                        url,
                        userId,
                        metadata: {
                            contentType: validation.contentType,
                            size: validation.contentLength,
                            fileName: path.basename(url)
                        }
                    }, {
                        attempts: 3,
                        backoff: {
                            type: 'exponential',
                            delay: 2000
                        }
                    });
                    addedCount++;
                    results.push({ url, status: 'queued', ...validation });
                } else {
                    results.push({ url, status: 'invalid', error: validation.error });
                }
            }

            await logAudit(userId, 'URLS_ADDED_TO_QUEUE', 'batch', null, {
                totalUrls: urls.length,
                addedToQueue: addedCount,
                results
            });

            return {
                success: true,
                totalUrls: urls.length,
                addedToQueue: addedCount,
                results
            };
        } catch (error) {
            console.error('Erro ao adicionar URLs à fila:', error);
            throw error;
        }
    }

    async processBookUrl(url, userId, metadata) {
        try {
            // Registra o livro no Supabase
            const { data: book, error } = await supabase
                .from('books')
                .insert({
                    title: metadata.fileName,
                    url: url,
                    status: 'processing',
                    mime_type: metadata.contentType
                })
                .select()
                .single();

            if (error) throw error;

            // Processa o conteúdo do livro
            await bookProcessor.processBookFromUrl(url, userId);

            // Adiciona ao cache
            await cacheManager.cacheBookFromUrl(book.id, url, {
                title: metadata.fileName,
                contentType: metadata.contentType,
                size: metadata.size
            });

            // Registra como modelo
            await modelRegistry.registerBookAsModel({
                id: book.id,
                title: metadata.fileName,
                url: url,
                mime_type: metadata.contentType
            }, userId);

            return { success: true, bookId: book.id };
        } catch (error) {
            console.error('Erro ao processar URL do livro:', error);
            throw error;
        }
    }

    async getQueueStatus() {
        const [waiting, active, completed, failed] = await Promise.all([
            bookQueue.getWaitingCount(),
            bookQueue.getActiveCount(),
            bookQueue.getCompletedCount(),
            bookQueue.getFailedCount()
        ]);

        return {
            waiting,
            active,
            completed,
            failed,
            total: waiting + active + completed + failed
        };
    }

    async clearQueue() {
        await bookQueue.empty();
        await bookQueue.clean(0, 'completed');
        await bookQueue.clean(0, 'failed');
    }

    async getJobDetails(jobId) {
        const job = await bookQueue.getJob(jobId);
        if (!job) return null;

        const state = await job.getState();
        const progress = job._progress;
        const result = job.returnvalue;
        const error = job.failedReason;

        return {
            id: job.id,
            state,
            progress,
            result,
            error,
            data: job.data,
            timestamp: job.timestamp
        };
    }
}

module.exports = new BatchProcessor();