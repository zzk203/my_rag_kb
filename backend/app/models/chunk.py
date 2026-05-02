from sqlalchemy import Column, Integer, String, DateTime, func, ForeignKey, Text

from app.models.database import Base


class Chunk(Base):
    __tablename__ = "chunks"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    document_id = Column(Integer, ForeignKey("documents.id", ondelete="CASCADE"), nullable=False, index=True)
    chunk_index = Column(Integer, nullable=False)
    content = Column(Text, nullable=False)
    page_number = Column(Integer, nullable=True)
    meta_json = Column(String, default="{}")
    chroma_id = Column(String, default="")
    created_at = Column(DateTime, server_default=func.now())
