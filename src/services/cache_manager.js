const Redis = require('ioredis');
const { supabase } = require('../config/supabase');
const axios = require('axios');
const path = require('path');

class CacheManager {
    constructor() {
        this.redis = new Redis({
            port: process.env.REDIS_PORT || 6379,
            host: process.env.REDIS_HOST || 'localhost',
            maxRetriesPerRequest: null,
            retryStrategy(times) {
                const delay = Math.min(times * 50, 2000);
                return delay;
            }
        });

        this.defaultTTL = 60 * 60; // 1 hora
        this.setupListeners();
        this.baseUrl = process.env.BOOKS_BASE_URL || '';
    }

    setupListeners() {
        this.redis.on('error', (error) => {
            console.error('Erro na conexão Redis:', error);
        });

        this.redis.on('connect', () => {
            console.log('Conectado ao Redis');
        });
    }

    async cacheBook(bookId, content, ttl = this.defaultTTL) {
        try {
            const key = `book:${bookId}`;
            const metadata = {
                content,
                cachedAt: new Date().toISOString(),
                url: content.url || `${this.baseUrl}/${content.fileName}`
            };
            
            await this.redis.setex(key, ttl, JSON.stringify(metadata));
            await this.redis.hincrby('book_stats', `${bookId}:hits`, 0);
            
            return true;
        } catch (error) {
            console.error('Erro ao cachear livro:', error);
            return false;
        }
    }

    async downloadFromUrl(url) {
        try {
            const response = await axios.get(url, {
                responseType: 'arraybuffer',
                timeout: 30000 // 30 segundos timeout
            });
            
            return {
                content: response.data,
                contentType: response.headers['content-type'],
                fileName: path.basename(url)
            };
        } catch (error) {
            console.error('Erro ao baixar arquivo da URL:', error);
            throw error;
        }
    }

    async cacheBookFromUrl(bookId, url, metadata = {}) {
        try {
            const fileData = await this.downloadFromUrl(url);
            const content = {
                ...metadata,
                url,
                fileName: fileData.fileName,
                contentType: fileData.contentType,
                size: fileData.content.length
            };

            return await this.cacheBook(bookId, content);
        } catch (error) {
            console.error('Erro ao cachear livro da URL:', error);
            return false;
        }
    }

    async getCachedBook(bookId) {
        try {
            const key = `book:${bookId}`;
            const cached = await this.redis.get(key);
            
            if (cached) {
                await this.redis.hincrby('book_stats', `${bookId}:hits`, 1);
                return JSON.parse(cached);
            }
            
            return null;
        } catch (error) {
            console.error('Erro ao recuperar livro do cache:', error);
            return null;
        }
    }

    async invalidateCache(bookId) {
        try {
            const key = `book:${bookId}`;
            await this.redis.del(key);
            return true;
        } catch (error) {
            console.error('Erro ao invalidar cache:', error);
            return false;
        }
    }

    async getPopularBooks(limit = 10) {
        try {
            const stats = await this.redis.hgetall('book_stats');
            
            const sortedBooks = Object.entries(stats)
                .filter(([key]) => key.endsWith(':hits'))
                .map(([key, hits]) => ({
                    bookId: key.split(':')[0],
                    hits: parseInt(hits)
                }))
                .sort((a, b) => b.hits - a.hits)
                .slice(0, limit);

            const bookIds = sortedBooks.map(book => book.bookId);
            const { data: books } = await supabase
                .from('books')
                .select('*')
                .in('id', bookIds);

            return sortedBooks.map(stat => ({
                ...stat,
                details: books.find(book => book.id === stat.bookId)
            }));
        } catch (error) {
            console.error('Erro ao obter livros populares:', error);
            return [];
        }
    }

    async warmupCache() {
        try {
            const popularBooks = await this.getPopularBooks(5);
            
            for (const book of popularBooks) {
                const { data } = await supabase
                    .from('books')
                    .select('*')
                    .eq('id', book.bookId)
                    .single();

                if (data && data.url) {
                    await this.cacheBookFromUrl(book.bookId, data.url, {
                        title: data.title,
                        author: data.author,
                        description: data.description
                    });
                }
            }

            return true;
        } catch (error) {
            console.error('Erro ao pré-carregar cache:', error);
            return false;
        }
    }

    async getCacheStats() {
        try {
            const info = await this.redis.info();
            const stats = await this.redis.hgetall('book_stats');
            
            const bookStats = Object.entries(stats)
                .filter(([key]) => key.endsWith(':hits'))
                .map(([key, hits]) => ({
                    bookId: key.split(':')[0],
                    hits: parseInt(hits)
                }));

            return {
                totalBooks: bookStats.length,
                totalHits: bookStats.reduce((acc, curr) => acc + curr.hits, 0),
                popularBooks: bookStats
                    .sort((a, b) => b.hits - a.hits)
                    .slice(0, 5),
                redisInfo: info
            };
        } catch (error) {
            console.error('Erro ao obter estatísticas do cache:', error);
            return null;
        }
    }

    async clearCache() {
        try {
            await this.redis.flushdb();
            return true;
        } catch (error) {
            console.error('Erro ao limpar cache:', error);
            return false;
        }
    }

    async validateUrl(url) {
        try {
            const response = await axios.head(url);
            return {
                valid: true,
                contentType: response.headers['content-type'],
                contentLength: response.headers['content-length']
            };
        } catch (error) {
            return {
                valid: false,
                error: error.message
            };
        }
    }

    async close() {
        await this.redis.quit();
    }
}

module.exports = new CacheManager();