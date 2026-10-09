"""
Page-aware PDF text extractor integrating LangChain's PyPDFLoader.
Adheres to PRD Section 6.4 and 7.1.
Enforces page limits, safe temporary file cleanup, and ensures every text unit is tied to a 1-based page number.
"""

import logging
from typing import List
from langchain_community.document_loaders import PyPDFLoader

from backend.app.core.config import get_settings
from backend.app.core.errors import AppException
from backend.app.rag.extractors.base import (
    TextUnit,
    temporary_file_from_bytes,
    langchain_docs_to_text_units,
)

logger = logging.getLogger(__name__)


class PDFExtractor:
    """Extracts text page-by-page from PDF files using LangChain PyPDFLoader."""

    def __init__(self):
        self.settings = get_settings()

    def extract(self, file_bytes: bytes, filename: str = "document.pdf") -> List[TextUnit]:
        if not file_bytes:
            raise AppException(
                status_code=400,
                code="EMPTY_DOCUMENT",
                message="The provided PDF contains no pages.",
            )

        with temporary_file_from_bytes(file_bytes, suffix=".pdf") as temp_path:
            try:
                loader = PyPDFLoader(temp_path, extract_images=False)
                docs = loader.load()
            except AppException:
                raise
            except Exception as exc:
                logger.warning("Corrupt or invalid PDF file '%s': %s", filename, exc)
                raise AppException(
                    status_code=400,
                    code="CORRUPT_DOCUMENT",
                    message="The provided PDF file is corrupt or unreadable.",
                ) from exc

            total_pages = len(docs)
            if total_pages == 0:
                raise AppException(
                    status_code=400,
                    code="EMPTY_DOCUMENT",
                    message="The provided PDF contains no pages.",
                )

            if total_pages > self.settings.MAX_PDF_PAGES:
                raise AppException(
                    status_code=400,
                    code="PDF_TOO_MANY_PAGES",
                    message=f"PDF contains {total_pages} pages, which exceeds the limit of {self.settings.MAX_PDF_PAGES} pages.",
                )

            units = langchain_docs_to_text_units(docs)

            if not units:
                raise AppException(
                    status_code=422,
                    code="NO_EXTRACTABLE_TEXT",
                    message="No extractable text found in this document. Scanned documents and image-only PDFs are not supported in MVP.",
                )

            return units


__all__ = ["PDFExtractor"]
