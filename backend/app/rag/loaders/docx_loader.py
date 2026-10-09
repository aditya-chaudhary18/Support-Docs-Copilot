
"""
LangChain-compatible document loader for DOCX documents.
Preserves heading hierarchy, sections, and table structures in document order.
"""

import os
import logging
from pathlib import Path
from typing import Iterator, List, Union, Optional
import docx
from docx.text.paragraph import Paragraph
from docx.table import Table
from langchain_core.document_loaders import BaseLoader
from langchain_core.documents import Document

from backend.app.core.errors import AppException

logger = logging.getLogger(__name__)


class StructuredDocxLoader(BaseLoader):
    """
    LangChain BaseLoader that loads DOCX documents into structured Documents,
    preserving heading hierarchy and table contents in true document body order.
    """

    def __init__(self, file_path: Union[str, Path]):
        self.file_path = str(file_path)

    def lazy_load(self) -> Iterator[Document]:
        """Lazy load DOCX sections as LangChain Documents."""
        if not os.path.exists(self.file_path):
            raise AppException(
                status_code=400,
                code="FILE_NOT_FOUND",
                message=f"DOCX file not found: {self.file_path}",
            )

        try:
            doc = docx.Document(self.file_path)
        except Exception as exc:
            logger.warning("Corrupt or invalid DOCX file '%s': %s", self.file_path, exc)
            raise AppException(
                status_code=400,
                code="CORRUPT_DOCUMENT",
                message="The provided DOCX file is corrupt or unreadable.",
            ) from exc

        current_heading = "General"
        current_paragraphs: List[str] = []

        def make_doc() -> Optional[Document]:
            nonlocal current_paragraphs
            text = "\n\n".join(p for p in current_paragraphs if p.strip()).strip()
            current_paragraphs = []
            if not text:
                return None
            return Document(
                page_content=text,
                metadata={
                    "source": self.file_path,
                    "section_title": current_heading,
                    "source_location": f"Section: {current_heading}",
                },
            )

        for el in doc.element.body:
            tag = el.tag.split("}")[-1]
            if tag == "p":
                p = Paragraph(el, doc)
                style_name = p.style.name if p.style else ""
                p_text = p.text.strip()
                if not p_text:
                    continue

                if "Heading" in style_name:
                    out_doc = make_doc()
                    if out_doc:
                        yield out_doc
                    current_heading = p_text
                else:
                    current_paragraphs.append(p_text)
            elif tag == "tbl":
                tbl = Table(el, doc)
                table_rows = []
                for row in tbl.rows:
                    cells = [cell.text.strip() for cell in row.cells]
                    if any(cells):
                        table_rows.append(" | ".join(cells))
                if table_rows:
                    current_paragraphs.append("\n".join(table_rows))

        out_doc = make_doc()
        if out_doc:
            yield out_doc

    def load(self) -> List[Document]:
        """Load all DOCX sections synchronously."""
        return list(self.lazy_load())


__all__ = ["StructuredDocxLoader"]
