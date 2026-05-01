from sqlalchemy import Boolean, Column, Integer, String, DateTime, func, Text

from app.models.database import Base


class Collection(Base):
    __tablename__ = "collections"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    name = Column(String, nullable=False)
    description = Column(String, default="")
    provider = Column(String, default="openai")
    api_key = Column(Text, nullable=True)
    base_url = Column(Text, nullable=True)
    llm_model = Column(String, default="gpt-4o-mini")
    embedding_model = Column(String, default="text-embedding-3-small")
    max_history = Column(Integer, default=6)
    ocr_enabled = Column(Boolean, default=False)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
