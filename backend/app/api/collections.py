import os
from typing import List

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.models.collection import Collection
from app.models.document import Document
from app.models.chunk import Chunk
from app.schemas.collection import CollectionCreate, CollectionOut, CollectionStats, CollectionUpdate
from app.config import settings
from app.services.indexing_service import IndexingService

indexing_service = IndexingService()

router = APIRouter(prefix="/collections", tags=["collections"])


@router.get("", response_model=List[CollectionOut])
def list_collections(db: Session = Depends(get_db)):
    return db.query(Collection).all()


@router.post("", response_model=CollectionOut, status_code=201)
def create_collection(data: CollectionCreate, db: Session = Depends(get_db)):
    values = data.model_dump()
    values["provider"] = values.get("provider") or "openai"
    if not values.get("llm_model"):
        values["llm_model"] = settings.openai_model
    if not values.get("embedding_model"):
        values["embedding_model"] = settings.embedding_model
    collection = Collection(**values)
    db.add(collection)
    db.commit()
    db.refresh(collection)
    return collection


@router.get("/{collection_id}", response_model=CollectionOut)
def get_collection(collection_id: int, db: Session = Depends(get_db)):
    collection = db.query(Collection).filter(Collection.id == collection_id).first()
    if not collection:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Collection not found")
    return collection


@router.put("/{collection_id}", response_model=CollectionOut)
def update_collection(collection_id: int, data: CollectionUpdate, db: Session = Depends(get_db)):
    collection = db.query(Collection).filter(Collection.id == collection_id).first()
    if not collection:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Collection not found")
    for key, val in data.model_dump(exclude_unset=True).items():
        if val is None or val == "":
            continue
        setattr(collection, key, val)
    db.commit()
    db.refresh(collection)
    return collection


@router.delete("/{collection_id}")
def delete_collection(collection_id: int, db: Session = Depends(get_db)):
    collection = db.query(Collection).filter(Collection.id == collection_id).first()
    if not collection:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Collection not found")

    docs = db.query(Document).filter(Document.collection_id == collection_id).all()
    for doc in docs:
        try:
            if os.path.exists(doc.file_path):
                os.remove(doc.file_path)
        except Exception:
            pass

    try:
        indexing_service.clear_collection_vectors(db, collection)
    except Exception:
        pass

    db.query(Chunk).filter(Chunk.document_id.in_([d.id for d in docs])).delete(synchronize_session=False)
    db.query(Document).filter(Document.collection_id == collection_id).delete(synchronize_session=False)
    db.delete(collection)
    db.commit()
    return {"ok": True}


@router.get("/{collection_id}/stats", response_model=CollectionStats)
def get_collection_stats(collection_id: int, db: Session = Depends(get_db)):
    collection = db.query(Collection).filter(Collection.id == collection_id).first()
    if not collection:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Collection not found")
    doc_count = db.query(Document).filter(Document.collection_id == collection_id).count()
    chunk_count = (
        db.query(Chunk)
        .join(Document, Chunk.document_id == Document.id)
        .filter(Document.collection_id == collection_id)
        .count()
    )
    return CollectionStats(
        id=collection.id,
        name=collection.name,
        doc_count=doc_count,
        chunk_count=chunk_count,
    )
