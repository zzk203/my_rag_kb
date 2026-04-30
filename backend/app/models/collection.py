from sqlalchemy import Column, Integer, String, DateTime, func

from app.models.database import Base


class Collection(Base):
    __tablename__ = "collections"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    name = Column(String, nullable=False)
    description = Column(String, default="")
    embedding_model = Column(String, default="text-embedding-3-small")
    llm_model = Column(String, default="gpt-4o-mini")
    provider = Column(String, default="openai")
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
