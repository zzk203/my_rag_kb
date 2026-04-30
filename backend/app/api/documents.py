from fastapi import APIRouter, Depends, UploadFile, File, Form
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.config import settings
from app.models.collection import Collection
from app.models.document import Document
from app.schemas.document import ChunkOut, DocumentOut, DocumentUpdate
from app.services.indexing_service import IndexingService
from app.services.parser_service import compute_file_hash, save_upload_file
from app.models.chunk import Chunk as ChunkModel

router = APIRouter(prefix="/documents", tags=["documents"])

indexing_service = IndexingService()


@router.post("/upload/{collection_id}", response_model=DocumentOut, status_code=201)
async def upload_document(
    collection_id: int,
    file: UploadFile = File(...),
    tags: str = Form("[]"),
    db: Session = Depends(get_db),
):
    collection = db.query(Collection).filter(Collection.id == collection_id).first()
    if not collection:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Collection not found")

    file_bytes = await file.read()
    file_hash = compute_file_hash(file_bytes)

    existing = db.query(Document).filter(
        Document.collection_id == collection_id,
        Document.file_hash == file_hash,
    ).first()
    if existing:
        from fastapi import HTTPException
        raise HTTPException(status_code=409, detail="Document already exists in this collection")

    file_path = save_upload_file(file_bytes, file.filename)
    file_type = file.filename.rsplit(".", 1)[-1].lower() if "." in file.filename else "unknown"

    doc = Document(
        collection_id=collection_id,
        filename=file.filename,
        file_type=file_type,
        file_path=file_path,
        file_size=len(file_bytes),
        file_hash=file_hash,
        tags=tags,
        status="pending",
    )
    db.add(doc)
    db.commit()
    db.refresh(doc)

    indexing_service.index_document(db, collection, doc, file_path)

    db.refresh(doc)
    return doc


@router.get("", response_model=list[DocumentOut])
def list_documents(
    collection_id: int = None,
    status: str = None,
    db: Session = Depends(get_db),
):
    query = db.query(Document)
    if collection_id is not None:
        query = query.filter(Document.collection_id == collection_id)
    if status is not None:
        query = query.filter(Document.status == status)
    return query.order_by(Document.created_at.desc()).all()


@router.get("/{document_id}", response_model=DocumentOut)
def get_document(document_id: int, db: Session = Depends(get_db)):
    doc = db.query(Document).filter(Document.id == document_id).first()
    if not doc:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Document not found")
    return doc


@router.delete("/{document_id}")
def delete_document(document_id: int, db: Session = Depends(get_db)):
    doc = db.query(Document).filter(Document.id == document_id).first()
    if not doc:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Document not found")

    collection = db.query(Collection).filter(Collection.id == doc.collection_id).first()
    if collection:
        indexing_service.delete_document_vectors(db, collection, document_id)

    db.delete(doc)
    db.commit()
    return {"ok": True}


@router.put("/{document_id}", response_model=DocumentOut)
def update_document(document_id: int, data: DocumentUpdate, db: Session = Depends(get_db)):
    doc = db.query(Document).filter(Document.id == document_id).first()
    if not doc:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Document not found")
    if data.tags is not None:
        doc.tags = data.tags
    db.commit()
    db.refresh(doc)
    return doc


@router.post("/{document_id}/reindex")
def reindex_document(document_id: int, db: Session = Depends(get_db)):
    doc = db.query(Document).filter(Document.id == document_id).first()
    if not doc:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Document not found")

    collection = db.query(Collection).filter(Collection.id == doc.collection_id).first()
    if not collection:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Collection not found")

    indexing_service.delete_document_vectors(db, collection, document_id)

    doc.status = "pending"
    doc.chunk_count = 0
    doc.error_message = None
    db.commit()

    indexing_service.index_document(db, collection, doc, doc.file_path)
    db.refresh(doc)
    return doc


@router.get("/{document_id}/chunks", response_model=list[ChunkOut])
def get_document_chunks(document_id: int, db: Session = Depends(get_db)):
    chunks = db.query(ChunkModel).filter(ChunkModel.document_id == document_id).order_by(ChunkModel.chunk_index).all()
    return chunks
