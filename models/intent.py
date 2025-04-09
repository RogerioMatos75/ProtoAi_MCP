from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from enum import Enum

class IntentType(str, Enum):
    DISCOVERY = "discovery"  # Intenção de descoberta de serviços
    EXECUTION = "execution"  # Intenção de execução de operação
    REGISTRATION = "registration"  # Intenção de registro de serviço

class Intent(BaseModel):
    type: IntentType
    service_name: Optional[str] = None  # Nome do serviço alvo
    operation: Optional[str] = None  # Operação desejada
    parameters: Optional[Dict[str, Any]] = None  # Parâmetros da operação
    context: Optional[Dict[str, Any]] = None  # Contexto adicional
    tags: Optional[List[str]] = None  # Tags para descoberta

class IntentResponse(BaseModel):
    success: bool
    message: str
    data: Optional[Dict[str, Any]] = None
    error: Optional[str] = None