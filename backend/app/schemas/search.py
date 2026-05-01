from typing import Any, Dict, List, Optional

from pydantic import BaseModel


class SearchRequest(BaseModel):
    query: str
    collection_id: int
    top_k: int = 5
    filters: Optional[Dict[str, Any]] = None
    search_type: str = "hybrid"


class SearchResultItem(BaseModel):
    chunk_id: int
    content: str
    score: float
    document_id: int
    filename: str
    page_number: Optional[int] = None
    highlight_content: str = ""


class SearchResponse(BaseModel):
    results: List[SearchResultItem]
    total: int
