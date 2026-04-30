import json
import os
from typing import List, Optional

from langchain_chroma import Chroma
from langchain_core.documents import Document
from sqlalchemy.orm import Session

from app.config import settings
from app.models.chunk import Chunk as ChunkModel
from app.models.collection import Collection
from app.models.document import Document as DocumentModel
from app.services.llm_service import LLMFactory
from app.services.parser_service import DoclingParser, ParsedChunk
from app.services.splitter_service import TextSplitter


class IndexingService:
    def __init__(self):
        self.parser = DoclingParser()
        self.splitter = TextSplitter()

    def index_document(self, db: Session, collection: Collection, doc: DocumentModel, file_path: str):
        doc.status = "processing"
        db.commit()

        try:
            parsed_chunks = self.parser.parse(file_path)

            all_text = "\n\n".join(c.content for c in parsed_chunks if c.content.strip())
            if not all_text.strip():
                doc.status = "error"
                doc.error_message = "Empty document after parsing"
                db.commit()
                return

            split_docs = self.splitter.split_with_metadata(all_text, metadata={
                "collection_id": collection.id,
                "document_id": doc.id,
            })

            embeddings = LLMFactory.create_embeddings(collection.provider, collection.embedding_model)
            vectorstore = Chroma(
                collection_name=f"collection_{collection.id}",
                embedding_function=embeddings,
                persist_directory=settings.vector_store_dir,
            )

            chunk_records = []
            chroma_ids = []

            for i, split_doc in enumerate(split_docs):
                split_doc.metadata["chunk_index"] = i
                split_doc.metadata["document_id"] = doc.id
                split_doc.metadata["collection_id"] = collection.id

            chroma_ids = vectorstore.add_documents(split_docs)

            for i, split_doc in enumerate(split_docs):
                chunk_records.append(ChunkModel(
                    document_id=doc.id,
                    chunk_index=i,
                    content=split_doc.page_content,
                    page_number=None,
                    meta_json=json.dumps(split_doc.metadata, ensure_ascii=False),
                    chroma_id=chroma_ids[i] if i < len(chroma_ids) else "",
                ))

            db.bulk_save_objects(chunk_records)
            doc.status = "ready"
            doc.chunk_count = len(chunk_records)
            db.commit()

        except Exception as e:
            db.rollback()
            doc.status = "error"
            doc.error_message = str(e)
            db.commit()

    def delete_document_vectors(self, db: Session, collection: Collection, document_id: int):
        try:
            embeddings = LLMFactory.create_embeddings(collection.provider, collection.embedding_model)
            vectorstore = Chroma(
                collection_name=f"collection_{collection.id}",
                embedding_function=embeddings,
                persist_directory=settings.vector_store_dir,
            )

            chunks = db.query(ChunkModel).filter(ChunkModel.document_id == document_id).all()
            chroma_ids = [c.chroma_id for c in chunks if c.chroma_id]

            if chroma_ids:
                vectorstore.delete(chroma_ids)

            db.query(ChunkModel).filter(ChunkModel.document_id == document_id).delete()
            db.commit()

        except Exception as e:
            db.rollback()

    def get_or_create_collection_vectorstore(self, collection: Collection) -> Chroma:
        embeddings = LLMFactory.create_embeddings(collection.provider, collection.embedding_model)
        return Chroma(
            collection_name=f"collection_{collection.id}",
            embedding_function=embeddings,
            persist_directory=settings.vector_store_dir,
        )
