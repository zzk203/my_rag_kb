import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.models.database import Base, engine
from app.utils.logging_config import setup_logging
from app.api import collections, documents, search, chat


@asynccontextmanager
async def lifespan(app: FastAPI):
    os.makedirs(os.path.dirname(engine.url.database.replace("sqlite:///", "")), exist_ok=True)
    setup_logging(os.getenv("DEBUG", "").lower() in ("true", "1", "yes"))
    Base.metadata.create_all(bind=engine)
    yield


app = FastAPI(
    title="My RAG Knowledge Base",
    version="0.1.0",
    lifespan=lifespan,
)

ALLOWED_ORIGINS = os.getenv("CORS_ORIGINS", "http://localhost:3000").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=False,
    allow_methods=["GET", "POST", "PUT", "DELETE"],
    allow_headers=["Content-Type", "Authorization"],
)

app.include_router(collections.router, prefix="/api/v1")
app.include_router(documents.router, prefix="/api/v1")
app.include_router(search.router, prefix="/api/v1")
app.include_router(chat.router, prefix="/api/v1")


@app.get("/health")
def health():
    return {"status": "ok"}
