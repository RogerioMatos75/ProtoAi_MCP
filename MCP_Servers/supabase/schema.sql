-- Schema do Supabase para o ProtoAi MCP
-- Versão: 1.0.0

-- Extensões necessárias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Tabela de manifestos
CREATE TABLE IF NOT EXISTS mcp_manifests (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    manifest JSONB NOT NULL,
    version VARCHAR(50) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela de transações
CREATE TABLE IF NOT EXISTS mcp_transactions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    manifest_id UUID REFERENCES mcp_manifests(id),
    pai_amount DECIMAL(18,8) NOT NULL,
    transaction_hash VARCHAR(66),
    status VARCHAR(20) DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela de cache semântico
CREATE TABLE IF NOT EXISTS semantic_cache (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    query_hash TEXT NOT NULL,
    results JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,
    UNIQUE(query_hash)
);

-- Tabela de métricas de cache
CREATE TABLE IF NOT EXISTS cache_metrics (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    hit_type VARCHAR(10) NOT NULL CHECK (hit_type IN ('hit', 'miss')),
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    query_hash TEXT,
    execution_time_ms INTEGER
);

-- Função para atualizar o timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger para atualização automática do updated_at
CREATE TRIGGER update_mcp_manifests_updated_at
    BEFORE UPDATE ON mcp_manifests
    FOR EACH ROW
    EXECUTE PROCEDURE update_updated_at_column();

-- Índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_manifests_version ON mcp_manifests(version);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON mcp_transactions(status);
CREATE INDEX IF NOT EXISTS idx_semantic_cache_expires ON semantic_cache(expires_at);
CREATE INDEX IF NOT EXISTS idx_cache_metrics_timestamp ON cache_metrics(timestamp);

-- Policies de segurança RLS (Row Level Security)
ALTER TABLE mcp_manifests ENABLE ROW LEVEL SECURITY;
ALTER TABLE mcp_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE semantic_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE cache_metrics ENABLE ROW LEVEL SECURITY;

-- Policy para manifestos públicos
CREATE POLICY "Manifestos públicos são visíveis para todos"
    ON mcp_manifests FOR SELECT
    USING (true);

-- Policy para transações
CREATE POLICY "Transações visíveis apenas para seus criadores"
    ON mcp_transactions FOR ALL
    USING (auth.uid() = manifest_id::text::uuid);

-- Policy para métricas
CREATE POLICY "Métricas visíveis apenas para administradores"
    ON cache_metrics FOR ALL
    USING (auth.role() = 'admin');

-- Função para limpar cache expirado
CREATE OR REPLACE FUNCTION cleanup_expired_cache()
RETURNS void AS $$
BEGIN
    DELETE FROM semantic_cache WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- Função para análise de performance do cache
CREATE OR REPLACE FUNCTION analyze_cache_performance(
    start_time TIMESTAMPTZ DEFAULT (NOW() - INTERVAL '24 hours'),
    end_time TIMESTAMPTZ DEFAULT NOW()
)
RETURNS TABLE (
    total_requests BIGINT,
    hit_count BIGINT,
    miss_count BIGINT,
    hit_rate NUMERIC,
    avg_execution_time NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*) as total_requests,
        COUNT(*) FILTER (WHERE hit_type = 'hit') as hit_count,
        COUNT(*) FILTER (WHERE hit_type = 'miss') as miss_count,
        ROUND((COUNT(*) FILTER (WHERE hit_type = 'hit')::NUMERIC / COUNT(*)::NUMERIC) * 100, 2) as hit_rate,
        AVG(execution_time_ms)::NUMERIC as avg_execution_time
    FROM cache_metrics
    WHERE timestamp BETWEEN start_time AND end_time;
END;
$$ LANGUAGE plpgsql;