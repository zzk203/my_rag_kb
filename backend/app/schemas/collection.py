from datetime import datetime
from typing import Optional

from pydantic import BaseModel


class CollectionCreate(BaseModel):
    name: str
    description: str = ""
    provider: str = "openai"
    api_key: Optional[str] = None
    base_url: Optional[str] = None
    llm_model: str = "gpt-4o-mini"
    embedding_model: str = "text-embedding-3-small"


class CollectionUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    provider: Optional[str] = None
    api_key: Optional[str] = None
    base_url: Optional[str] = None
    llm_model: Optional[str] = None
    embedding_model: Optional[str] = None


class CollectionOut(BaseModel):
    id: int
    name: str
    description: str
    provider: str
    api_key: Optional[str] = None
    base_url: Optional[str] = None
    llm_model: str
    embedding_model: str
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class CollectionStats(BaseModel):
    id: int
    name: str
    doc_count: int = 0
    chunk_count: int = 0
    storage_size: int = 0
