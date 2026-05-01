import json
import re
from typing import Any, Dict, List, Optional

from langchain_chroma import Chroma
from rank_bm25 import BM25Okapi
from sqlalchemy.orm import Session

from app.config import settings
from app.models.chunk import Chunk as ChunkModel
from app.models.collection import Collection
from app.models.document import Document as DocumentModel
from app.services.llm_service import LLMFactory


def highlight_text(text: str, query: str) -> str:
    terms = query.strip().split()
    if not terms:
        return text
    pattern = "|".join(re.escape(t) for t in terms)
    return re.sub(f"({pattern})", r"<mark>\1</mark>", text, flags=re.IGNORECASE)


class HybridRetriever:
    def __init__(self, db: Session):
        self.db = db
        self._bm25_cache: Dict[int, BM25Okapi] = {}
        self._bm25_docs: Dict[int, List[dict]] = {}

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
            vector_results = self._vector_search(query, collection, top_k=top_k * 3, filters=filters)

        if search_type in ("hybrid", "keyword"):
            keyword_results = self._keyword_search(query, collection.id, top_k=top_k * 3)

        if search_type == "vector":
            return self._deduplicate(vector_results)[:top_k]
        elif search_type == "keyword":
            return self._deduplicate(keyword_results)[:top_k]
        else:
            return self._rrf_merge(vector_results, keyword_results, top_k=top_k)

    def _vector_search(
        self,
        query: str,
        collection: Collection,
        top_k: int,
        filters: Optional[Dict[str, Any]] = None,
    ) -> List[dict]:
        embeddings = LLMFactory.create_embeddings(
            collection.provider, collection.embedding_model,
            api_key=collection.api_key, base_url=collection.base_url,
        )
        vectorstore = Chroma(
            collection_name=f"collection_{collection.id}",
            embedding_function=embeddings,
            persist_directory=settings.vector_store_dir,
        )

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
            output.append({
                "chunk_id": doc.metadata.get("chunk_id", doc.metadata.get("chunk_index", 0)),
                "content": content,
                "highlight_content": highlight_text(content, query),
                "score": float(score),
                "document_id": did,
                "filename": filenames.get(did, ""),
                "page_number": doc.metadata.get("page_number"),
            })

        return output

    def _keyword_search(self, query: str, collection_id: int, top_k: int) -> List[dict]:
        bm25, docs = self._get_bm25(collection_id)
        if bm25 is None or not docs:
            return []

        tokenized_query = query.split()
        scores = bm25.get_scores(tokenized_query)
        top_indices = sorted(range(len(scores)), key=lambda i: scores[i], reverse=True)[:top_k]

        results = []
        for idx in top_indices:
            if scores[idx] <= 0:
                continue
            item = dict(docs[idx])
            item["score"] = float(scores[idx])
            item["highlight_content"] = highlight_text(item["content"], query)
            results.append(item)

        return results

    def _get_bm25(self, collection_id: int):
        if collection_id in self._bm25_cache:
            return self._bm25_cache[collection_id], self._bm25_docs[collection_id]

        chunks = (
            self.db.query(ChunkModel)
            .join(DocumentModel, ChunkModel.document_id == DocumentModel.id)
            .filter(DocumentModel.collection_id == collection_id)
            .all()
        )

        if not chunks:
            return None, []

        doc_ids = set(c.document_id for c in chunks)
        filenames = {}
        if doc_ids:
            docs = self.db.query(DocumentModel).filter(DocumentModel.id.in_(doc_ids)).all()
            filenames = {d.id: d.filename for d in docs}

        docs = []
        for c in chunks:
            meta = {}
            try:
                meta = json.loads(c.meta_json)
            except (json.JSONDecodeError, TypeError):
                pass
            docs.append({
                "chunk_id": c.id,
                "content": c.content,
                "document_id": c.document_id,
                "filename": filenames.get(c.document_id, ""),
                "page_number": c.page_number,
                "chunk_index": c.chunk_index,
            })

        tokenized_corpus = [d["content"].split() for d in docs]
        bm25 = BM25Okapi(tokenized_corpus)

        self._bm25_cache[collection_id] = bm25
        self._bm25_docs[collection_id] = docs

        return bm25, docs

    def invalidate_bm25_cache(self, collection_id: int):
        self._bm25_cache.pop(collection_id, None)
        self._bm25_docs.pop(collection_id, None)

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
