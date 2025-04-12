# 🧠 ProtoAi_MCP

O **ProtoAi MCP** (Machine Communication Protocol) é um protocolo inovador que estabelece um padrão de comunicação semântica entre Inteligências Artificiais e APIs, utilizando manifestos `readme.protobuf` para definir contratos, autenticação, monetização e direitos autorais de forma estruturada e compreensível por máquinas.

> ⚠️ Este é um projeto experimental que visa criar uma "linguagem franca" para IAs consumirem APIs de forma autônoma e segura.

## 📜 Sumário

- [🧠 ProtoAi\_MCP](#-protoai_mcp)
  - [📜 Sumário](#-sumário)
  - [📖 Visão Geral](#-visão-geral)
  - [🧠 Fluxo de Comunicação ProtoAi MCP](#-Fluxo-de-Comunicação-ProtoAi-MCP)
  - [🔄 Comunicação Semântica](#-comunicação-semântica)
    - [O Manifesto readme.protobuf](#o-manifesto-readmeprotobuf)
    - [Fluxo de Comunicação](#fluxo-de-comunicação)
  - [🛠 Estrutura do Protocolo](#-estrutura-do-protocolo)
  - [🧩 Estrutura do Projeto](#-estrutura-do-projeto)
    - [Componentes Principais](#componentes-principais)
  - [💰 Monetização com ProtoAi $PAi](#-monetização-com-protoai-pai)
    - [Objetivos do $PAi:](#objetivos-do-pai)
  - [🚀 Começando](#-começando)
    - [Pré-requisitos](#pré-requisitos)
    - [Instalação](#instalação)
  - [📚 Exemplo de Uso](#-exemplo-de-uso)
    - [1. Definindo um Manifesto](#1-definindo-um-manifesto)
    - [2. Consumindo via IA](#2-consumindo-via-ia)
  - [🔧 MCP Servers – Modelo Universal](#-mcp-servers--modelo-universal)
    - [Estrutura do MCP Server Recomendada](#estrutura-do-mcp-server-recomendada)
    - [Configuração do Ambiente `.env`](#configuração-do-ambiente-env)
    - [Funções Principais do MCP Server](#funções-principais-do-mcp-server)
    - [Integração com Supabase](#integração-com-supabase)
    - [Endpoints Principais](#endpoints-principais)
  - [🔐 Direitos Autorais e Licenciamento](#-direitos-autorais-e-licenciamento)
    - [📄 Termos de Uso:](#-termos-de-uso)
  - [👥 Contato](#-contato)

## 📖 Visão Geral

O ProtoAi MCP resolve um problema fundamental: como permitir que IAs descubram, compreendam e consumam APIs de forma autônoma, respeitando:

- Autenticação e autorização
- Direitos autorais e licenciamento
- Monetização via criptomoeda
- Rastreabilidade de uso

A missão do ProtoAi é criar uma base formal para a comunicação entre inteligências artificiais e módulos computacionais independentes, utilizando:

- Definições em Protobuf (`readme.protobuf`)
- Modularidade baseada em intenção
- Backend em Supabase para isolar o protocolo
- Suporte a tokens simbólicos de incentivo ($PAi)

O protocolo utiliza manifestos em Protocol Buffers (`.proto`) que servem como contratos semânticos auto-descritivos, permitindo que IAs:

1. Entendam as capacidades da API
2. Autentiquem-se adequadamente
3. Respeitem limites de uso
4. Realizem pagamentos quando necessário
5. Mantenham conformidade com direitos autorais

## 🧠 Fluxo de Comunicação ProtoAi MCP

```text
┌────────────────────────────┐
│       Usuário/Intenção     │
│ (Input via Drive, CLI, API)│
└────────────┬───────────────┘
             │
             ▼
     ┌──────────────────┐
     │  MCP Intention   │  ◄─── Recebe e interpreta
     └────────┬─────────┘
              │
              ▼
      ┌──────────────┐
      │ MCP Servers  │ (Supabase)
      └────┬─────────┘
           │
           ▼
    ┌──────────────┐
    │ Manifesto    │ (readme.protobuf)
    │ + Módulos    │
    └──────────────┘
           │
           ▼
    ┌──────────────┐
    │  Agentes IA  │ (Pandora, etc)
    └──────────────┘
           │
           ▼
    🔁 Resposta Inteligente
```

## 🔄 Comunicação Semântica

### O Manifesto readme.protobuf

O coração do protocolo é o manifesto `readme.protobuf`, que define:

```protobuf
message APIManifest {
    SemanticDescription semantic = 1;
    Authentication auth = 2;
    Monetization payment = 3;
    Copyright rights = 4;
    Capabilities features = 5;
}

message SemanticDescription {
    string purpose = 1;
    repeated string capabilities = 2;
    map<string, string> examples = 3;
}
```

### Fluxo de Comunicação

1. A IA descobre uma API com suporte a ProtoAi MCP
2. Lê e interpreta o manifesto `readme.protobuf`
3. Valida suas credenciais e capacidade de pagamento
4. Realiza a requisição seguindo o contrato semântico
5. Efetua pagamento se necessário (via token $PAi)

## 🛠 Estrutura do Protocolo

```
proto/
├── protoai/v1/
    ├── readme.proto      # Definição base do manifesto
    ├── auth.proto        # Protocolos de autenticação
    ├── payment.proto     # Estruturas de monetização
    └── copyright.proto   # Declarações de direitos autorais
```

## 🧩 Estrutura do Projeto

```
ProtoAi_MCP/
├── cmd/                    # Entrypoint de execução do servidor MCP
├── mcp_server/             # Conexão com Supabase (MCP Servers)
│   ├── supabase/           # Estrutura backend
│   └── readme.protobuf     # Manifesto principal do protocolo
├── core/                   # Módulos centrais do MCP
├── agents/                 # Agentes inteligentes personalizados
├── utils/                  # Utilitários de suporte (parser, loader)
└── README.md               # Este documento
```

### Componentes Principais

- **Manifesto Semântico**: Define capacidades e requisitos da API
- **Autenticação**: Métodos suportados (JWT, API Key, OAuth)
- **Monetização**: Estruturas de pagamento via $PAi
- **Direitos Autorais**: Licenças e permissões de uso

## 💰 Monetização com ProtoAi $PAi

O projeto **ProtoAi MCP** propõe uma economia simbólica baseada em uma criptomoeda fictícia chamada **ProtoAi** (símbolo: `$PAi`). Essa moeda **não possui valor real**, mas representa um modelo de incentivo entre agentes e módulos dentro do ecossistema ProtoAi.

### Objetivos do $PAi:

- Simular a circulação de valor entre módulos computacionais inteligentes
- Estabelecer prioridades e métricas de custo computacional
- Incentivar agentes a agirem conforme intenções definidas em runtime

> Nota: O $PAi é um token conceitual para demonstrar o modelo de monetização. O $PAi pode ser usado em futuras integrações reais de blockchain ou economia descentralizada, se o projeto evoluir para tal fim. 

## 🚀 Começando

### Pré-requisitos

- Protocol Buffer Compiler (protoc)
- Python 3.13+
- Go 1.21+ (opcional, para implementações em Go)

### Instalação

```bash
git clone https://github.com/RogerioMatos75/ProtoAi_MCP.git
cd ProtoAi_MCP
pip install -r requirements.txt
```

## 📚 Exemplo de Uso

### 1. Definindo um Manifesto

```protobuf
syntax = "proto3";

message APIManifest {
    string api_name = 1;
    string version = 2;
    string semantic_purpose = 3;
    
    AuthConfig auth = 4;
    PaymentConfig payment = 5;
    
    message AuthConfig {
        repeated string methods = 1;
        bool requires_payment = 2;
    }
    
    message PaymentConfig {
        string token_address = 1;
        double price_per_call = 2;
    }
}
```

### 2. Consumindo via IA

```python
# Exemplo conceitual de como uma IA consumiria a API
async def ai_consume_api(api_url: str):
    # Lê o manifesto semântico
    manifest = await read_protobuf_manifest(f"{api_url}/readme.protobuf")
    
    # Valida capacidades necessárias
    if not can_fulfill_requirements(manifest):
        return None
        
    # Realiza pagamento se necessário
    if manifest.payment.requires_payment:
        await pay_with_pai_token(manifest.payment.price_per_call)
    
    # Faz a requisição seguindo o contrato
    return await make_semantic_request(api_url, manifest)
```

## 🔧 MCP Servers – Modelo Universal

A padronização dos MCP Servers define como qualquer sistema pode isolar e validar seu próprio manifesto MCP com segurança e rastreabilidade.

O MCP Server é a implementação de referência do protocolo ProtoAi MCP, fornecendo uma forma padronizada de hospedar e gerenciar manifestos semânticos.

### Estrutura do MCP Server Recomendada

```
MCP_Servers/
├── supabase/              # Backend com Supabase
│   ├── schema.sql         # Esquema do banco de dados
│   ├── functions/         # Funções serverless
│   └── README_SUPABASE.md # Documentação do backend
├── manifests/             # Armazenamento de manifestos
│   └── readme.protobuf    # Manifesto principal
└── .env.example           # Template de configuração
```

### Configuração do Ambiente `.env`

1. **Configuração do .env**
```env
SUPABASE_URL=https://<projeto>.supabase.co
SUPABASE_KEY=chave-publica-ou-secreta
MANIFEST_TABLE=mcp_manifests
PAI_TOKEN_CONTRACT=0x...   # Endereço do contrato do token $PAi
```

2. **Inicialização do Banco**

O schema SQL para o Supabase inclui:

1. Crie uma tabela `mcp_manifests` no Supabase
2. Configure `.env` com as variáveis acima
3. Inicie com `python mcp_server/init.py`

```sql
-- Tabela de manifestos
CREATE TABLE mcp_manifests (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    manifest JSONB NOT NULL,
    version VARCHAR(50) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela de autenticação e pagamentos
CREATE TABLE mcp_transactions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    manifest_id UUID REFERENCES mcp_manifests(id),
    pai_amount DECIMAL(18,8) NOT NULL,
    transaction_hash VARCHAR(66),
    status VARCHAR(20) DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

3. **Inicialização do Servidor**

```bash
# Configure as variáveis de ambiente
cp .env.example .env
# Edite o .env com suas credenciais

# Inicie o servidor MCP
python mcp_server/init.py
```

### Funções Principais do MCP Server

1. **Registro de Manifestos**
- Validação do manifesto contra o schema protobuf
- Versionamento automático
- Geração de endpoints de descoberta

2. **Autenticação e Monetização**
- Gestão de tokens JWT para APIs
- Processamento de pagamentos em $PAi
- Tracking de uso e limites

3. **Descoberta Semântica**
- Indexação de capacidades da API
- Matching semântico de intenções
- Cache de resultados frequentes

### Integração com Supabase

O Supabase atua como backend serverless, oferecendo:

- Autenticação e autorização
- Armazenamento de manifestos
- Funções edge para processamento
- Real-time updates via websockets
- Backup e versionamento automático

### Endpoints Principais

```
POST /api/manifests      # Registra novo manifesto
GET  /api/manifests/:id  # Recupera manifesto
POST /api/discover       # Busca semântica
POST /api/transactions   # Processa pagamento
```

## 🔐 Direitos Autorais e Licenciamento

O nome **ProtoAi MCP** e sua arquitetura associada são uma criação de **Rogerio Matos** e estão em processo de registro de marca e proteção de conceito.

### 📄 Termos de Uso:

- O uso educacional e de pesquisa é **totalmente liberado**
- A reprodução com fins comerciais **exige autorização prévia**
- A marca `ProtoAi` é protegida como nomenclatura de produto e não deve ser usada em serviços concorrentes sem permissão.

## 👥 Contato

**Desenvolvido por Rogerio Matos**
- GitHub: [RogerioMatos75](https://github.com/RogerioMatos75)
- LinkedIn: [Rogerio Matos](https://www.linkedin.com/in/rogerio-matos-39045596/)
