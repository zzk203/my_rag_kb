import hashlib
import os
import uuid
from pathlib import Path
from typing import List, Optional

from app.config import settings


class ParsedChunk:
    def __init__(self, content: str, page_number: Optional[int] = None, metadata: Optional[dict] = None):
        self.content = content
        self.page_number = page_number
        self.metadata = metadata or {}


class DoclingParser:

    SUPPORTED_EXTENSIONS = {".pdf", ".docx", ".pptx", ".md", ".txt", ".html", ".htm", ".png", ".jpg", ".jpeg"}

    def __init__(self):
        self._docling_converter = None

    def _get_converter(self):
        if self._docling_converter is None:
            try:
                from docling.document_converter import DocumentConverter
                self._docling_converter = DocumentConverter()
            except ImportError:
                self._docling_converter = False
        return self._docling_converter

    def parse(self, file_path: str) -> List[ParsedChunk]:
        ext = Path(file_path).suffix.lower()
        converter = self._get_converter()

        if converter:
            try:
                return self._parse_with_docling(file_path)
            except Exception:
                pass

        return self._parse_basic(file_path, ext)

    def _parse_with_docling(self, file_path: str) -> List[ParsedChunk]:
        result = self._docling_converter.convert(file_path)
        text = result.document.export_to_markdown()
        return [ParsedChunk(content=text, metadata={"source": "docling"})]

    def _parse_basic(self, file_path: str, ext: str) -> List[ParsedChunk]:
        if ext == ".pdf":
            return self._parse_pdf(file_path)
        elif ext == ".docx":
            return self._parse_docx(file_path)
        elif ext == ".pptx":
            return self._parse_pptx(file_path)
        elif ext in {".md", ".txt"}:
            return self._parse_text(file_path)
        elif ext in {".html", ".htm"}:
            return self._parse_html(file_path)
        else:
            return [ParsedChunk(content=f"Unsupported file type: {ext}")]

    def _parse_pdf(self, file_path: str) -> List[ParsedChunk]:
        try:
            from pypdf import PdfReader
            reader = PdfReader(file_path)
            chunks = []
            for i, page in enumerate(reader.pages):
                text = page.extract_text()
                if text.strip():
                    chunks.append(ParsedChunk(content=text.strip(), page_number=i + 1))
            return chunks
        except Exception as e:
            return [ParsedChunk(content=f"PDF parse error: {e}")]

    def _parse_docx(self, file_path: str) -> List[ParsedChunk]:
        try:
            from docx import Document as DocxDocument
            doc = DocxDocument(file_path)
            text = "\n".join(p.text for p in doc.paragraphs if p.text.strip())
            return [ParsedChunk(content=text)] if text.strip() else [ParsedChunk(content="")]
        except Exception as e:
            return [ParsedChunk(content=f"DOCX parse error: {e}")]

    def _parse_pptx(self, file_path: str) -> List[ParsedChunk]:
        try:
            from pptx import Presentation
            prs = Presentation(file_path)
            texts = []
            for slide in prs.slides:
                slide_texts = []
                for shape in slide.shapes:
                    if hasattr(shape, "text") and shape.text.strip():
                        slide_texts.append(shape.text)
                if slide_texts:
                    texts.append("\n".join(slide_texts))
            return [ParsedChunk(content=t) for t in texts]
        except Exception as e:
            return [ParsedChunk(content=f"PPTX parse error: {e}")]

    def _parse_text(self, file_path: str) -> List[ParsedChunk]:
        with open(file_path, "r", encoding="utf-8", errors="replace") as f:
            content = f.read()
        return [ParsedChunk(content=content)]

    def _parse_html(self, file_path: str) -> List[ParsedChunk]:
        try:
            from bs4 import BeautifulSoup
            with open(file_path, "r", encoding="utf-8", errors="replace") as f:
                soup = BeautifulSoup(f.read(), "html.parser")
            text = soup.get_text(separator="\n", strip=True)
            return [ParsedChunk(content=text)]
        except Exception as e:
            return [ParsedChunk(content=f"HTML parse error: {e}")]


def save_upload_file(file_bytes: bytes, filename: str) -> str:
    upload_dir = Path(settings.data_dir)
    upload_dir.mkdir(parents=True, exist_ok=True)

    stem = Path(filename).stem
    ext = Path(filename).suffix
    unique_name = f"{stem}_{uuid.uuid4().hex[:8]}{ext}"
    file_path = upload_dir / unique_name

    with open(file_path, "wb") as f:
        f.write(file_bytes)

    return str(file_path)


def compute_file_hash(file_bytes: bytes) -> str:
    return hashlib.sha256(file_bytes).hexdigest()
