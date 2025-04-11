const { createClient } = require('@supabase/supabase-js');
const { Pool } = require('pg');
const { OpenAIEmbeddings } = require('langchain/embeddings/openai');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

// Verifica se as variáveis de ambiente necessárias estão definidas
const requiredEnvVars = ['DATABASE_URL', 'DIRECT_URL', 'SUPABASE_URL', 'SUPABASE_KEY', 'OPENAI_API_KEY'];
const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);

if (missingEnvVars.length > 0) {
    throw new Error(`Variáveis de ambiente ausentes: ${missingEnvVars.join(', ')}`);
}

// Configuração do pool PostgreSQL
const poolConfig = {
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    }
};

// Criação do pool de conexões
const pool = new Pool(poolConfig);

// Configuração do Supabase
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const openAIKey = process.env.OPENAI_API_KEY;

const embeddings = new OpenAIEmbeddings({ openAIApiKey: openAIKey });

const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: {
        persistSession: false
    }
});

// Função para criar embedding
async function createEmbedding(text) {
    const embedding = await embeddings.embedQuery(text);
    return embedding;
}

// Função para busca semântica
async function semanticSearch(query, limit = 5) {
    const embedding = await createEmbedding(query);
    
    const { data, error } = await supabase.rpc('match_books', {
        query_embedding: embedding,
        match_threshold: 0.7,
        match_count: limit
    });

    if (error) throw error;
    return data;
}

// Função para inserir livro
async function insertBook(bookData) {
    const embedding = await createEmbedding(bookData.description);
    
    const { data, error } = await supabase
        .from('books')
        .insert({
            ...bookData,
            content_vector: embedding
        })
        .select();

    if (error) throw error;
    return data;
}

// Função para criar transação
async function createTransaction(userId, bookId, amount) {
    const { data, error } = await supabase
        .from('transactions')
        .insert({
            user_id: userId,
            book_id: bookId,
            amount: amount,
            status: 'pending'
        })
        .select();

    if (error) throw error;
    return data;
}

// Função para conceder acesso ao livro
async function grantBookAccess(userId, bookId, validityDays = 30) {
    const validUntil = new Date();
    validUntil.setDate(validUntil.getDate() + validityDays);

    const { data, error } = await supabase
        .from('user_permissions')
        .insert({
            user_id: userId,
            book_id: bookId,
            permission_level: 'read',
            valid_until: validUntil.toISOString()
        })
        .select();

    if (error) throw error;
    return data;
}

// Função para registrar auditoria
async function logAudit(userId, action, resourceType, resourceId, metadata = {}) {
    const { data, error } = await supabase
        .from('audit_logs')
        .insert({
            user_id: userId,
            action,
            resource_type: resourceType,
            resource_id: resourceId,
            metadata,
            ip_address: null // Será preenchido pelo middleware
        });

    if (error) throw error;
    return data;
}

// Função para testar a conexão
async function testConnection() {
    try {
        console.log('🔍 Testando conexão pool PostgreSQL...');
        const poolClient = await pool.connect();
        const result = await poolClient.query('SELECT NOW()');
        poolClient.release();
        console.log('✅ Conexão pool PostgreSQL OK:', result.rows[0].now);
        
        console.log('🔍 Testando conexão Supabase...');
        const { data, error } = await supabase
            .from('models')
            .select('count')
            .single();
        
        if (error) {
            console.error('❌ Erro ao conectar com Supabase:', error.message);
            return false;
        }
        
        console.log('✅ Conexão Supabase OK!');
        console.log('📊 Dados recebidos:', data);
        return true;
    } catch (error) {
        console.error('❌ Erro ao testar conexões:', error.message);
        if (error.stack) {
            console.error('Stack:', error.stack);
        }
        return false;
    }
}

module.exports = {
    pool,
    supabase,
    testConnection,
    semanticSearch,
    insertBook,
    createTransaction,
    grantBookAccess,
    logAudit
};