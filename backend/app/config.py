from pathlib import Path
from typing import Optional

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    openai_api_key: Optional[str] = None
    openai_base_url: Optional[str] = None
    openai_model: str = "gpt-4o-mini"
    embedding_model: str = "text-embedding-3-small"

    chunk_size: int = 1000
    chunk_overlap: int = 200
    top_k: int = 5

    vector_store_dir: str = str(Path(__file__).parent.parent / "data" / "chroma")
    data_dir: str = str(Path(__file__).parent.parent / "data" / "uploads")
    database_url: str = f"sqlite:///{Path(__file__).parent.parent / 'data' / 'knowledge.db'}"

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8", "extra": "ignore"}


settings = Settings()
