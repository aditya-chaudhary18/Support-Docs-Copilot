"""
Page-aware PDF text extractor using pypdf.
Adheres to PRD Section 6.4 and 7.1.
Enforces page limits and ensures every text unit is tied to a 1-based page number.
"""

import io
import logging
from typing import List
import pypdf

from backend.app.core.config import get_settings
from backend.app.core.errors import AppException
from backend.app.rag.extractors.base import TextUnit

logger = logging.getLogger(__name__)


class PDFExtractor:
    """Extracts text page-by-page from PDF files."""

    def __init__(self):
        self.settings = get_settings()

    def extract(self, file_bytes: bytes, filename: str = "document.pdf") -> List[TextUnit]:
        try:
            reader = pypdf.PdfReader(io.BytesIO(file_bytes))
        except Exception as exc:
            logger.warning("Corrupt or invalid PDF file '%s': %s", filename, exc)
            raise AppException(
                status_code=400,
                code="CORRUPT_DOCUMENT",
                message="The provided PDF file is corrupt or unreadable.",
            ) from exc

        total_pages = len(reader.pages)
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

        units: List[TextUnit] = []
        for idx, page in enumerate(reader.pages, start=1):
            try:
                page_text = page.extract_text() or ""
            except Exception as page_exc:
                logger.warning("Error extracting text on page %d of '%s': %s", idx, filename, page_exc)
                page_text = ""

            if page_text.strip():
                units.append(
                    TextUnit(
                        content=page_text,
                        page_number=idx,
                        source_location=f"Page {idx}",
                    )
                )

        if not units:
            raise AppException(
                status_code=422,
                code="NO_EXTRACTABLE_TEXT",
                message="No extractable text found in this document. Scanned documents and image-only PDFs are not supported in MVP.",
            )

        return units
