from fastapi import BackgroundTasks
from sqlalchemy.orm import Session

from app.models.collection import Collection
from app.models.document import Document
from app.models.database import SessionLocal
from app.services.indexing_service import IndexingService


def index_document_background(collection_id: int, document_id: int, file_path: str):
    db: Session = SessionLocal()
    try:
        collection = db.query(Collection).filter(Collection.id == collection_id).first()
        doc = db.query(Document).filter(Document.id == document_id).first()
        if collection and doc:
            service = IndexingService()
            service.index_document(db, collection, doc, file_path)
    finally:
        db.close()


def schedule_indexing(background_tasks: BackgroundTasks, collection_id: int, document_id: int, file_path: str):
    background_tasks.add_task(index_document_background, collection_id, document_id, file_path)
