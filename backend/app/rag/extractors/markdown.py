"""
Heading-aware Markdown text extractor integrating LangChain HeadingAwareMarkdownLoader.
Adheres to PRD Section 6.4.
Preserves headings, code blocks, lists, and tables intact.
"""

import logging
from typing import List

from backend.app.core.errors import AppException
from backend.app.rag.extractors.base import (
    TextUnit,
    temporary_file_from_bytes,
    langchain_docs_to_text_units,
)
from backend.app.rag.loaders.markdown_loader import HeadingAwareMarkdownLoader

logger = logging.getLogger(__name__)


class MarkdownExtractor:
    """Extracts sections from Markdown documents via LangChain loader, tracking heading hierarchy."""

    def extract(self, file_bytes: bytes, filename: str = "document.md") -> List[TextUnit]:
        if not file_bytes:
            raise AppException(
                status_code=400,
                code="EMPTY_DOCUMENT",
                message="The provided Markdown document is empty.",
            )

        with temporary_file_from_bytes(file_bytes, suffix=".md") as temp_path:
            try:
                loader = HeadingAwareMarkdownLoader(temp_path)
                docs = loader.load()
            except AppException:
                raise
            except Exception as exc:
                logger.warning("Error reading Markdown file '%s': %s", filename, exc)
                raise AppException(
                    status_code=400,
                    code="CORRUPT_DOCUMENT",
                    message="The provided Markdown file is corrupt or unreadable.",
                ) from exc

            units = langchain_docs_to_text_units(docs)

            if not units:
                raise AppException(
                    status_code=422,
                    code="NO_EXTRACTABLE_TEXT",
                    message="No extractable text found in this Markdown document.",
                )

            return units


__all__ = ["MarkdownExtractor"]
