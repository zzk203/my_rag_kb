from datetime import datetime
from typing import Optional

from pydantic import BaseModel


class CollectionCreate(BaseModel):
    name: str
    description: str = ""
    embedding_model: str = "text-embedding-3-small"
    llm_model: str = "gpt-4o-mini"
    provider: str = "openai"


class CollectionUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    embedding_model: Optional[str] = None
    llm_model: Optional[str] = None
    provider: Optional[str] = None


class CollectionOut(BaseModel):
    id: int
    name: str
    description: str
    embedding_model: str
    llm_model: str
    provider: str
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class CollectionStats(BaseModel):
    id: int
    name: str
    doc_count: int = 0
    chunk_count: int = 0
    storage_size: int = 0
