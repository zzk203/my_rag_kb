import json
from typing import Optional

from sqlalchemy.orm import Session

from app.config import settings
from app.models.collection import Collection
from app.models.conversation import Conversation, Message
from app.services.llm_service import LLMFactory
from app.services.retrieval_service import HybridRetriever


RELEVANCE_THRESHOLD = 0.05


class QAService:
    def __init__(self, db: Session):
        self.db = db
        self.retriever = HybridRetriever(db)

    def _filter_and_rank(self, results: list) -> list:
        if not results:
            return []

        max_score = max(r.get("score", 0) for r in results)
        if max_score <= 0:
            return results[:10]

        filtered = [r for r in results if r.get("score", 0) >= max_score * RELEVANCE_THRESHOLD]

        filtered.sort(key=lambda r: r.get("score", 0), reverse=True)

        for i, r in enumerate(filtered):
            r["source_index"] = i + 1

        return filtered[:10]

    def ask(self, collection_id: int, query: str, conversation_id: Optional[int] = None, top_k: int = 10) -> dict:
        collection = self.db.query(Collection).filter(Collection.id == collection_id).first()
        if not collection:
            raise ValueError(f"Collection {collection_id} not found")

        raw_results = self.retriever.search(query, collection, top_k=top_k)
        display_sources = self._filter_and_rank(raw_results)

        if not conversation_id:
            conv = Conversation(collection_id=collection_id, title=query[:50])
            self.db.add(conv)
            self.db.commit()
            self.db.refresh(conv)
            conversation_id = conv.id

        context = "\n\n".join(f"[来源 {r['source_index']}]: {r['content']}" for r in display_sources)

        history = (
            self.db.query(Message)
            .filter(Message.conversation_id == conversation_id)
            .order_by(Message.created_at)
            .all()
        )
        max_history = getattr(collection, "max_history", 6) or 6
        history_text = ""
        if history:
            history_lines = []
            for h in history[-max_history:]:
                role = "用户" if h.role == "user" else "助手"
                history_lines.append(f"{role}: {h.content[:200]}")
            history_text = "\n".join(history_lines)

        msg = Message(conversation_id=conversation_id, role="user", content=query)
        self.db.add(msg)
        self.db.commit()

        prompt = self._build_prompt(query, context, history_text)

        llm = LLMFactory.create_llm(
            collection.provider, collection.llm_model,
            api_key=collection.api_key, base_url=collection.base_url,
        )
        answer = llm.invoke(prompt)
        answer_text = answer.content if hasattr(answer, "content") else str(answer)

        max_score = max((r.get("score", 0) for r in display_sources), default=0)
        sources_json = json.dumps([
            {
                "source_index": r.get("source_index", i + 1),
                "id": r.get("id", i),
                "chunk_id": r["chunk_id"],
                "content": r["content"],
                "highlight_content": r.get("highlight_content", ""),
                "filename": r.get("filename", ""),
                "document_id": r.get("document_id", 0),
                "collection_id": r.get("collection_id", collection_id),
                "score": r.get("score", 0),
                "relevance_pct": round(r.get("score", 0) / max_score * 100) if max_score > 0 else 0,
            }
            for i, r in enumerate(display_sources)
        ], ensure_ascii=False)

        answer_msg = Message(
            conversation_id=conversation_id,
            role="assistant",
            content=answer_text,
            sources_json=sources_json,
        )
        self.db.add(answer_msg)
        self.db.commit()
        self.db.refresh(answer_msg)

        return {
            "answer": answer_text,
            "sources": display_sources,
            "conversation_id": conversation_id,
            "message_id": answer_msg.id,
        }

    def _build_prompt(self, query: str, context: str, history: str = "") -> str:
        parts = []
        parts.append("你是一个知识库问答助手。请基于以下参考文档回答用户的问题。")
        parts.append("如果你在参考文档中找不到答案，请诚实地告诉用户你不知道。")
        parts.append("请用中文回答，并在回答中引用相关的来源编号。")

        if context.strip():
            parts.append(f"\n参考文档：\n{context}")

        if history.strip():
            parts.append(f"\n对话历史：\n{history}")

        parts.append(f"\n用户问题：{query}")
        parts.append("\n回答：")
        return "\n".join(parts)
