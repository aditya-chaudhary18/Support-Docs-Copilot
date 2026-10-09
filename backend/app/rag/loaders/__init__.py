"""
LangChain Document Loaders integration module.
Provides LangChain loaders for PDF, DOCX, TXT, and Markdown files with metadata preservation.
"""

from typing import Union
from pathlib import Path
from langchain_core.document_loaders import BaseLoader
from langchain_core.documents import Document
from langchain_community.document_loaders import PyPDFLoader, TextLoader

from backend.app.core.errors import AppException
from backend.app.rag.loaders.base import temporary_file_from_bytes
from backend.app.rag.loaders.text_loader import LineAwareTextLoader
from backend.app.rag.loaders.docx_loader import StructuredDocxLoader
from backend.app.rag.loaders.markdown_loader import HeadingAwareMarkdownLoader


def get_langchain_loader(
    file_type: str,
    file_path: Union[str, Path],
    **kwargs,
) -> BaseLoader:
    """
    Factory function returning the appropriate LangChain BaseLoader for the given file type.
    """
    norm_type = file_type.lower().lstrip(".")
    path_str = str(file_path)

    if norm_type == "pdf":
        return PyPDFLoader(path_str, extract_images=kwargs.get("extract_images", False))
    elif norm_type in ("docx", "doc"):
        return StructuredDocxLoader(path_str)
    elif norm_type in ("md", "markdown"):
        return HeadingAwareMarkdownLoader(path_str, **kwargs)
    elif norm_type in ("txt", "text"):
        return LineAwareTextLoader(path_str, **kwargs)
    else:
        raise AppException(
            status_code=415,
            code="UNSUPPORTED_FILE_TYPE",
            message=f"Unsupported file type '{file_type}'. Supported types: PDF, DOCX, TXT, Markdown.",
        )


__all__ = [
    "BaseLoader",
    "Document",
    "PyPDFLoader",
    "TextLoader",
    "LineAwareTextLoader",
    "StructuredDocxLoader",
    "HeadingAwareMarkdownLoader",
    "get_langchain_loader",
    "temporary_file_from_bytes",
]
