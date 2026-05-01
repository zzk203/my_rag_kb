from pathlib import Path
from typing import Optional

from pydantic_settings import BaseSettings


_BACKEND_DIR = Path(__file__).parent.parent


class Settings(BaseSettings):
    openai_api_key: Optional[str] = None
    openai_base_url: Optional[str] = None
    openai_model: str = "gpt-4o-mini"
    embedding_model: str = "text-embedding-3-small"
    embedding_api_key: Optional[str] = None
    embedding_base_url: Optional[str] = None

    chunk_size: int = 1000
    chunk_overlap: int = 200
    top_k: int = 5

    vector_store_dir: str = str(_BACKEND_DIR / "data" / "chroma")
    data_dir: str = str(_BACKEND_DIR / "data" / "uploads")
    database_url: str = f"sqlite:///{_BACKEND_DIR / 'data' / 'knowledge.db'}"

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8", "extra": "ignore"}


_env_file = _BACKEND_DIR / ".env"
if not _env_file.exists():
    _env_file = _BACKEND_DIR.parent / ".env"

settings = Settings(_env_file=str(_env_file) if _env_file.exists() else None)
