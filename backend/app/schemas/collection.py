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
    max_history: int = Field(default=6, ge=0, le=50)
    ocr_enabled: bool = False


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
    max_history: Optional[int] = Field(default=None, ge=0, le=50)
    ocr_enabled: Optional[bool] = None


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
