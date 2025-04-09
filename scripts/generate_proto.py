import os
import subprocess
import sys
from pathlib import Path

def check_protoc():
    try:
        subprocess.run(['protoc', '--version'], check=True, capture_output=True)
        return True
    except (subprocess.CalledProcessError, FileNotFoundError):
        print("Erro: protoc não está instalado. Por favor, instale-o primeiro.")
        print("Visite: https://github.com/protocolbuffers/protobuf/releases")
        return False

def main():
    # Diretório do projeto
    project_dir = Path(__file__).parent.parent.absolute()
    proto_dir = project_dir / 'proto'
    output_dir = project_dir / 'peup' / 'proto'

    # Criar diretório de saída se não existir
    output_dir.mkdir(parents=True, exist_ok=True)

    # Verificar se protoc está instalado
    if not check_protoc():
        sys.exit(1)

    # Gerar código Python
    proto_file = proto_dir / 'protoai' / 'v1' / 'readme.proto'
    cmd = [
        'protoc',
        f'--proto_path={proto_dir}',
        f'--python_out={output_dir}',
        str(proto_file)
    ]

    try:
        subprocess.run(cmd, check=True)
        print(f"Código gerado com sucesso em: {output_dir}")
        
        # Criar arquivo __init__.py para tornar o diretório um pacote Python
        init_file = output_dir / '__init__.py'
        init_file.touch()
        
    except subprocess.CalledProcessError as e:
        print(f"Erro ao gerar código: {e}")
        sys.exit(1)

if __name__ == '__main__':
    main()