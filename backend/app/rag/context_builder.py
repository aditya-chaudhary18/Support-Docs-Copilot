"""
Context builder adhering to PRD Sections 7.2, 13.3, and 14.
Transforms retrieved chunks into structured LLM context:
- Assigns deterministic source IDs (S1, S2, S3, ...) in retrieval order.
- Formats delimited context blocks explicit about source boundaries.
- Preserves all chunk metadata without fabrication.
- Handles empty retrieval safely (has_context = False).
- Enforces configurable context budget (MAX_CONTEXT_CHARACTERS / MAX_CONTEXT_CHARS),
  preserving highest-ranked chunks and avoiding arbitrary chunk cuts.

This module is responsible ONLY for transforming retrieved chunks into structured context.
It does NOT perform vector retrieval, generate embeddings, call Gemini, or build final citations.
"""

import uuid
from typing import List, Dict, Optional, Any
from pydantic import BaseModel, Field

from backend.app.core.config import get_settings
from backend.app.rag.retriever import RetrievedChunk


class ContextItem(BaseModel):
    """
    A single context element with deterministic source ID, content, and preserved metadata.
    Does not fabricate missing fields.
    """
    source_id: str
    chunk_id: uuid.UUID
    document_id: uuid.UUID
    content: str
    metadata: Dict[str, Any] = Field(default_factory=dict)

    # Convenience fields mirrored from metadata — null when unavailable
    filename: Optional[str] = None
    page_number: Optional[int] = None
    section_title: Optional[str] = None
    chunk_index: Optional[int] = None
    source_location: Optional[str] = None
    distance: Optional[float] = None
    similarity: Optional[float] = None

    model_config = {"arbitrary_types_allowed": True}


class Context(BaseModel):
    """
    Structured context representation suitable for passing to the prompt and generation layers.

    Attributes:
        items: Ordered list of ContextItem objects (S1, S2, S3...).
        formatted_text: Deterministic formatted context string for LLM consumption.
        formatted_context: Backward-compatible alias for formatted_text.
        has_context: False if retrieval was empty, True otherwise.
        sources_by_id: Deterministic mapping of source ID (e.g. 'S1') to RetrievedChunk.
        total_chars: Total character count of the formatted context blocks.
    """
    items: List[ContextItem] = Field(default_factory=list)
    formatted_text: str = ""
    formatted_context: str = ""
    has_context: bool = False
    sources_by_id: Dict[str, RetrievedChunk] = Field(default_factory=dict)
    total_chars: int = 0

    model_config = {"arbitrary_types_allowed": True}


# ContextBundle is provided as a backward-compatible alias for Context
ContextBundle = Context


class ContextBuilder:
    """
    Transforms retrieved chunks into structured, labeled LLM context.

    Responsibilities:
    - Assign deterministic source IDs (S1, S2, S3...) matching retrieval rank.
    - Format chunks with readable metadata headers and explicit <<<CONTEXT ... CONTEXT>>> boundaries.
    - Preserve all available metadata (filename, page, section, chunk_index, similarity).
    - Handle empty retrieval explicitly (has_context = False, formatted_text = "").
    - Enforce MAX_CONTEXT_CHARACTERS budget, dropping lowest-ranked chunks first
      while keeping highest-ranked chunks intact.
    """

    def __init__(self, max_context_chars: Optional[int] = None):
        settings = get_settings()
        self.max_context_chars = (
            max_context_chars
            or getattr(settings, "MAX_CONTEXT_CHARACTERS", None)
            or getattr(settings, "MAX_CONTEXT_CHARS", 6000)
        )

    def build_context(self, chunks: List[RetrievedChunk]) -> Context:
        """
        Transforms retrieved chunks into labeled context items [S1], [S2], etc.
        Drops lower-ranked chunks if total context length exceeds max_context_chars.
        Returns a Context object with items, formatted text, source mapping, and has_context flag.
        """
        if not chunks:
            return Context(
                items=[],
                formatted_text="",
                formatted_context="",
                has_context=False,
                sources_by_id={},
                total_chars=0,
            )

        items: List[ContextItem] = []
        sources_by_id: Dict[str, RetrievedChunk] = {}
        formatted_blocks: List[str] = []
        total_chars = 0

        for idx, chunk in enumerate(chunks, start=1):
            source_id = f"S{idx}"

            # Format header with available metadata — never fabricate missing fields
            block = self._format_block(source_id, chunk)
            block_len = len(block)

            # Budget gate: drop lower-ranked chunks if adding this block exceeds the limit,
            # but always include at least the top-ranked chunk even if it exceeds the budget.
            if total_chars + block_len > self.max_context_chars and formatted_blocks:
                break

            # Build ContextItem preserving all available metadata without fabrication
            item = ContextItem(
                source_id=source_id,
                chunk_id=chunk.chunk_id,
                document_id=chunk.document_id,
                content=chunk.content,
                metadata=self._extract_metadata(chunk),
                filename=chunk.filename or None,
                page_number=chunk.page_number,
                section_title=chunk.section_title or None,
                chunk_index=chunk.chunk_index,
                source_location=chunk.source_location or None,
                distance=chunk.distance if hasattr(chunk, "distance") else None,
                similarity=chunk.similarity if hasattr(chunk, "similarity") else None,
            )

            items.append(item)
            sources_by_id[source_id] = chunk
            formatted_blocks.append(block)
            total_chars += block_len

        formatted_str = "\n\n".join(formatted_blocks)

        return Context(
            items=items,
            formatted_text=formatted_str,
            formatted_context=formatted_str,
            has_context=True,
            sources_by_id=sources_by_id,
            total_chars=total_chars,
        )

    @staticmethod
    def _format_block(source_id: str, chunk: RetrievedChunk) -> str:
        """
        Formats a single retrieved chunk into a deterministic, delimited context block.

        Format:
            [S1] Document: installation-guide.pdf | Page: 4 | Section: Installation
            <<<CONTEXT
            <chunk content>
            CONTEXT>>>
        """
        meta_parts: List[str] = []

        if chunk.filename:
            meta_parts.append(f"Document: {chunk.filename}")

        if chunk.page_number is not None:
            meta_parts.append(f"Page: {chunk.page_number}")
        elif chunk.source_location and not chunk.source_location.startswith("Section:"):
            meta_parts.append(f"Location: {chunk.source_location}")

        if chunk.section_title:
            meta_parts.append(f"Section: {chunk.section_title}")

        if meta_parts:
            header = f"[{source_id}] " + " | ".join(meta_parts)
        else:
            header = f"[{source_id}]"

        return f"{header}\n<<<CONTEXT\n{chunk.content}\nCONTEXT>>>"

    @staticmethod
    def _extract_metadata(chunk: RetrievedChunk) -> Dict[str, Any]:
        """
        Extracts and returns all available metadata from a retrieved chunk.
        Does not fabricate missing values — absent fields are omitted from the dict.
        """
        meta: Dict[str, Any] = {}

        if chunk.chunk_index is not None:
            meta["chunk_index"] = chunk.chunk_index
        if chunk.filename:
            meta["filename"] = chunk.filename
        if chunk.page_number is not None:
            meta["page_number"] = chunk.page_number
        if chunk.section_title:
            meta["section"] = chunk.section_title
        if chunk.source_location:
            meta["source_location"] = chunk.source_location
        if hasattr(chunk, "distance") and chunk.distance is not None:
            meta["distance"] = chunk.distance
        if hasattr(chunk, "similarity") and chunk.similarity is not None:
            meta["similarity"] = chunk.similarity

        # Merge any extra metadata from the chunk itself, skipping empty/null values for known fields
        if chunk.metadata:
            for k, v in chunk.metadata.items():
                if k in ("filename", "source") and not v:
                    continue
                if k not in meta and v is not None:
                    meta[k] = v

        return meta


def build_context(
    chunks: List[RetrievedChunk],
    max_context_chars: Optional[int] = None,
) -> Context:
    """Helper function to transform retrieved chunks into structured Context."""
    return ContextBuilder(max_context_chars=max_context_chars).build_context(chunks)
