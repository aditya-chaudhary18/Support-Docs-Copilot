"""
Framework-agnostic embedding generator for document chunks and queries.
Adheres to PRD Section 9.
"""

from typing import List
from backend.app.services.gemini import get_gemini_service


class DocumentEmbedder:
    """Provides document and query embedding routines."""

    def __init__(self, gemini_service=None):
        self.service = gemini_service or get_gemini_service()

    def embed_chunks(self, chunk_texts: List[str]) -> List[List[float]]:
        """Generate vectors for document chunks."""
        return self.service.embed_documents(chunk_texts)

    def embed_texts(self, texts: List[str]) -> List[List[float]]:
        """Alias for embed_chunks."""
        return self.service.embed_documents(texts)

    def embed_query(self, query: str) -> List[float]:
        """Generate vector for a search query."""
        return self.service.embed_query(query)

    def embed_text(self, text: str) -> List[float]:
        """Alias for embed_query."""
        return self.service.embed_query(text)

