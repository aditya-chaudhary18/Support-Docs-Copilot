"""
Base structures and interfaces for document text extractors.
Extractors produce structured TextUnit instances that preserve page numbers, section headers,
and source locations, bridging LangChain document loaders to the RAG pipeline.
"""

from dataclasses import dataclass
from typing import Optional, Protocol, List
from langchain_core.documents import Document

from backend.app.rag.loaders.base import temporary_file_from_bytes


@dataclass
class TextUnit:
    """Represents a structured unit of extracted text before cleaning and chunking."""
    content: str
    page_number: Optional[int] = None
    section_title: Optional[str] = None
    source_location: str = ""
    char_start: int = 0
    char_end: int = 0


class DocumentExtractor(Protocol):
    """Protocol for document text extractors."""

    def extract(self, file_bytes: bytes, filename: str) -> List[TextUnit]:
        """Extract text units from raw bytes."""
        ...


def langchain_doc_to_text_unit(doc: Document, fallback_page: Optional[int] = None) -> Optional[TextUnit]:
    """
    Adapter converting a LangChain Document into an internal TextUnit.
    Preserves 1-based page numbers, section titles, and source location strings.
    """
    content = doc.page_content or ""
    if not content.strip():
        return None

    metadata = doc.metadata or {}

    # Extract 1-based page number (LangChain PyPDFLoader stores 0-indexed 'page')
    page_num = metadata.get("page_number")
    if page_num is None and "page" in metadata:
        try:
            page_num = int(metadata["page"]) + 1
        except (ValueError, TypeError):
            page_num = None
    elif page_num is None:
        page_num = fallback_page

    section_title = metadata.get("section_title")
    source_location = metadata.get("source_location")

    if not source_location:
        if page_num is not None:
            source_location = f"Page {page_num}"
        elif section_title:
            source_location = f"Section: {section_title}"
        else:
            source_location = metadata.get("source", "")

    return TextUnit(
        content=content,
        page_number=page_num,
        section_title=section_title,
        source_location=source_location,
        char_start=metadata.get("char_start", 0),
        char_end=metadata.get("char_end", 0),
    )


def langchain_docs_to_text_units(docs: List[Document]) -> List[TextUnit]:
    """Converts a sequence of LangChain Documents into valid TextUnit instances."""
    units: List[TextUnit] = []
    for doc in docs:
        unit = langchain_doc_to_text_unit(doc)
        if unit:
            units.append(unit)
    return units


__all__ = [
    "TextUnit",
    "DocumentExtractor",
    "temporary_file_from_bytes",
    "langchain_doc_to_text_unit",
    "langchain_docs_to_text_units",
]
