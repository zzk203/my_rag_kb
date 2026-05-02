from typing import Any, Dict, List, Literal, Optional

from pydantic import BaseModel, Field


class SearchRequest(BaseModel):
    query: str = Field(..., min_length=1, max_length=5000)
    collection_id: int
    top_k: int = Field(default=5, ge=1, le=50)
    filters: Optional[Dict[str, Any]] = None
    search_type: Literal["hybrid", "vector", "keyword"] = "hybrid"


class SearchResultItem(BaseModel):
    chunk_id: int
    content: str
    score: float
    document_id: int
    filename: str
    page_number: Optional[int] = None
    highlight_content: str = ""
    source_index: Optional[int] = None
    id: Optional[int] = None
    relevance_pct: Optional[int] = None
    collection_id: Optional[int] = None


class SearchResponse(BaseModel):
    results: List[SearchResultItem]
    total: int
