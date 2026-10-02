"""
Document extractors factory and registry.
"""

from backend.app.core.errors import AppException
from backend.app.rag.extractors.base import TextUnit, DocumentExtractor
from backend.app.rag.extractors.pdf import PDFExtractor
from backend.app.rag.extractors.docx import DOCXExtractor
from backend.app.rag.extractors.markdown import MarkdownExtractor
from backend.app.rag.extractors.txt import TXTExtractor


def get_extractor(file_type: str) -> DocumentExtractor:
    """Return extractor appropriate for normalized file extension."""
    norm_type = file_type.lower().lstrip(".")
    if norm_type == "pdf":
        return PDFExtractor()
    elif norm_type in ("docx", "doc"):
        return DOCXExtractor()
    elif norm_type in ("md", "markdown"):
        return MarkdownExtractor()
    elif norm_type in ("txt", "text"):
        return TXTExtractor()
    else:
        raise AppException(
            status_code=415,
            code="UNSUPPORTED_FILE_TYPE",
            message=f"Unsupported file type '{file_type}'. Supported types: PDF, DOCX, TXT, Markdown.",
        )


__all__ = [
    "TextUnit",
    "DocumentExtractor",
    "PDFExtractor",
    "DOCXExtractor",
    "MarkdownExtractor",
    "TXTExtractor",
    "get_extractor",
]
