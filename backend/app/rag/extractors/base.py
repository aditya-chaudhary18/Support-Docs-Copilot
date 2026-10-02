"""
Base structures and interfaces for document text extractors.
Extractors produce structured TextUnit instances that preserve page numbers and section headers.
"""

from dataclasses import dataclass
from typing import Optional, Protocol, List


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
