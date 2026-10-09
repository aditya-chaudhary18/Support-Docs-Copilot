"""
LangChain-compatible document loader for Markdown documents.
Preserves headings, section boundaries, code blocks, lists, and tables.
"""

import os
import re
from pathlib import Path
from typing import Iterator, List, Union, Optional
from langchain_core.document_loaders import BaseLoader
from langchain_core.documents import Document

from backend.app.core.errors import AppException


class HeadingAwareMarkdownLoader(BaseLoader):
    """
    LangChain BaseLoader that parses Markdown files into section-based Documents,
    tracking heading hierarchy and preserving code blocks.
    """

    HEADING_REGEX = re.compile(r"^(#{1,6})\s+(.+)$", re.MULTILINE)

    def __init__(
        self,
        file_path: Union[str, Path],
        encoding: Optional[str] = "utf-8",
        autodetect_encoding: bool = True,
    ):
        self.file_path = str(file_path)
        self.encoding = encoding
        self.autodetect_encoding = autodetect_encoding

    def lazy_load(self) -> Iterator[Document]:
        """Lazy load Markdown sections as LangChain Documents."""
        if not os.path.exists(self.file_path):
            raise AppException(
                status_code=400,
                code="FILE_NOT_FOUND",
                message=f"Markdown file not found: {self.file_path}",
            )

        text = None
        encodings_to_try = [self.encoding] if self.encoding else []
        if self.autodetect_encoding:
            for enc in ["utf-8", "latin-1"]:
                if enc not in encodings_to_try:
                    encodings_to_try.append(enc)

        for enc in encodings_to_try:
            try:
                with open(self.file_path, "r", encoding=enc) as f:
                    text = f.read()
                break
            except (UnicodeDecodeError, LookupError):
                continue

        if text is None:
            raise AppException(
                status_code=400,
                code="INVALID_ENCODING",
                message="Markdown file encoding must be UTF-8.",
            )

        if not text.strip():
            raise AppException(
                status_code=400,
                code="EMPTY_DOCUMENT",
                message="The provided Markdown document is empty.",
            )

        lines = text.splitlines()
        current_heading = "Overview"
        current_lines: List[str] = []
        in_code_block = False

        def make_doc() -> Optional[Document]:
            nonlocal current_lines
            content = "\n".join(current_lines).strip()
            current_lines = []
            if not content:
                return None
            return Document(
                page_content=content,
                metadata={
                    "source": self.file_path,
                    "section_title": current_heading,
                    "source_location": f"Section: {current_heading}",
                },
            )

        for line in lines:
            stripped = line.strip()
            if stripped.startswith("```"):
                in_code_block = not in_code_block
                current_lines.append(line)
                continue

            if not in_code_block and stripped.startswith("#"):
                heading_match = self.HEADING_REGEX.match(line)
                if heading_match:
                    out_doc = make_doc()
                    if out_doc:
                        yield out_doc
                    current_heading = heading_match.group(2).strip()
                    continue

            current_lines.append(line)

        out_doc = make_doc()
        if out_doc:
            yield out_doc

    def load(self) -> List[Document]:
        """Load all Markdown sections synchronously."""
        return list(self.lazy_load())


__all__ = ["HeadingAwareMarkdownLoader"]
