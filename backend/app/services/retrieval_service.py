import math
import re
from typing import Any, Dict, List, Optional

from langchain_chroma import Chroma
from langchain_community.retrievers import BM25Retriever
from sqlalchemy.orm import Session

from app.config import settings
from app.models.chunk import Chunk as ChunkModel
from app.models.collection import Collection
from app.models.document import Document as DocumentModel
from app.services.llm_service import LLMFactory
from app.utils.logging_config import log_timing

try:
    import jieba
    _has_jieba = True
except ImportError:
    _has_jieba = False

VECTOR_MIN_SIMILARITY = 0.3
BM25_MIN_RATIO = 0.05


def _tokenize(text: str) -> List[str]:
    if _has_jieba:
        return [t for t in jieba.cut(text) if t.strip()]
    return text.split()

_bm25_cache: Dict[int, BM25Retriever] = {}
_vectorstore_cache: Dict[int, Chroma] = {}


def invalidate_bm25_cache(collection_id: int):
    _bm25_cache.pop(collection_id, None)


def invalidate_vectorstore_cache(collection_id: int):
    _vectorstore_cache.pop(collection_id, None)


def _get_cached_vectorstore(collection: Collection) -> Chroma:
    if collection.id not in _vectorstore_cache:
        embeddings = LLMFactory.create_embeddings(
            collection.embedding_provider or collection.provider,
            collection.embedding_model,
            api_key=collection.embedding_api_key or settings.embedding_api_key or collection.api_key,
            base_url=collection.embedding_base_url or settings.embedding_base_url or collection.base_url,
        )
        _vectorstore_cache[collection.id] = Chroma(
            collection_name=f"collection_{collection.id}",
            embedding_function=embeddings,
            persist_directory=settings.vector_store_dir,
        )
    return _vectorstore_cache[collection.id]


def highlight_text(text: str, query: str) -> str:
    terms = query.strip().split()
    if not terms:
        return text
    pattern = "|".join(re.escape(t) for t in terms)
    return re.sub(f"({pattern})", r"<mark>\1</mark>", text, flags=re.IGNORECASE)


class HybridRetriever:
    def __init__(self, db: Session):
        self.db = db

    def search(
        self,
        query: str,
        collection: Collection,
        top_k: int = 5,
        filters: Optional[Dict[str, Any]] = None,
        search_type: str = "hybrid",
    ) -> List[dict]:
        vector_results = []
        keyword_results = []

        if search_type in ("hybrid", "vector"):
            vector_results = self._vector_search(query, collection, top_k=top_k * 3, filters=filters, min_score=VECTOR_MIN_SIMILARITY)

        if search_type in ("hybrid", "keyword"):
            keyword_results = self._keyword_search(query, collection.id, top_k=top_k * 3, min_normalized_score=BM25_MIN_RATIO)

        if search_type == "vector":
            return self._deduplicate(vector_results)[:top_k]
        elif search_type == "keyword":
            return self._deduplicate(keyword_results)[:top_k]
        else:
            return self._rrf_merge(vector_results, keyword_results, top_k=top_k)

    @log_timing("向量检索")
    def _vector_search(
        self,
        query: str,
        collection: Collection,
        top_k: int,
        filters: Optional[Dict[str, Any]] = None,
        min_score: Optional[float] = None,
    ) -> List[dict]:
        vectorstore = _get_cached_vectorstore(collection)

        chroma_filter = None
        if filters:
            chroma_filter = {}
            if "tags" in filters:
                pass
            if "file_type" in filters:
                pass

        results = vectorstore.similarity_search_with_score(query, k=top_k, filter=chroma_filter)

        doc_ids = set()
        for d, _ in results:
            did = d.metadata.get("document_id", 0)
            if did:
                doc_ids.add(did)

        filenames = {}
        if doc_ids:
            docs = self.db.query(DocumentModel).filter(DocumentModel.id.in_(doc_ids)).all()
            filenames = {d.id: d.filename for d in docs}

        output = []
        for doc, score in results:
            did = doc.metadata.get("document_id", 0)
            content = doc.page_content
            chunk_index = doc.metadata.get("chunk_index", 0)
            similarity = 1.0 - float(score) / math.sqrt(2)
            if min_score is not None and similarity < min_score:
                continue
            output.append({
                "chunk_id": doc.metadata.get("chunk_id", chunk_index),
                "id": chunk_index,
                "content": content,
                "highlight_content": highlight_text(content, query),
                "score": similarity,
                "document_id": did,
                "filename": filenames.get(did, ""),
                "page_number": doc.metadata.get("page_number"),
            })

        return output

    @log_timing("BM25关键词检索")
    def _keyword_search(self, query: str, collection_id: int, top_k: int,
                        min_normalized_score: Optional[float] = None) -> List[dict]:
        retriever = self._get_bm25_retriever(collection_id)
        if retriever is None:
            import logging
            logging.getLogger(__name__).warning(f"[BM25] collection {collection_id}: 无可用分块")
            return []

        tokenized_query = retriever.preprocess_func(query)
        scores = retriever.vectorizer.get_scores(tokenized_query)
        max_score = max(scores) if len(scores) > 0 else 0.0
        top_indices = sorted(range(len(scores)), key=lambda i: scores[i], reverse=True)[:top_k]

        results = []
        for idx in top_indices:
            if scores[idx] <= 0:
                continue
            doc = retriever.docs[idx]
            item = {
                "chunk_id": doc.metadata.get("chunk_id", idx),
                "id": doc.metadata.get("id", idx),
                "content": doc.page_content,
                "score": float(scores[idx]),
                "document_id": doc.metadata.get("document_id", 0),
                "filename": doc.metadata.get("filename", ""),
                "page_number": doc.metadata.get("page_number"),
                "chunk_index": doc.metadata.get("chunk_index", 0),
            }
            item["highlight_content"] = highlight_text(item["content"], query)
            results.append(item)

        if min_normalized_score is not None and results:
            max_score = max(r["score"] for r in results)
            if max_score > 0:
                for r in results:
                    r["score"] = r["score"] / max_score
                results = [r for r in results if r["score"] >= min_normalized_score]
            else:
                results = []

        if not results:
            import logging
            logging.getLogger(__name__).warning(
                f"[BM25] collection {collection_id}: 所有分块 BM25 得分为 0，"
                f"查询分词: {tokenized_query}, "
                f"最高分: {max_score:.4f}"
            )
        return results

    def _get_bm25_retriever(self, collection_id: int) -> Optional[BM25Retriever]:
        if collection_id in _bm25_cache:
            return _bm25_cache[collection_id]

        chunks = (
            self.db.query(ChunkModel)
            .join(DocumentModel, ChunkModel.document_id == DocumentModel.id)
            .filter(DocumentModel.collection_id == collection_id)
            .all()
        )

        if not chunks:
            return None

        doc_ids = set(c.document_id for c in chunks)
        filenames = {}
        if doc_ids:
            docs = self.db.query(DocumentModel).filter(DocumentModel.id.in_(doc_ids)).all()
            filenames = {d.id: d.filename for d in docs}

        metadatas = [{
            "chunk_id": c.id,
            "id": c.chunk_index,
            "document_id": c.document_id,
            "filename": filenames.get(c.document_id, ""),
            "page_number": c.page_number,
            "chunk_index": c.chunk_index,
        } for c in chunks]

        texts = [c.content for c in chunks]

        retriever = BM25Retriever.from_texts(
            texts=texts,
            metadatas=metadatas,
            preprocess_func=_tokenize,
        )

        _bm25_cache[collection_id] = retriever
        return retriever

    @log_timing("RRF融合")
    def _rrf_merge(self, vector_results: List[dict], keyword_results: List[dict], top_k: int, k: int = 60) -> List[dict]:
        scores: Dict[int, float] = {}
        items: Dict[int, dict] = {}

        for rank, r in enumerate(vector_results):
            cid = r["chunk_id"]
            scores[cid] = scores.get(cid, 0) + 1 / (k + rank + 1)
            items[cid] = r

        for rank, r in enumerate(keyword_results):
            cid = r["chunk_id"]
            scores[cid] = scores.get(cid, 0) + 1 / (k + rank + 1)
            items[cid] = r

        sorted_ids = sorted(scores.keys(), key=lambda x: scores[x], reverse=True)
        for cid in sorted_ids:
            items[cid]["score"] = round(scores[cid], 6)
        results = [items[cid] for cid in sorted_ids]
        return results[:top_k]

    def _deduplicate(self, results: List[dict]) -> List[dict]:
        seen = set()
        deduped = []
        for r in results:
            cid = r["chunk_id"]
            if cid not in seen:
                seen.add(cid)
                deduped.append(r)
        return deduped
