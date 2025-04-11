# Integração Supabase - ProtoAi MCP

## 📋 Visão Geral

O Supabase atua como backend serverless para o ProtoAi MCP, fornecendo:
- Armazenamento seguro de manifestos
- Autenticação e autorização
- Processamento de transações $PAi
- Cache semântico de consultas
- Auditoria de uso

## 🗄️ Estrutura do Banco

### Tabelas Principais

1. **mcp_manifests**
   - Armazena manifestos readme.protobuf
   - Controle de versão automático
   - Suporte a consultas semânticas

2. **mcp_transactions**
   - Registro de transações $PAi
   - Rastreamento de uso da API
   - Estado das transações

3. **semantic_cache**
   - Cache de consultas semânticas
   - Expiração automática
   - Otimização de performance

## 🔐 Segurança

### Row Level Security (RLS)
- Manifestos: Leitura pública, escrita autenticada
- Transações: Visíveis apenas para participantes
- Cache: Gerenciado pelo sistema

### Políticas de Acesso
```sql
-- Exemplo de política para manifestos
CREATE POLICY "public_manifests" ON mcp_manifests
FOR SELECT USING (true);
```

## 🚀 Funções Edge

Localizadas em `/functions`:
- `process_payment.ts`: Processa pagamentos $PAi
- `semantic_search.ts`: Busca semântica em manifestos
- `cache_manager.ts`: Gerencia cache semântico

## 📦 Webhooks

1. **Transações**
   - Endpoint: `/hooks/transactions`
   - Gatilhos: create, update
   - Ações: Notificação, Atualização de saldo

2. **Manifestos**
   - Endpoint: `/hooks/manifests`
   - Gatilhos: version_change
   - Ações: Atualização de cache

## 🛠️ Setup Local

1. Instale CLI do Supabase:
```bash
npm install -g supabase
```

2. Configure projeto:
```bash
supabase init
supabase start
```

3. Execute migrations:
```bash
supabase db reset
```

## 📝 Variáveis de Ambiente

```env
SUPABASE_URL=sua_url
SUPABASE_KEY=sua_chave
SUPABASE_JWT_SECRET=seu_jwt_secret
```

## 🔄 Manutenção

### Limpeza de Cache
- Executado diariamente via cron
- Função: `cleanup_expired_cache()`

### Backup
- Automático: A cada 24h
- Manual: Via CLI do Supabase
```bash
supabase db dump
```