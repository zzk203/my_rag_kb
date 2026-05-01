from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel

from app.schemas.search import SearchResultItem


class ChatRequest(BaseModel):
    query: str
    collection_id: int
    conversation_id: Optional[int] = None
    top_k: int = 5


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
