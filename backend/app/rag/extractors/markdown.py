"""
Heading-aware Markdown text extractor.
Adheres to PRD Section 6.4.
Preserves headings, code blocks, lists, and tables intact.
"""

import re
import logging
from typing import List

from backend.app.core.errors import AppException
from backend.app.rag.extractors.base import TextUnit

logger = logging.getLogger(__name__)


class MarkdownExtractor:
    """Extracts sections from Markdown documents, tracking heading hierarchy."""

    HEADING_REGEX = re.compile(r"^(#{1,6})\s+(.+)$", re.MULTILINE)

    def extract(self, file_bytes: bytes, filename: str = "document.md") -> List[TextUnit]:
        try:
            text = file_bytes.decode("utf-8")
        except UnicodeDecodeError:
            try:
                text = file_bytes.decode("latin-1")
            except Exception as exc:
                raise AppException(
                    status_code=400,
                    code="INVALID_ENCODING",
                    message="Markdown file encoding must be UTF-8.",
                ) from exc

        if not text.strip():
            raise AppException(
                status_code=400,
                code="EMPTY_DOCUMENT",
                message="The provided Markdown document is empty.",
            )

        units: List[TextUnit] = []
        lines = text.splitlines()

        current_heading = "Overview"
        current_lines: List[str] = []
        in_code_block = False

        def flush_unit():
            nonlocal current_lines
            content = "\n".join(current_lines).strip()
            if content:
                units.append(
                    TextUnit(
                        content=content,
                        section_title=current_heading,
                        source_location=f"Section: {current_heading}",
                    )
                )
            current_lines = []

        for line in lines:
            stripped = line.strip()
            if stripped.startswith("```"):
                in_code_block = not in_code_block
                current_lines.append(line)
                continue

            if not in_code_block and stripped.startswith("#"):
                heading_match = self.HEADING_REGEX.match(line)
                if heading_match:
                    flush_unit()
                    current_heading = heading_match.group(2).strip()
                    continue

            current_lines.append(line)

        flush_unit()

        if not units:
            raise AppException(
                status_code=422,
                code="NO_EXTRACTABLE_TEXT",
                message="No extractable text found in this Markdown document.",
            )

        return units
