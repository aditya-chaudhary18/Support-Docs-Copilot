"""
Line and paragraph aware plain text extractor.
Adheres to PRD Section 6.4.
Preserves line numbers for traceability.
"""

import logging
from typing import List

from backend.app.core.errors import AppException
from backend.app.rag.extractors.base import TextUnit

logger = logging.getLogger(__name__)


class TXTExtractor:
    """Extracts text units from plain text files, preserving line ranges."""

    def extract(self, file_bytes: bytes, filename: str = "document.txt") -> List[TextUnit]:
        try:
            text = file_bytes.decode("utf-8")
        except UnicodeDecodeError:
            try:
                text = file_bytes.decode("latin-1")
            except Exception as exc:
                raise AppException(
                    status_code=400,
                    code="INVALID_ENCODING",
                    message="Text file encoding must be UTF-8.",
                ) from exc

        if not text.strip():
            raise AppException(
                status_code=400,
                code="EMPTY_DOCUMENT",
                message="The provided text document is empty.",
            )

        lines = text.splitlines()
        units: List[TextUnit] = []

        current_lines: List[str] = []
        start_line = 1

        def flush_unit(end_line: int):
            nonlocal current_lines, start_line
            content = "\n".join(current_lines).strip()
            if content:
                loc = f"Lines {start_line}–{end_line}" if start_line != end_line else f"Line {start_line}"
                units.append(
                    TextUnit(
                        content=content,
                        section_title="Document Body",
                        source_location=loc,
                    )
                )
            current_lines = []

        for idx, line in enumerate(lines, start=1):
            if not line.strip():
                if current_lines:
                    flush_unit(idx - 1)
                start_line = idx + 1
            else:
                current_lines.append(line)

        if current_lines:
            flush_unit(len(lines))

        if not units:
            raise AppException(
                status_code=422,
                code="NO_EXTRACTABLE_TEXT",
                message="No extractable text found in this text document.",
            )

        return units
