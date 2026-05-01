from datetime import datetime
from typing import Optional

from pydantic import BaseModel


class CollectionCreate(BaseModel):
    name: str
    description: str = ""
    provider: Optional[str] = None
    api_key: Optional[str] = None
    base_url: Optional[str] = None
    llm_model: Optional[str] = None
    embedding_model: Optional[str] = None
    max_history: int = 6
    ocr_enabled: bool = False


class CollectionUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    provider: Optional[str] = None
    api_key: Optional[str] = None
    base_url: Optional[str] = None
    llm_model: Optional[str] = None
    embedding_model: Optional[str] = None
    max_history: Optional[int] = None
    ocr_enabled: Optional[bool] = None


class CollectionOut(BaseModel):
    id: int
    name: str
    description: str
    provider: str
    api_key: Optional[str] = None
    base_url: Optional[str] = None
    llm_model: str
    embedding_model: str
    max_history: int = 6
    ocr_enabled: bool = False
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class CollectionStats(BaseModel):
    id: int
    name: str
    doc_count: int = 0
    chunk_count: int = 0
    storage_size: int = 0
