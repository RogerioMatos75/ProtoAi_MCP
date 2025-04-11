-- Habilita a extensão UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enable pgvector extension for semantic search
CREATE EXTENSION IF NOT EXISTS vector;

-- Enum types
CREATE TYPE book_status AS ENUM ('available', 'processing', 'archived');
CREATE TYPE monetization_type AS ENUM ('free', 'pay_per_use', 'subscription');
CREATE TYPE license_type AS ENUM ('MIT', 'Apache-2.0', 'GPL-3.0', 'proprietary', 'custom');

-- Tabela de modelos
CREATE TABLE IF NOT EXISTS models (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    manifest JSONB NOT NULL,
    capabilities TEXT[] NOT NULL DEFAULT '{}',
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de conexões entre modelos
CREATE TABLE IF NOT EXISTS model_connections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    source_model_id UUID REFERENCES models(id),
    target_model_id UUID REFERENCES models(id),
    intent TEXT NOT NULL,
    connection_params JSONB,
    status TEXT NOT NULL DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de histórico de interações
CREATE TABLE IF NOT EXISTS interaction_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    connection_id UUID REFERENCES model_connections(id),
    interaction_type TEXT NOT NULL,
    request_data JSONB,
    response_data JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Books table
CREATE TABLE books (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    author TEXT NOT NULL,
    description TEXT,
    drive_file_id TEXT UNIQUE NOT NULL,
    status book_status NOT NULL DEFAULT 'available',
    content_vector VECTOR(1536),  -- Para busca semântica
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ReadmeProto table (manifesto do serviço)
CREATE TABLE readme_protos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    intent TEXT NOT NULL,
    name TEXT NOT NULL,
    version TEXT NOT NULL,
    description TEXT,
    tags TEXT[],
    monetization_type monetization_type NOT NULL DEFAULT 'free',
    license_type license_type NOT NULL DEFAULT 'MIT',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Communication details table
CREATE TABLE communication_details (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    readme_proto_id UUID REFERENCES readme_protos(id) ON DELETE CASCADE,
    base_url TEXT NOT NULL,
    available_methods TEXT[],
    default_data_formats TEXT[],
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Security configurations
CREATE TABLE security_configs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    readme_proto_id UUID REFERENCES readme_protos(id) ON DELETE CASCADE,
    encryption_required BOOLEAN DEFAULT TRUE,
    auth_type TEXT NOT NULL DEFAULT 'jwt',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Transactions table for monetization
CREATE TABLE transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    book_id UUID REFERENCES books(id) ON DELETE RESTRICT,
    user_id UUID NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User permissions
CREATE TABLE user_permissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    book_id UUID REFERENCES books(id) ON DELETE CASCADE,
    permission_level TEXT NOT NULL DEFAULT 'read',
    valid_until TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Audit logs
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID,
    action TEXT NOT NULL,
    resource_type TEXT NOT NULL,
    resource_id UUID,
    metadata JSONB,
    ip_address TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Função para atualizar o timestamp de atualização
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE 'plpgsql';

-- Funções
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Função para buscar livros semanticamente similares
CREATE OR REPLACE FUNCTION match_books(
    query_embedding vector(1536),
    match_threshold float,
    match_count int
)
RETURNS TABLE (
    id uuid,
    title text,
    author text,
    description text,
    similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        b.id,
        b.title,
        b.author,
        b.description,
        1 - (b.content_vector <=> query_embedding) as similarity
    FROM books b
    WHERE 1 - (b.content_vector <=> query_embedding) > match_threshold
    AND b.status = 'available'
    ORDER BY similarity DESC
    LIMIT match_count;
END;
$$;

-- Função para recomendar livros baseado em histórico
CREATE OR REPLACE FUNCTION recommend_books(
    user_id uuid,
    recommendation_count int DEFAULT 5
)
RETURNS TABLE (
    id uuid,
    title text,
    author text,
    description text,
    score float
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    WITH user_books AS (
        SELECT b.content_vector
        FROM books b
        INNER JOIN user_permissions up ON b.id = up.book_id
        WHERE up.user_id = recommend_books.user_id
        ORDER BY up.created_at DESC
        LIMIT 3
    ),
    avg_embedding AS (
        SELECT avg(content_vector) as avg_vector
        FROM user_books
    )
    SELECT
        b.id,
        b.title,
        b.author,
        b.description,
        1 - (b.content_vector <=> avg.avg_vector) as score
    FROM books b, avg_embedding avg
    WHERE b.status = 'available'
    AND NOT EXISTS (
        SELECT 1
        FROM user_permissions up
        WHERE up.book_id = b.id
        AND up.user_id = recommend_books.user_id
    )
    ORDER BY score DESC
    LIMIT recommendation_count;
END;
$$;

-- Função para atualizar embedding de livro
CREATE OR REPLACE FUNCTION update_book_embedding(
    book_id uuid,
    new_embedding vector(1536)
)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
    UPDATE books
    SET content_vector = new_embedding,
        updated_at = NOW()
    WHERE id = book_id;
END;
$$;

-- Trigger para registrar alterações em livros na auditoria
CREATE OR REPLACE FUNCTION log_book_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    INSERT INTO audit_logs (
        user_id,
        action,
        resource_type,
        resource_id,
        metadata
    )
    VALUES (
        auth.uid(),
        CASE
            WHEN TG_OP = 'INSERT' THEN 'CREATE'
            WHEN TG_OP = 'UPDATE' THEN 'UPDATE'
            WHEN TG_OP = 'DELETE' THEN 'DELETE'
        END,
        'book',
        COALESCE(NEW.id, OLD.id),
        jsonb_build_object(
            'title', COALESCE(NEW.title, OLD.title),
            'author', COALESCE(NEW.author, OLD.author),
            'status', COALESCE(NEW.status::text, OLD.status::text)
        )
    );
    RETURN COALESCE(NEW, OLD);
END;
$$;

-- Triggers para atualização automática dos timestamps
CREATE TRIGGER update_models_modtime
    BEFORE UPDATE ON models
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_connections_modtime
    BEFORE UPDATE ON model_connections
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_timestamp
    BEFORE UPDATE ON books
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER set_timestamp_readme
    BEFORE UPDATE ON readme_protos
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

-- Aplicar trigger de auditoria
DROP TRIGGER IF EXISTS book_audit_trigger ON books;
CREATE TRIGGER book_audit_trigger
    AFTER INSERT OR UPDATE OR DELETE
    ON books
    FOR EACH ROW
    EXECUTE FUNCTION log_book_changes();

-- Índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_models_capabilities ON models USING GIN (capabilities);
CREATE INDEX IF NOT EXISTS idx_connections_source ON model_connections(source_model_id);
CREATE INDEX IF NOT EXISTS idx_connections_target ON model_connections(target_model_id);
CREATE INDEX IF NOT EXISTS idx_interaction_connection ON interaction_history(connection_id);
CREATE INDEX books_content_vector_idx ON books USING ivfflat (content_vector vector_cosine_ops);
CREATE INDEX books_status_idx ON books(status);
CREATE INDEX transactions_user_id_idx ON transactions(user_id);
CREATE INDEX transactions_status_idx ON transactions(status);
CREATE INDEX user_permissions_user_book_idx ON user_permissions(user_id, book_id);

-- RLS (Row Level Security) Policies
ALTER TABLE books ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_permissions ENABLE ROW LEVEL SECURITY;

-- Policies for books
CREATE POLICY "Public books are viewable by everyone"
ON books FOR SELECT
USING (status = 'available');

CREATE POLICY "Users can view their purchased books"
ON books FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM user_permissions
        WHERE book_id = books.id
        AND user_id = auth.uid()
        AND valid_until > NOW()
    )
);

-- Policies for transactions
CREATE POLICY "Users can view their own transactions"
ON transactions FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Users can create their own transactions"
ON transactions FOR INSERT
WITH CHECK (user_id = auth.uid());

-- Policies for permissions
CREATE POLICY "Users can view their own permissions"
ON user_permissions FOR SELECT
USING (user_id = auth.uid());