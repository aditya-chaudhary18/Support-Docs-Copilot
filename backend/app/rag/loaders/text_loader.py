"""
LangChain-compatible document loader for plain text documents.
Preserves line numbers and paragraph structure for citation accuracy.
"""

import os
from pathlib import Path
from typing import Iterator, List, Union, Optional
from langchain_core.document_loaders import BaseLoader
from langchain_core.documents import Document

from backend.app.core.errors import AppException


class LineAwareTextLoader(BaseLoader):
    """
    LangChain BaseLoader that loads plain text files into Documents,
    preserving line ranges and paragraph boundaries in metadata.
    """

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
        """Lazy load paragraphs as LangChain Documents with line metadata."""
        if not os.path.exists(self.file_path):
            raise AppException(
                status_code=400,
                code="FILE_NOT_FOUND",
                message=f"Text file not found: {self.file_path}",
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
                message="Text file encoding must be UTF-8.",
            )

        if not text.strip():
            raise AppException(
                status_code=400,
                code="EMPTY_DOCUMENT",
                message="The provided text document is empty.",
            )

        lines = text.splitlines()
        current_lines: List[str] = []
        start_line = 1

        def make_doc(end_line: int) -> Optional[Document]:
            nonlocal current_lines, start_line
            content = "\n".join(current_lines).strip()
            current_lines = []
            if not content:
                return None
            loc = f"Lines {start_line}–{end_line}" if start_line != end_line else f"Line {start_line}"
            return Document(
                page_content=content,
                metadata={
                    "source": self.file_path,
                    "section_title": "Document Body",
                    "source_location": loc,
                    "start_line": start_line,
                    "end_line": end_line,
                },
            )

        for idx, line in enumerate(lines, start=1):
            if not line.strip():
                if current_lines:
                    doc = make_doc(idx - 1)
                    if doc:
                        yield doc
                start_line = idx + 1
            else:
                current_lines.append(line)

        if current_lines:
            doc = make_doc(len(lines))
            if doc:
                yield doc

    def load(self) -> List[Document]:
        """Load all text paragraphs synchronously."""
        return list(self.lazy_load())


__all__ = ["LineAwareTextLoader"]
