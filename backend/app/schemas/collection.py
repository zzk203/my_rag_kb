from datetime import datetime
from typing import Literal, Optional

from pydantic import BaseModel, Field


class CollectionCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    description: str = Field(default="", max_length=500)
    provider: Optional[Literal["openai", "ollama"]] = None
    api_key: Optional[str] = None
    base_url: Optional[str] = Field(default=None, max_length=500)
    embedding_provider: Optional[Literal["openai", "ollama"]] = None
    embedding_api_key: Optional[str] = None
    embedding_base_url: Optional[str] = Field(default=None, max_length=500)
    llm_model: Optional[str] = Field(default=None, max_length=100)
    embedding_model: Optional[str] = Field(default=None, max_length=100)
    ocr_enabled: bool = False
    search_type: Literal["hybrid", "vector", "keyword"] = "hybrid"


class CollectionUpdate(BaseModel):
    name: Optional[str] = Field(default=None, min_length=1, max_length=100)
    description: Optional[str] = Field(default=None, max_length=500)
    provider: Optional[Literal["openai", "ollama"]] = None
    api_key: Optional[str] = None
    base_url: Optional[str] = Field(default=None, max_length=500)
    embedding_provider: Optional[Literal["openai", "ollama"]] = None
    embedding_api_key: Optional[str] = None
    embedding_base_url: Optional[str] = Field(default=None, max_length=500)
    llm_model: Optional[str] = Field(default=None, max_length=100)
    embedding_model: Optional[str] = Field(default=None, max_length=100)
    ocr_enabled: Optional[bool] = None
    search_type: Optional[Literal["hybrid", "vector", "keyword"]] = None


class CollectionOut(BaseModel):
    id: int
    name: str
    description: str
    provider: str
    embedding_provider: Optional[str] = None
    llm_model: str
    embedding_model: str
    has_custom_key: bool = False
    has_embedding_key: bool = False
    ocr_enabled: bool = False
    search_type: str = "hybrid"
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class CollectionStats(BaseModel):
    id: int
    name: str
    doc_count: int = 0
    chunk_count: int = 0
    storage_size: int = 0
