"""
Citation builder and hallucination validator adhering to PRD Section 14 and Step 9 requirements.
Resolves source IDs selected by Gemini (S1, S2, ...) into authoritative backend citation metadata
using actual retrieved database chunks.

Guarantees:
- Only backend-owned metadata from actual retrieved chunks is used.
- LLM is NEVER trusted for filenames, document IDs, chunk IDs, pages, sections, or locations.
- Deterministic S1, S2, S3... mapping matching ContextBuilder retrieval rank.
- Deduplication of source IDs preserving first-occurrence order.
- Preservation of model-selected citation order (e.g. [S3, S1] -> S3, S1).
- Discarding invalid / fabricated source IDs (e.g. S99) without crashing or querying DB.
- Insufficient context (sufficient_context=False) strictly yields empty citation list [].
- Empty retrieval strictly yields empty citation list [].
- Missing metadata fields are left None (null) without fabrication.
"""

import re
import uuid
import logging
from typing import List, Dict, Any, Tuple, Optional, Union
from pydantic import BaseModel, Field

from backend.app.rag.retriever import RetrievedChunk

logger = logging.getLogger(__name__)

STANDARD_INSUFFICIENT_MESSAGE = (
    "I could not find enough information in the uploaded documentation to answer this. "
    "Please check that the relevant documentation is uploaded and ready, or try rephrasing your question."
)


class Citation(BaseModel):
    """
    Authoritative citation metadata constructed strictly from backend chunk data.
    Does not include model-generated or guessed metadata.
    """
    source_id: str = Field(description="Deterministic source label (e.g. S1, S2)")
    document_id: uuid.UUID = Field(description="Parent Document UUID")
    chunk_id: uuid.UUID = Field(description="DocumentChunk UUID")
    filename: Optional[str] = Field(default=None, description="Original document filename")
    page: Optional[int] = Field(default=None, description="1-based page number (null if unavailable)")
    section: Optional[str] = Field(default=None, description="Section heading (null if unavailable)")
    page_number: Optional[int] = Field(default=None, description="Alias for page")
    section_title: Optional[str] = Field(default=None, description="Alias for section")
    source_location: Optional[str] = Field(default=None, description="Human-readable location string")
    chunk_index: Optional[int] = Field(default=None, description="Zero-based index of chunk in document")
    excerpt: Optional[str] = Field(default=None, description="Excerpt of chunk content for UI preview")
    similarity: Optional[float] = Field(default=None, description="Cosine similarity score (0.0 - 1.0)")

    model_config = {"arbitrary_types_allowed": True}


class CitationBuilder:
    """
    Builds and validates verifiable citations from retrieved database chunks.
    Resolves model-cited source IDs to real backend chunk metadata.
    """

    def build(
        self,
        retrieved_chunks: Union[List[RetrievedChunk], Dict[str, RetrievedChunk]],
        cited_source_ids: List[str],
        sufficient_context: bool = True,
    ) -> List[Citation]:
        """
        Builds a list of Citation objects from retrieved chunks and model-cited source IDs.

        Args:
            retrieved_chunks: Either an ordered list of RetrievedChunk objects (from vector retrieval)
                              or a pre-mapped dict of {source_id: RetrievedChunk} (from ContextBuilder).
            cited_source_ids: List of source IDs selected by Gemini (e.g. ["S1", "S3"]).
            sufficient_context: Boolean flag indicating if generation had sufficient context.
                                If False, returns [] regardless of cited_source_ids.

        Returns:
            List[Citation]: Validated citations ordered as requested by Gemini, containing only
                            authoritative backend metadata.
        """
        # Rule 11: If sufficient_context is false, citation list MUST be empty
        if not sufficient_context:
            return []

        # Rule 12: If retrieval produced no chunks, return empty
        if not retrieved_chunks:
            return []

        # Rule 4: Source ID mapping (S1 -> chunk 0, S2 -> chunk 1, ...)
        source_map: Dict[str, RetrievedChunk] = {}
        if isinstance(retrieved_chunks, dict):
            source_map = {k.strip().upper(): v for k, v in retrieved_chunks.items()}
        else:
            for idx, chunk in enumerate(retrieved_chunks, start=1):
                source_map[f"S{idx}"] = chunk

        # Rule 9 & 10: Deduplicate source IDs while preserving first-occurrence order
        seen_ids = set()
        ordered_unique_ids: List[str] = []
        for raw_id in cited_source_ids:
            if not isinstance(raw_id, str):
                continue
            clean_id = re.sub(r"[\[\]]", "", raw_id).strip().upper()
            if clean_id and clean_id not in seen_ids:
                seen_ids.add(clean_id)
                ordered_unique_ids.append(clean_id)

        # Rule 8: Discard invalid source IDs and resolve valid IDs to real chunks
        citations: List[Citation] = []
        for sid in ordered_unique_ids:
            if sid not in source_map:
                logger.warning("Stripped invalid / unretrieved source ID from model output: '%s'", sid)
                continue

            chunk = source_map[sid]

            # Rule 6 & 13: Authoritative metadata only, never fabricate
            page_val = chunk.page_number if chunk.page_number is not None else None
            section_val = chunk.section_title if chunk.section_title else None
            filename_val = chunk.filename if chunk.filename else None
            loc_val = chunk.source_location if chunk.source_location else None

            # Clean preview excerpt (capped at 400 chars with ellipsis if longer)
            excerpt = chunk.content[:400].strip()
            if len(chunk.content) > 400:
                excerpt += "…"

            cit = Citation(
                source_id=sid,
                document_id=chunk.document_id,
                chunk_id=chunk.chunk_id,
                filename=filename_val,
                page=page_val,
                section=section_val,
                page_number=page_val,
                section_title=section_val,
                source_location=loc_val,
                chunk_index=chunk.chunk_index,
                excerpt=excerpt,
                similarity=chunk.similarity if hasattr(chunk, "similarity") else None,
            )
            citations.append(cit)

        return citations

    def build_citations(
        self,
        raw_answer: str,
        sufficient_context: bool,
        raw_cited_ids: List[str],
        sources_by_id: Union[Dict[str, RetrievedChunk], List[RetrievedChunk]],
    ) -> Tuple[str, List[Dict[str, Any]], str]:
        """
        Validates model citations, strips invalid inline markers from the answer,
        and returns structured source snapshot dictionaries.

        Returns:
            Tuple[final_answer, validated_sources_dicts, answer_status]
        """
        # If model explicitly reported insufficient evidence
        if not sufficient_context:
            return STANDARD_INSUFFICIENT_MESSAGE, [], "insufficient_context"

        # If model claimed sufficient context but cited_source_ids is empty,
        # extract inline citation markers like [S1], [S2] directly from the answer text
        effective_cited_ids = list(raw_cited_ids)
        if not effective_cited_ids and raw_answer:
            inline_markers = re.findall(r"\[(S\d+)\]", raw_answer, re.IGNORECASE)
            if inline_markers:
                effective_cited_ids = inline_markers

        # Build citations using authoritative method
        citations = self.build(
            retrieved_chunks=sources_by_id,
            cited_source_ids=effective_cited_ids,
            sufficient_context=sufficient_context,
        )

        # Grounding violation check: if answer claimed sufficient context but cited 0 valid sources
        if not citations:
            logger.warning("Grounding violation: Model claimed sufficient context but cited zero valid sources.")
            return STANDARD_INSUFFICIENT_MESSAGE, [], "insufficient_context"

        valid_ids = {cit.source_id for cit in citations}

        # Remove any inline markers in answer text for non-existent sources (e.g. [S99])
        cleaned_answer = raw_answer
        all_markers = set(re.findall(r"\[(S\d+)\]", cleaned_answer, re.IGNORECASE))
        for marker in all_markers:
            upper_marker = marker.upper()
            if upper_marker not in valid_ids:
                cleaned_answer = re.sub(rf"\[{marker}\]", "", cleaned_answer)

        # Clean multiple spaces left by stripped tags
        cleaned_answer = re.sub(r" +", " ", cleaned_answer).strip()

        # Build dict snapshots for database persistence and API responses
        sources_list: List[Dict[str, Any]] = []
        for cit in citations:
            source_record = {
                "source_id": cit.source_id,
                "document_id": str(cit.document_id),
                "filename": cit.filename or "",
                "page_number": cit.page_number,
                "section_title": cit.section_title,
                "source_location": cit.source_location or "",
                "chunk_id": str(cit.chunk_id),
                "chunk_index": cit.chunk_index if cit.chunk_index is not None else 0,
                "excerpt": cit.excerpt or "",
                "similarity": cit.similarity if cit.similarity is not None else 0.0,
            }
            sources_list.append(source_record)

        return cleaned_answer, sources_list, "answered"


def build_citations(
    retrieved_chunks: Union[List[RetrievedChunk], Dict[str, RetrievedChunk]],
    cited_source_ids: List[str],
    sufficient_context: bool = True,
) -> List[Citation]:
    """Convenience helper function to build validated citations."""
    return CitationBuilder().build(
        retrieved_chunks=retrieved_chunks,
        cited_source_ids=cited_source_ids,
        sufficient_context=sufficient_context,
    )
