import os
import sys
import json
from supabase import create_client, Client
from pathlib import Path
from dotenv import load_dotenv

def load_env():
    """Carrega variáveis de ambiente do .env"""
    env_path = Path(__file__).parent / '.env'
    if not env_path.exists():
        print("❌ Arquivo .env não encontrado. Copie .env.example para .env e configure as variáveis.")
        sys.exit(1)
    load_dotenv(env_path)

def init_supabase() -> Client:
    """Inicializa conexão com Supabase"""
    url = os.getenv('SUPABASE_URL')
    key = os.getenv('SUPABASE_KEY')
    
    if not url or not key:
        print("❌ SUPABASE_URL e SUPABASE_KEY são obrigatórios no .env")
        sys.exit(1)
        
    return create_client(url, key)

def setup_database(supabase: Client):
    """Configura banco de dados executando schema.sql"""
    try:
        schema_path = Path(__file__).parent / 'supabase' / 'schema.sql'
        with open(schema_path) as f:
            schema_sql = f.read()
            
        # Executa o schema SQL
        result = supabase.postgrest.rpc('exec_sql', {'sql': schema_sql}).execute()
        print("✅ Schema do banco de dados configurado com sucesso")
        
    except Exception as e:
        print(f"❌ Erro ao configurar banco de dados: {str(e)}")
        sys.exit(1)

def register_manifest(supabase: Client):
    """Registra o manifesto readme.protobuf"""
    try:
        manifest_path = Path(__file__).parent / 'manifests' / 'readme.protobuf'
        if not manifest_path.exists():
            print("⚠️ readme.protobuf não encontrado. Será criado um manifesto padrão.")
            create_default_manifest(manifest_path)
            
        with open(manifest_path) as f:
            manifest = json.load(f)
            
        result = supabase.table('mcp_manifests').insert({
            'manifest': manifest,
            'version': manifest.get('version', '1.0.0')
        }).execute()
        
        print("✅ Manifesto registrado com sucesso")
        
    except Exception as e:
        print(f"❌ Erro ao registrar manifesto: {str(e)}")
        sys.exit(1)

def create_default_manifest(path: Path):
    """Cria um manifesto padrão se não existir"""
    default_manifest = {
        "version": "1.0.0",
        "api_name": "ProtoAi MCP API",
        "semantic_purpose": "Protocolo de comunicação semântica entre IAs e APIs",
        "auth": {
            "methods": ["JWT"],
            "requires_payment": True
        },
        "payment": {
            "token": "$PAi",
            "price_per_call": 0.001
        }
    }
    
    with open(path, 'w') as f:
        json.dump(default_manifest, f, indent=2)

def main():
    print("🚀 Iniciando setup do MCP Server...")
    
    # Carrega variáveis de ambiente
    load_env()
    print("✅ Variáveis de ambiente carregadas")
    
    # Inicializa Supabase
    supabase = init_supabase()
    print("✅ Conexão com Supabase estabelecida")
    
    # Configura banco de dados
    setup_database(supabase)
    
    # Registra manifesto
    register_manifest(supabase)
    
    print("\n✨ MCP Server configurado com sucesso!")
    print("\nPróximos passos:")
    print("1. Verifique as tabelas no Supabase")
    print("2. Ajuste o manifesto em manifests/readme.protobuf")
    print("3. Inicie o servidor MCP com 'python mcp_server.py'")

if __name__ == "__main__":
    main()