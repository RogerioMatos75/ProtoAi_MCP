#!/bin/bash

# Diretório do projeto
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/.."
PROTO_DIR="${PROJECT_DIR}/proto"
GEN_DIR="${PROJECT_DIR}/gen"

# Criar diretório gen se não existir
mkdir -p "${GEN_DIR}"

# Verificar se buf está instalado
if ! command -v buf &> /dev/null; then
    echo "Erro: buf não está instalado. Por favor, instale-o primeiro."
    echo "Visite: https://docs.buf.build/installation"
    exit 1
}

# Navegar para o diretório proto
cd "${PROTO_DIR}" || exit 1

# Limpar arquivos gerados anteriormente
rm -rf "${GEN_DIR}/proto"

# Gerar código usando buf
echo "Gerando código a partir dos arquivos .proto..."
buf generate

echo "Código gerado com sucesso em: ${GEN_DIR}/proto"