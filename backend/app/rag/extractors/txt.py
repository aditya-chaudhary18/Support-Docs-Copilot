"""
Line and paragraph aware plain text extractor integrating LangChain LineAwareTextLoader.
Adheres to PRD Section 6.4.
Preserves line numbers for traceability.
"""

import logging
from typing import List

from backend.app.core.errors import AppException
from backend.app.rag.extractors.base import (
    TextUnit,
    temporary_file_from_bytes,
    langchain_docs_to_text_units,
)
from backend.app.rag.loaders.text_loader import LineAwareTextLoader

logger = logging.getLogger(__name__)


class TXTExtractor:
    """Extracts text units from plain text files via LangChain loader, preserving line ranges."""

    def extract(self, file_bytes: bytes, filename: str = "document.txt") -> List[TextUnit]:
        if not file_bytes:
            raise AppException(
                status_code=400,
                code="EMPTY_DOCUMENT",
                message="The provided text document is empty.",
            )

        with temporary_file_from_bytes(file_bytes, suffix=".txt") as temp_path:
            try:
                loader = LineAwareTextLoader(temp_path)
                docs = loader.load()
            except AppException:
                raise
            except Exception as exc:
                logger.warning("Error reading text file '%s': %s", filename, exc)
                raise AppException(
                    status_code=400,
                    code="CORRUPT_DOCUMENT",
                    message="The provided text document is corrupt or unreadable.",
                ) from exc

            units = langchain_docs_to_text_units(docs)

            if not units:
                raise AppException(
                    status_code=422,
                    code="NO_EXTRACTABLE_TEXT",
                    message="No extractable text found in this text document.",
                )

            return units


__all__ = ["TXTExtractor"]
