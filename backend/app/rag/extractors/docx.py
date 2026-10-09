"""
Heading-aware DOCX text extractor integrating LangChain StructuredDocxLoader.
Adheres to PRD Section 6.4.
Preserves hierarchy, headings, tables, and lists.
"""

import logging
from typing import List

from backend.app.core.errors import AppException
from backend.app.rag.extractors.base import (
    TextUnit,
    temporary_file_from_bytes,
    langchain_docs_to_text_units,
)
from backend.app.rag.loaders.docx_loader import StructuredDocxLoader

logger = logging.getLogger(__name__)


class DOCXExtractor:
    """Extracts text sections from DOCX files, preserving heading context via LangChain loader."""

    def extract(self, file_bytes: bytes, filename: str = "document.docx") -> List[TextUnit]:
        if not file_bytes:
            raise AppException(
                status_code=400,
                code="CORRUPT_DOCUMENT",
                message="The provided DOCX file is corrupt or unreadable.",
            )

        with temporary_file_from_bytes(file_bytes, suffix=".docx") as temp_path:
            try:
                loader = StructuredDocxLoader(temp_path)
                docs = loader.load()
            except AppException:
                raise
            except Exception as exc:
                logger.warning("Corrupt or invalid DOCX file '%s': %s", filename, exc)
                raise AppException(
                    status_code=400,
                    code="CORRUPT_DOCUMENT",
                    message="The provided DOCX file is corrupt or unreadable.",
                ) from exc

            units = langchain_docs_to_text_units(docs)

            if not units:
                raise AppException(
                    status_code=422,
                    code="NO_EXTRACTABLE_TEXT",
                    message="No extractable text found in this DOCX document.",
                )

            return units


__all__ = ["DOCXExtractor"]
