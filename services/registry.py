from typing import List, Dict, Any, Optional
from models.intent import Intent, IntentResponse
import httpx
import logging

class RegistryService:
    def __init__(self, mcp_url: str = "http://localhost:8000"):
        self.mcp_url = mcp_url
        self.logger = logging.getLogger(__name__)

    async def discover_services(self, tags: Optional[List[str]] = None) -> List[Dict[str, Any]]:
        """Descobre serviços baseado em tags usando o MCP"""
        try:
            params = {}
            if tags:
                params['tags'] = ','.join(tags)
            
            async with httpx.AsyncClient() as client:
                response = await client.get(f"{self.mcp_url}/search", params=params)
                response.raise_for_status()
                return response.json()['results']
        except Exception as e:
            self.logger.error(f"Erro na descoberta de serviços: {str(e)}")
            return []

    async def process_intent(self, intent: Intent) -> IntentResponse:
        """Processa uma intenção recebida"""
        try:
            if intent.type == "discovery":
                services = await self.discover_services(intent.tags)
                return IntentResponse(
                    success=True,
                    message="Serviços encontrados com sucesso",
                    data={"services": services}
                )
            
            elif intent.type == "execution":
                # TODO: Implementar lógica de execução
                # Aqui você implementaria a lógica para executar
                # a operação no serviço descoberto
                return IntentResponse(
                    success=False,
                    message="Execução de operações ainda não implementada",
                    error="Not implemented"
                )
            
            elif intent.type == "registration":
                # TODO: Implementar lógica de registro
                return IntentResponse(
                    success=False,
                    message="Registro de serviços ainda não implementado",
                    error="Not implemented"
                )
            
            else:
                return IntentResponse(
                    success=False,
                    message="Tipo de intenção não suportado",
                    error="Invalid intent type"
                )

        except Exception as e:
            self.logger.error(f"Erro no processamento da intenção: {str(e)}")
            return IntentResponse(
                success=False,
                message="Erro no processamento da intenção",
                error=str(e)
            )