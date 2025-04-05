from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
from google.protobuf import timestamp_pb2
import json
import csv
import logging
from datetime import datetime

# Configuração do logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)

app = FastAPI(
    title="ProtoAi MCP API",
    description="API para acesso ao manifesto semântico e descoberta do ProtoAi MCP",
    version="1.0.0"
)

# Configuração do CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Permite todas as origens em ambiente de desenvolvimento
    allow_credentials=True,
    allow_methods=["*"],  # Permite todos os métodos
    allow_headers=["*"],  # Permite todos os headers
)

# Modelos Pydantic que refletem a estrutura do README.protobuf
class ProjectInfo(BaseModel):
    name: str
    version: str
    description: str
    repository: str
    tags: List[str]
    owner: str
    license: str

class AccessInterface(BaseModel):
    type: int
    base_url_or_address: str
    description: str
    spec_url: str
    available_methods_or_operations: List[str]
    available_events: List[str]
    data_formats: List[str]
    preferred_protocol_version: str

class CommunicationDetails(BaseModel):
    access_interfaces: List[AccessInterface]
    default_data_formats: List[str]

class SecurityInfo(BaseModel):
    encryption_required: bool
    auth_reference: str
    permissions_reference: str
    ignore_reference: str
    high_level_security_policies: List[str]

class Documentation(BaseModel):
    human_readme_link: str
    api_reference_link: str
    contact_email: str

class UpdatePolicy(BaseModel):
    versioning_scheme: str
    changelog_link: str
    update_check_endpoint: str

class ComplianceReference(BaseModel):
    compliance_proto_reference: str

class ReadmeProto(BaseModel):
    project_info: ProjectInfo
    communication_details: CommunicationDetails
    security_info: SecurityInfo
    documentation: Documentation
    update_policy: UpdatePolicy
    compliance_ref: ComplianceReference

@app.get("/protoai/readme.protobuf", response_model=ReadmeProto)
async def get_readme_protobuf():
    # Exemplo de dados do manifesto
    return {
        "project_info": {
            "name": "ProtoAi MCP",
            "version": "1.0.0",
            "description": "Sistema de Manifesto e Descoberta para APIs",
            "repository": "https://github.com/user/protoai-mcp",
            "tags": ["api", "discovery", "semantic-manifest"],
            "owner": "ProtoAi Team",
            "license": "MIT"
        },
        "communication_details": {
            "access_interfaces": [
                {
                    "type": 2,  # REST_HTTP
                    "base_url_or_address": "http://localhost:8000",
                    "description": "REST API principal",
                    "spec_url": "http://localhost:8000/docs",
                    "available_methods_or_operations": ["/protoai/readme.protobuf", "/search"],
                    "available_events": [],
                    "data_formats": ["json"],
                    "preferred_protocol_version": "HTTP/1.1"
                }
            ],
            "default_data_formats": ["json", "protobuf"]
        },
        "security_info": {
            "encryption_required": True,
            "auth_reference": "./auth.proto",
            "permissions_reference": "./permissions.proto",
            "ignore_reference": "./ignore.proto",
            "high_level_security_policies": ["JWT Bearer Token Required"]
        },
        "documentation": {
            "human_readme_link": "https://github.com/user/protoai-mcp/README.md",
            "api_reference_link": "http://localhost:8000/docs",
            "contact_email": "contact@protoai.example.com"
        },
        "update_policy": {
            "versioning_scheme": "semantic",
            "changelog_link": "https://github.com/user/protoai-mcp/CHANGELOG.md",
            "update_check_endpoint": "/version"
        },
        "compliance_ref": {
            "compliance_proto_reference": "./compliance.proto"
        }
    }

class SearchQuery(BaseModel):
    query: Optional[str] = None
    tags: Optional[List[str]] = None
    owner: Optional[str] = None
    license: Optional[str] = None

class SearchResult(BaseModel):
    name: str
    description: str
    url: str
    tags: List[str]
    owner: str
    license: str
    version: str

class SearchResponse(BaseModel):
    results: List[SearchResult]
    total_count: int
    query_timestamp: str

@app.get("/search", response_model=SearchResponse)
async def search_repositories(
    q: Optional[str] = Query(None, description="Termo de busca geral"),
    tags: Optional[str] = Query(None, description="Tags separadas por vírgula"),
    owner: Optional[str] = Query(None, description="Nome do proprietário"),
    license: Optional[str] = Query(None, description="Tipo de licença")
):
    logging.info(f"Busca iniciada - query: {q}, tags: {tags}, owner: {owner}, license: {license}")
    
    results = []
    with open('api/repositories.csv', 'r', encoding='utf-8') as file:
        reader = csv.DictReader(file)
        for row in reader:
            # Converte a string de tags em lista
            row_tags = [tag.strip() for tag in row['tags'].strip('"').split(',')]
            
            # Aplica os filtros
            matches = True
            if q and not (q.lower() in row['name'].lower() or q.lower() in row['description'].lower()):
                matches = False
            if tags:
                search_tags = [tag.strip() for tag in tags.split(',')]
                if not any(tag in row_tags for tag in search_tags):
                    matches = False
            if owner and owner.lower() not in row['owner'].lower():
                matches = False
            if license and license.lower() not in row['license'].lower():
                matches = False
                
            if matches:
                results.append(SearchResult(
                    name=row['name'],
                    description=row['description'],
                    url=row['url'],
                    tags=row_tags,
                    owner=row['owner'],
                    license=row['license'],
                    version=row['version']
                ))
    
    response = SearchResponse(
        results=results,
        total_count=len(results),
        query_timestamp=datetime.now().isoformat()
    )
    
    logging.info(f"Busca concluída - {len(results)} resultados encontrados")
    return response

@app.get("/")
async def root():
    return {"message": "Bem-vindo à API do ProtoAi MCP"}