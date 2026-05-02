import mimetypes
from pathlib import Path
from typing import List, Optional

import os

from fastapi import APIRouter, BackgroundTasks, Depends, UploadFile, File, Form
from fastapi.responses import FileResponse, Response
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.config import settings
from app.models.collection import Collection
from app.models.document import Document
from app.schemas.document import ChunkOut, DocumentOut, DocumentUpdate
from app.services.indexing_service import IndexingService
from app.services.parser_service import compute_file_hash, save_upload_file, DoclingParser
from app.models.chunk import Chunk as ChunkModel
from app.tasks.index_task import schedule_indexing
from app.utils.logging_config import log_timing

router = APIRouter(prefix="/documents", tags=["documents"])

indexing_service = IndexingService()

MAX_FILE_SIZE = 50 * 1024 * 1024  # 50 MB


@router.post("/upload/{collection_id}", response_model=DocumentOut, status_code=201)
@log_timing("文件上传")
async def upload_document(
    collection_id: int,
    file: UploadFile = File(..., max_size=MAX_FILE_SIZE),  # FastAPI 会自动拒绝超过 MAX_FILE_SIZE 的文件
    tags: str = Form("[]"),
    background_tasks: BackgroundTasks = None,
    db: Session = Depends(get_db),
):
    collection = db.query(Collection).filter(Collection.id == collection_id).first()
    if not collection:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Collection not found")

    ext = Path(file.filename).suffix.lower()
    if ext not in DoclingParser.SUPPORTED_EXTENSIONS:
        from fastapi import HTTPException
        raise HTTPException(status_code=400, detail=f"不支持的文件类型: {ext}")

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

    schedule_indexing(background_tasks, collection.id, doc.id, file_path)

    return doc


@router.get("", response_model=List[DocumentOut])
def list_documents(
    collection_id: Optional[int] = None,
    status: Optional[str] = None,
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

    try:
        if os.path.exists(doc.file_path):
            os.remove(doc.file_path)
    except Exception:
        pass

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
def reindex_document(document_id: int, background_tasks: BackgroundTasks = None, db: Session = Depends(get_db)):
    doc = db.query(Document).filter(Document.id == document_id).first()
    if not doc:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Document not found")

    if doc.status == "processing":
        from fastapi import HTTPException
        raise HTTPException(status_code=409, detail="Document is being indexed, please wait")

    collection = db.query(Collection).filter(Collection.id == doc.collection_id).first()
    if not collection:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Collection not found")

    indexing_service.delete_document_vectors(db, collection, document_id)

    doc.status = "processing"
    doc.chunk_count = 0
    doc.error_message = None
    db.commit()

    schedule_indexing(background_tasks, collection.id, doc.id, doc.file_path)
    return doc


@router.get("/{document_id}/chunks", response_model=List[ChunkOut])
def get_document_chunks(document_id: int, db: Session = Depends(get_db)):
    chunks = db.query(ChunkModel).filter(ChunkModel.document_id == document_id).order_by(ChunkModel.chunk_index).all()
    return chunks


@router.get("/{document_id}/download")
def download_document(document_id: int, db: Session = Depends(get_db)):
    doc = db.query(Document).filter(Document.id == document_id).first()
    if not doc:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Document not found")
    if not os.path.exists(doc.file_path):
        raise HTTPException(status_code=404, detail="File not found on disk")
    media_type, _ = mimetypes.guess_type(doc.filename)
    return FileResponse(doc.file_path, filename=doc.filename,
                        media_type=media_type or "application/octet-stream",
                        content_disposition_type="inline")


@router.get("/{document_id}/content")
def get_document_content(document_id: int, db: Session = Depends(get_db)):
    doc = db.query(Document).filter(Document.id == document_id).first()
    if not doc:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Document not found")
    if not os.path.exists(doc.file_path):
        raise HTTPException(status_code=404, detail="File not found on disk")
    with open(doc.file_path, "r", encoding="utf-8", errors="replace") as f:
        content = f.read()
    return Response(content=content, media_type="text/plain; charset=utf-8")
