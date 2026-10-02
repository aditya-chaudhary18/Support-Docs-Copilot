"""
Deterministic, structure-aware recursive chunker adhering to PRD Section 8.
Preserves structural boundaries (pages in PDFs, headings in Markdown/DOCX),
maintains sliding overlap, merges small fragments, and records provenance metadata.
"""

from dataclasses import dataclass
from typing import List, Optional
import re

from backend.app.core.config import get_settings
from backend.app.core.errors import AppException
from backend.app.rag.extractors.base import TextUnit


@dataclass
class Chunk:
    """Represents a chunk prepared for embedding and vector storage."""
    chunk_index: int
    content: str
    page_number: Optional[int]
    section_title: Optional[str]
    source_location: str
    char_count: int


class DocumentChunker:
    """Recursively partitions text units into deterministic chunks with metadata."""

    def __init__(
        self,
        chunk_size: Optional[int] = None,
        chunk_overlap: Optional[int] = None,
        min_chunk_chars: Optional[int] = None,
    ):
        settings = get_settings()
        self.chunk_size = chunk_size or settings.CHUNK_SIZE
        self.chunk_overlap = chunk_overlap or settings.CHUNK_OVERLAP
        self.min_chunk_chars = min_chunk_chars or settings.MIN_CHUNK_CHARS
        self.max_chunks = settings.MAX_CHUNKS_PER_DOCUMENT

        if self.chunk_overlap >= self.chunk_size:
            raise ValueError(
                f"chunk_overlap ({self.chunk_overlap}) must be strictly less than chunk_size ({self.chunk_size})"
            )

    def chunk_units(self, units: List[TextUnit]) -> List[Chunk]:
        """
        Split a list of text units into indexed chunks.
        Never crosses unit boundaries (guarantees PDFs retain single-page precision).
        """
        all_chunks: List[Chunk] = []
        current_index = 0

        for unit in units:
            unit_chunks = self._chunk_single_text(unit.content)
            for text_piece in unit_chunks:
                if len(all_chunks) >= self.max_chunks:
                    raise AppException(
                        status_code=400,
                        code="MAX_CHUNKS_EXCEEDED",
                        message=f"Document produced over {self.max_chunks} chunks, exceeding system limits.",
                    )

                chunk = Chunk(
                    chunk_index=current_index,
                    content=text_piece,
                    page_number=unit.page_number,
                    section_title=unit.section_title,
                    source_location=unit.source_location,
                    char_count=len(text_piece),
                )
                all_chunks.append(chunk)
                current_index += 1

        return all_chunks

    def _chunk_single_text(self, text: str) -> List[str]:
        """Split text of a single unit respecting paragraphs, sentences, and overlap."""
        if not text:
            return []

        if len(text) <= self.chunk_size:
            return [text]

        # Break text into paragraphs first
        paragraphs = [p.strip() for p in text.split("\n\n") if p.strip()]
        pieces: List[str] = []

        for p in paragraphs:
            if len(p) <= self.chunk_size:
                pieces.append(p)
            else:
                # Sub-split long paragraph by sentence boundaries
                sentences = re.split(r"(?<=[.!?])\s+", p)
                current_sentence_group: List[str] = []
                current_len = 0
                for s in sentences:
                    s_len = len(s)
                    if current_len + s_len + 1 > self.chunk_size and current_sentence_group:
                        pieces.append(" ".join(current_sentence_group))
                        current_sentence_group = [s]
                        current_len = s_len
                    else:
                        current_sentence_group.append(s)
                        current_len += s_len + 1
                if current_sentence_group:
                    pieces.append(" ".join(current_sentence_group))

        # Now assemble pieces into chunks with sliding overlap
        chunks: List[str] = []
        current_chunk_parts: List[str] = []
        current_chunk_len = 0

        for piece in pieces:
            piece_len = len(piece)
            if current_chunk_len + piece_len + 2 <= self.chunk_size:
                current_chunk_parts.append(piece)
                current_chunk_len += piece_len + 2
            else:
                if current_chunk_parts:
                    chunk_text = "\n\n".join(current_chunk_parts).strip()
                    if len(chunk_text) >= self.min_chunk_chars:
                        chunks.append(chunk_text)

                    # Calculate overlap from the end of the previous chunk
                    overlap_seed = chunk_text[-self.chunk_overlap:] if len(chunk_text) > self.chunk_overlap else chunk_text
                    current_chunk_parts = [overlap_seed, piece]
                    current_chunk_len = len(overlap_seed) + piece_len + 2
                else:
                    # Single piece is larger than chunk_size, hard-split it
                    sub_chunks = self._hard_split(piece)
                    chunks.extend(sub_chunks)
                    current_chunk_parts = []
                    current_chunk_len = 0

        if current_chunk_parts:
            final_text = "\n\n".join(current_chunk_parts).strip()
            if len(final_text) >= self.min_chunk_chars or not chunks:
                chunks.append(final_text)
            elif chunks:
                # Merge small trailing fragment with previous chunk
                chunks[-1] = (chunks[-1] + "\n\n" + final_text).strip()

        return chunks

    def _hard_split(self, text: str) -> List[str]:
        """Last resort character split when a continuous word/token exceeds chunk size."""
        chunks = []
        start = 0
        step = self.chunk_size - self.chunk_overlap
        while start < len(text):
            chunk = text[start: start + self.chunk_size].strip()
            if chunk:
                chunks.append(chunk)
            start += step
        return chunks
