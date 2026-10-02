"""
Heading-aware DOCX text extractor using python-docx.
Adheres to PRD Section 6.4.
Preserves hierarchy, headings, tables, and lists.
"""

import io
import logging
from typing import List
import docx

from backend.app.core.errors import AppException
from backend.app.rag.extractors.base import TextUnit

logger = logging.getLogger(__name__)


class DOCXExtractor:
    """Extracts text sections from DOCX files, preserving heading context."""

    def extract(self, file_bytes: bytes, filename: str = "document.docx") -> List[TextUnit]:
        try:
            doc = docx.Document(io.BytesIO(file_bytes))
        except Exception as exc:
            logger.warning("Corrupt or invalid DOCX file '%s': %s", filename, exc)
            raise AppException(
                status_code=400,
                code="CORRUPT_DOCUMENT",
                message="The provided DOCX file is corrupt or unreadable.",
            ) from exc

        units: List[TextUnit] = []
        current_heading = "General"
        current_paragraphs: List[str] = []

        def flush_unit():
            nonlocal current_paragraphs
            text = "\n\n".join(p for p in current_paragraphs if p.strip()).strip()
            if text:
                units.append(
                    TextUnit(
                        content=text,
                        section_title=current_heading,
                        source_location=f"Section: {current_heading}",
                    )
                )
            current_paragraphs = []

        for p in doc.paragraphs:
            style_name = p.style.name if p.style else ""
            p_text = p.text.strip()
            if not p_text:
                continue

            if "Heading" in style_name:
                flush_unit()
                current_heading = p_text
            else:
                current_paragraphs.append(p_text)

        # Also extract table contents
        for table in doc.tables:
            table_rows = []
            for row in table.rows:
                cells = [cell.text.strip() for cell in row.cells]
                if any(cells):
                    table_rows.append(" | ".join(cells))
            if table_rows:
                current_paragraphs.append("\n".join(table_rows))

        flush_unit()

        if not units:
            raise AppException(
                status_code=422,
                code="NO_EXTRACTABLE_TEXT",
                message="No extractable text found in this DOCX document.",
            )

        return units
