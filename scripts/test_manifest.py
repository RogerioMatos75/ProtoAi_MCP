import json
import sys
from pathlib import Path
from typing import Dict, Any, List
import requests

class ManifestValidator:
    def __init__(self, manifest_path: Path):
        self.manifest_path = manifest_path
        self.manifest: Dict[str, Any] = {}
        self.errors: List[str] = []
        
    def load_manifest(self) -> bool:
        """Carrega e valida o manifesto"""
        try:
            with open(self.manifest_path) as f:
                self.manifest = json.load(f)
            return True
        except json.JSONDecodeError as e:
            self.errors.append(f"Erro de JSON: {str(e)}")
            return False
        except Exception as e:
            self.errors.append(f"Erro ao ler manifesto: {str(e)}")
            return False

    def validate_required_fields(self) -> bool:
        """Valida campos obrigatórios do manifesto"""
        required_fields = [
            "version",
            "api_name",
            "semantic_purpose",
            "auth",
            "payment",
            "capabilities"
        ]
        
        missing = [field for field in required_fields if field not in self.manifest]
        if missing:
            self.errors.append(f"Campos obrigatórios faltando: {', '.join(missing)}")
            return False
            
        return True

    def validate_auth_config(self) -> bool:
        """Valida configuração de autenticação"""
        auth = self.manifest.get("auth", {})
        if not isinstance(auth.get("methods"), list):
            self.errors.append("auth.methods deve ser uma lista")
            return False
            
        if "requires_payment" not in auth:
            self.errors.append("auth.requires_payment é obrigatório")
            return False
            
        return True

    def validate_payment_config(self) -> bool:
        """Valida configuração de pagamento"""
        payment = self.manifest.get("payment", {})
        required = ["token", "price_per_call"]
        
        missing = [field for field in required if field not in payment]
        if missing:
            self.errors.append(f"Campos de pagamento faltando: {', '.join(missing)}")
            return False
            
        if payment.get("token") != "$PAi":
            self.errors.append("Token de pagamento deve ser $PAi")
            return False
            
        return True

    def validate_capabilities(self) -> bool:
        """Valida capacidades declaradas"""
        caps = self.manifest.get("capabilities", {})
        required_caps = [
            "semantic_discovery",
            "auto_authentication",
            "payment_processing"
        ]
        
        missing = [cap for cap in required_caps if cap not in caps]
        if missing:
            self.errors.append(f"Capacidades obrigatórias faltando: {', '.join(missing)}")
            return False
            
        return True

    def test_manifest_registration(self) -> bool:
        """Testa registro do manifesto no MCP Server"""
        try:
            response = requests.post(
                "http://localhost:8080/api/manifests",
                json=self.manifest
            )
            
            if response.status_code != 200:
                self.errors.append(f"Erro ao registrar manifesto: {response.text}")
                return False
                
            print("✅ Manifesto registrado com sucesso")
            return True
            
        except Exception as e:
            self.errors.append(f"Erro na requisição: {str(e)}")
            return False

    def validate_all(self) -> bool:
        """Executa todas as validações"""
        validations = [
            self.load_manifest,
            self.validate_required_fields,
            self.validate_auth_config,
            self.validate_payment_config,
            self.validate_capabilities
        ]
        
        success = all(validation() for validation in validations)
        
        if success:
            print("✅ Manifesto válido!")
            return self.test_manifest_registration()
        else:
            print("❌ Manifesto inválido:")
            for error in self.errors:
                print(f"  - {error}")
            return False

def main():
    manifest_path = Path(__file__).parent.parent / "MCP_Servers" / "manifests" / "readme.protobuf"
    
    if not manifest_path.exists():
        print(f"❌ Manifesto não encontrado em {manifest_path}")
        sys.exit(1)
        
    validator = ManifestValidator(manifest_path)
    success = validator.validate_all()
    
    sys.exit(0 if success else 1)

if __name__ == "__main__":
    main()