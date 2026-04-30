from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel


class DocumentOut(BaseModel):
    id: int
    collection_id: int
    filename: str
    file_type: str
    file_size: int
    tags: str
    status: str
    chunk_count: int
    error_message: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class DocumentUpdate(BaseModel):
    tags: Optional[str] = None


class ChunkOut(BaseModel):
    id: int
    document_id: int
    chunk_index: int
    content: str
    page_number: Optional[int] = None
    meta_json: str
    chroma_id: str

    model_config = {"from_attributes": True}
