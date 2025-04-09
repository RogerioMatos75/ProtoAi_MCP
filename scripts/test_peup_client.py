import httpx
import json
from typing import Dict, Any

def send_intent_to_peup(intent: Dict[str, Any]) -> Dict[str, Any]:
    """Envia uma intenção PIS para o PEUP e retorna a resposta."""
    peup_url = "http://127.0.0.1:8000/intent"
    
    try:
        with httpx.Client() as client:
            response = client.post(peup_url, json=intent)
            response.raise_for_status()
            return response.json()
    except httpx.HTTPError as e:
        print(f"Erro ao enviar intenção para o PEUP: {e}")
        return {"error": str(e)}

def main():
    # Exemplo de intenção PIS para busca de repositórios
    intent = {
        "type": "discovery",
        "scope": "repositorio_git",
        "action": "BUSCAR",
        "parameters": {
            "query": "machine learning",
            "language": "python",
            "stars": ">=100"
        },
        "response_format": "json"
    }
    
    print("\nEnviando intenção para o PEUP:")
    print(json.dumps(intent, indent=2))
    
    # Envia a intenção e recebe a resposta
    response = send_intent_to_peup(intent)
    
    print("\nResposta recebida:")
    print(json.dumps(response, indent=2))

if __name__ == "__main__":
    main()