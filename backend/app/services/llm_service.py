from typing import Optional

from langchain_openai import ChatOpenAI, OpenAIEmbeddings

from app.config import settings


class LLMFactory:

    @staticmethod
    def create_llm(
        provider: str,
        model: str,
        api_key: Optional[str] = None,
        base_url: Optional[str] = None,
        **kwargs,
    ):
        if provider == "openai":
            return ChatOpenAI(
                model=model,
                openai_api_key=api_key or settings.openai_api_key,
                openai_api_base=base_url or settings.openai_base_url,
                temperature=kwargs.pop("temperature", 0),
                **kwargs,
            )
        elif provider == "ollama":
            try:
                from langchain_ollama import ChatOllama
                return ChatOllama(model=model, temperature=kwargs.pop("temperature", 0), **kwargs)
            except ImportError:
                raise ImportError("langchain-ollama is required for Ollama support")
        raise ValueError(f"Unknown provider: {provider}")

    @staticmethod
    def create_embeddings(
        provider: str,
        model: str,
        api_key: Optional[str] = None,
        base_url: Optional[str] = None,
        **kwargs,
    ):
        if provider == "openai":
            return OpenAIEmbeddings(
                model=model,
                openai_api_key=api_key or settings.openai_api_key,
                openai_api_base=base_url or settings.openai_base_url,
                **kwargs,
            )
        elif provider == "ollama":
            try:
                from langchain_ollama import OllamaEmbeddings
                return OllamaEmbeddings(model=model, **kwargs)
            except ImportError:
                raise ImportError("langchain-ollama is required for Ollama support")
        raise ValueError(f"Unknown provider: {provider}")
