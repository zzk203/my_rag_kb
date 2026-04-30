from typing import List, Optional

from langchain_core.documents import Document
from langchain_text_splitters import RecursiveCharacterTextSplitter

from app.config import settings


class TextSplitter:
    def __init__(
        self,
        chunk_size: Optional[int] = None,
        chunk_overlap: Optional[int] = None,
    ):
        self.chunk_size = chunk_size or settings.chunk_size
        self.chunk_overlap = chunk_overlap or settings.chunk_overlap

    def split_text(self, text: str) -> List[str]:
        splitter = RecursiveCharacterTextSplitter(
            chunk_size=self.chunk_size,
            chunk_overlap=self.chunk_overlap,
            separators=["\n\n", "\n", "\r", " ", ""],
            length_function=len,
            is_separator_regex=False,
        )
        return splitter.split_text(text)

    def split_with_metadata(self, text: str, metadata: Optional[dict] = None) -> List[Document]:
        splitter = RecursiveCharacterTextSplitter(
            chunk_size=self.chunk_size,
            chunk_overlap=self.chunk_overlap,
            separators=["\n\n", "\n", "\r", " ", ""],
            length_function=len,
            is_separator_regex=False,
        )
        doc = Document(page_content=text, metadata=metadata or {})
        return splitter.split_documents([doc])
