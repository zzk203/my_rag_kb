from datetime import datetime
from typing import List, Literal, Optional

from pydantic import BaseModel, Field

from app.schemas.search import SearchResultItem


class ChatRequest(BaseModel):
    query: str = Field(..., min_length=1, max_length=5000)
    collection_id: int
    conversation_id: Optional[int] = None
    top_k: int = Field(default=5, ge=1, le=50)
    search_type: Optional[Literal["hybrid", "vector", "keyword"]] = None


class ChatResponse(BaseModel):
    answer: str
    sources: List[SearchResultItem]
    conversation_id: int
    message_id: int


class ConversationOut(BaseModel):
    id: int
    collection_id: int
    title: str
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class ConversationUpdate(BaseModel):
    title: str


class MessageOut(BaseModel):
    id: int
    conversation_id: int
    role: str
    content: str
    sources_json: Optional[str] = None
    created_at: datetime

    model_config = {"from_attributes": True}
