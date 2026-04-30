from typing import List, Optional

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.models.conversation import Conversation, Message
from app.schemas.chat import ChatRequest, ChatResponse, ConversationOut, MessageOut
from app.services.qa_service import QAService

router = APIRouter(prefix="/chat", tags=["chat"])


@router.post("", response_model=ChatResponse)
def chat(data: ChatRequest, db: Session = Depends(get_db)):
    qa = QAService(db)
    try:
        result = qa.ask(
            collection_id=data.collection_id,
            query=data.query,
            conversation_id=data.conversation_id,
            top_k=data.top_k,
        )
        return ChatResponse(
            answer=result["answer"],
            sources=result["sources"],
            conversation_id=result["conversation_id"],
            message_id=result["message_id"],
        )
    except ValueError as e:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail=str(e))


@router.get("/conversations", response_model=List[ConversationOut])
def list_conversations(collection_id: Optional[int] = None, db: Session = Depends(get_db)):
    query = db.query(Conversation)
    if collection_id is not None:
        query = query.filter(Conversation.collection_id == collection_id)
    return query.order_by(Conversation.updated_at.desc()).all()


@router.get("/conversations/{conversation_id}", response_model=List[MessageOut])
def get_conversation(conversation_id: int, db: Session = Depends(get_db)):
    messages = (
        db.query(Message)
        .filter(Message.conversation_id == conversation_id)
        .order_by(Message.created_at)
        .all()
    )
    return messages


@router.delete("/conversations/{conversation_id}")
def delete_conversation(conversation_id: int, db: Session = Depends(get_db)):
    conv = db.query(Conversation).filter(Conversation.id == conversation_id).first()
    if not conv:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Conversation not found")
    db.delete(conv)
    db.commit()
    return {"ok": True}
