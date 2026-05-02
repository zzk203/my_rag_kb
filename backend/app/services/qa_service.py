import json
from typing import Optional

from sqlalchemy.orm import Session

from app.models.collection import Collection
from app.models.conversation import Conversation, Message
from app.services.llm_service import LLMFactory
from app.services.retrieval_service import HybridRetriever
from app.utils.logging_config import log_timing


RRF_MIN_SCORE = 0.01  # 混合检索 RRF 噪声阈值（约单列表 rank-40）
RRF_K = 60  # RRF 平滑常数，与常量中的 60 保持一致

VECTOR_MIN_SIMILARITY = 0.3  # 向量检索最低相似度阈值
BM25_MIN_RATIO = 0.05       # BM25 关键词检索最低得分比（相对最高分）


def calc_relevance_pct(score: float, search_type: str = "hybrid") -> int:
    """按检索方式分策略计算绝对相关性百分比"""
    if search_type == "hybrid":
        theoretical_max = 2.0 / (RRF_K + 1)  # ~0.03279
        pct = min(score / theoretical_max, 1.0) * 100
    else:
        # vector 分数已是 [0,1] 相似度，keyword 已在 filter 中归一化到 [0,1]
        pct = min(score, 1.0) * 100
    return max(0, min(100, round(pct)))


class QAService:
    def __init__(self, db: Session):
        self.db = db
        self.retriever = HybridRetriever(db)

    def _filter_and_rank(self, results: list, search_type: str = "hybrid") -> list:
        if not results:
            return []

        if search_type == "hybrid":
            max_score = max(r.get("score", 0) for r in results)
            if max_score < RRF_MIN_SCORE:
                return []  # 最高分都低于噪声阈值，全部丢弃
            filtered = [r for r in results if r.get("score", 0) >= RRF_MIN_SCORE]
        elif search_type == "vector":
            filtered = [r for r in results if r.get("score", 0) >= VECTOR_MIN_SIMILARITY]
            if not filtered:
                return []
        elif search_type == "keyword":
            filtered = [r for r in results if r.get("score", 0) >= BM25_MIN_RATIO]
            if not filtered:
                return []
        else:
            filtered = results[:]

        filtered.sort(key=lambda r: r.get("score", 0), reverse=True)

        for i, r in enumerate(filtered):
            r["source_index"] = i + 1

        return filtered[:10]

    @log_timing("问答(含检索+LLM)")
    def ask(self, collection_id: int, query: str, conversation_id: Optional[int] = None, top_k: int = 10, search_type: Optional[str] = None) -> dict:
        collection = self.db.query(Collection).filter(Collection.id == collection_id).first()
        if not collection:
            raise ValueError(f"Collection {collection_id} not found")

        # 检索方式优先级：请求参数 > 知识库配置 > 默认 hybrid
        effective_search_type = search_type or collection.search_type or "hybrid"
        raw_results = self.retriever.search(query, collection, top_k=top_k, search_type=effective_search_type)
        display_sources = self._filter_and_rank(raw_results, effective_search_type)

        if not display_sources:
            # 无相关来源时不调用 LLM，直接返回固定回复
            if conversation_id:
                conv = self.db.query(Conversation).filter(Conversation.id == conversation_id).first()
            else:
                conv = Conversation(collection_id=collection_id, title=query[:50])
                self.db.add(conv)
                self.db.commit()
                self.db.refresh(conv)
                conversation_id = conv.id

            msg = Message(conversation_id=conversation_id, role="user", content=query)
            self.db.add(msg)
            self.db.commit()

            fallback_answer = "知识库中未找到与您问题相关的内容，请尝试更换问题或上传相关文档。"
            answer_msg = Message(
                conversation_id=conversation_id,
                role="assistant",
                content=fallback_answer,
                sources_json="[]",
            )
            self.db.add(answer_msg)
            self.db.commit()
            self.db.refresh(answer_msg)

            return {
                "answer": fallback_answer,
                "sources": [],
                "conversation_id": conversation_id,
                "message_id": answer_msg.id,
            }

        if not conversation_id:
            conv = Conversation(collection_id=collection_id, title=query[:50])
            self.db.add(conv)
            self.db.commit()
            self.db.refresh(conv)
            conversation_id = conv.id

        context = "\n\n".join(f"[来源 {r['source_index']}]: {r['content']}" for r in display_sources)

        msg = Message(conversation_id=conversation_id, role="user", content=query)
        self.db.add(msg)
        self.db.commit()

        prompt = self._build_prompt(query, context)

        llm = LLMFactory.create_llm(
            collection.provider, collection.llm_model,
            api_key=collection.api_key, base_url=collection.base_url,
        )
        answer = llm.invoke(prompt)
        answer_text = answer.content if hasattr(answer, "content") else str(answer)

        # LLM 明确表示未找到相关信息时，不展示来源
        if "知识库中未找到相关信息" in answer_text:
            display_sources = []

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
                "relevance_pct": calc_relevance_pct(r.get("score", 0), effective_search_type),
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

    def _build_prompt(self, query: str, context: str) -> str:
        parts = []
        parts.append("你是一个严格基于参考文档回答问题的助手。")
        parts.append("规则：只使用参考文档中明确提到的信息回答问题。如果参考文档中没有相关信息或所有信息都与你的问题无关，必须在回答中明确说'知识库中未找到相关信息'，严禁编造或猜测。")
        parts.append("请用中文回答，并在回答中引用相关的来源编号。")

        if context.strip():
            parts.append(f"\n参考文档：\n{context}")

        parts.append(f"\n用户问题：{query}")
        parts.append("\n回答：")
        return "\n".join(parts)
