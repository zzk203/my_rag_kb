from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.models.collection import Collection
from app.schemas.search import SearchRequest, SearchResponse, SearchResultItem
from app.services.retrieval_service import HybridRetriever

router = APIRouter(prefix="/search", tags=["search"])


@router.post("", response_model=SearchResponse)
def search(data: SearchRequest, db: Session = Depends(get_db)):
    collection = db.query(Collection).filter(Collection.id == data.collection_id).first()
    if not collection:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Collection not found")

    retriever = HybridRetriever(db)
    results = retriever.search(
        query=data.query,
        collection=collection,
        top_k=data.top_k,
        filters=data.filters,
        search_type=data.search_type,
    )

    items = []
    for r in results:
        items.append(SearchResultItem(
            chunk_id=r.get("chunk_id", 0),
            content=r.get("content", ""),
            score=r.get("score", 0.0),
            document_id=r.get("document_id", 0),
            filename=r.get("filename", ""),
            page_number=r.get("page_number"),
        ))

    return SearchResponse(results=items, total=len(items))
