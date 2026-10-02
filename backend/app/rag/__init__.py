"""RAG pipeline modules (extractors, cleaners, chunkers, embedders, retrievers, context builders, prompt builders)."""

from backend.app.rag.retriever import VectorRetriever, RetrievedChunk
from backend.app.rag.context_builder import (
    ContextBuilder,
    Context,
    ContextBundle,
    ContextItem,
    build_context,
)
from backend.app.rag.prompt import (
    PromptBuilder,
    build_rag_prompt,
    SYSTEM_INSTRUCTIONS,
)
from backend.app.rag.citation_builder import Citation, CitationBuilder, build_citations
from backend.app.rag.pipeline import RagPipeline, RAGPreparationResult

__all__ = [
    "VectorRetriever",
    "RetrievedChunk",
    "ContextBuilder",
    "Context",
    "ContextBundle",
    "ContextItem",
    "build_context",
    "PromptBuilder",
    "build_rag_prompt",
    "SYSTEM_INSTRUCTIONS",
    "Citation",
    "CitationBuilder",
    "build_citations",
    "RagPipeline",
    "RAGPreparationResult",
]
