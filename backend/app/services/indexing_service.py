import json
import logging
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
from app.services.retrieval_service import invalidate_bm25_cache, invalidate_vectorstore_cache
from app.services.splitter_service import TextSplitter
from app.utils.logging_config import log_timing


class IndexingService:
    def __init__(self):
        self.splitter = TextSplitter()

    @log_timing("文档索引")
    def index_document(self, db: Session, collection: Collection, doc: DocumentModel, file_path: str):
        doc.status = "processing"
        db.commit()

        try:
            parser = DoclingParser(ocr_enabled=bool(getattr(collection, "ocr_enabled", False)))
            parsed_chunks = parser.parse(file_path)

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

            embeddings = LLMFactory.create_embeddings(
                collection.embedding_provider or collection.provider,
                collection.embedding_model,
                api_key=collection.embedding_api_key or settings.embedding_api_key or collection.api_key,
                base_url=collection.embedding_base_url or settings.embedding_base_url or collection.base_url,
            )
            vectorstore = Chroma(
                collection_name=f"collection_{collection.id}",
                embedding_function=embeddings,
                persist_directory=settings.vector_store_dir,
            )

            chunk_records = []
            for i, split_doc in enumerate(split_docs):
                split_doc.metadata["chunk_index"] = i
                split_doc.metadata["document_id"] = doc.id
                split_doc.metadata["collection_id"] = collection.id

                cr = ChunkModel(
                    document_id=doc.id,
                    chunk_index=i,
                    content=split_doc.page_content,
                    page_number=None,
                    meta_json="{}",
                    chroma_id="",
                )
                db.add(cr)
                db.flush()
                split_doc.metadata["chunk_id"] = cr.id
                chunk_records.append(cr)

            chroma_ids = vectorstore.add_documents(split_docs)

            for i, cr in enumerate(chunk_records):
                cr.chroma_id = chroma_ids[i] if i < len(chroma_ids) else ""
                cr.meta_json = json.dumps(split_docs[i].metadata, ensure_ascii=False)

            doc.status = "ready"
            doc.chunk_count = len(chunk_records)
            db.commit()
            invalidate_bm25_cache(collection.id)
            invalidate_vectorstore_cache(collection.id)

        except Exception as e:
            db.rollback()
            doc.status = "error"
            doc.error_message = "文档处理失败，请检查文件格式或稍后重试"
            logging.exception("索引文档失败 doc_id=%s", doc.id)
            db.commit()

    @log_timing("删除文档向量")
    def delete_document_vectors(self, db: Session, collection: Collection, document_id: int):
        try:
            embeddings = LLMFactory.create_embeddings(
                collection.embedding_provider or collection.provider,
                collection.embedding_model,
                api_key=collection.embedding_api_key or settings.embedding_api_key or collection.api_key,
                base_url=collection.embedding_base_url or settings.embedding_base_url or collection.base_url,
            )
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
            invalidate_bm25_cache(collection.id)
            invalidate_vectorstore_cache(collection.id)

        except Exception as e:
            db.rollback()

    def clear_collection_vectors(self, db: Session, collection: Collection):
        import os, shutil
        import chromadb
        import sqlite3
        try:
            client = chromadb.PersistentClient(path=settings.vector_store_dir)
            coll_name = f"collection_{collection.id}"
            existing = [c.name for c in client.list_collections()]
            if coll_name in existing:
                client.delete_collection(coll_name)

            active_segments = set()
            sqlite_path = os.path.join(settings.vector_store_dir, "chroma.sqlite3")
            if os.path.exists(sqlite_path):
                try:
                    conn = sqlite3.connect(sqlite_path)
                    rows = conn.execute("SELECT id FROM segments").fetchall()
                    active_segments = {row[0] for row in rows}
                    conn.close()
                except Exception:
                    pass

            for entry in os.listdir(settings.vector_store_dir):
                dir_path = os.path.join(settings.vector_store_dir, entry)
                if os.path.isdir(dir_path) and entry not in active_segments:
                    shutil.rmtree(dir_path, ignore_errors=True)
            invalidate_bm25_cache(collection.id)
            invalidate_vectorstore_cache(collection.id)
        except Exception:
            pass

    def get_or_create_collection_vectorstore(self, collection: Collection) -> Chroma:
        embeddings = LLMFactory.create_embeddings(
            collection.embedding_provider or collection.provider,
            collection.embedding_model,
            api_key=collection.embedding_api_key or settings.embedding_api_key or collection.api_key,
            base_url=collection.embedding_base_url or settings.embedding_base_url or collection.base_url,
        )
        return Chroma(
            collection_name=f"collection_{collection.id}",
            embedding_function=embeddings,
            persist_directory=settings.vector_store_dir,
        )
