"""
Base classes and utilities for LangChain document loaders.
Provides safe temporary file management and standard document interfaces.
"""

import os
import tempfile
import logging
from contextlib import contextmanager
from typing import Generator
from langchain_core.document_loaders import BaseLoader
from langchain_core.documents import Document

logger = logging.getLogger(__name__)


@contextmanager
def temporary_file_from_bytes(file_bytes: bytes, suffix: str = "") -> Generator[str, None, None]:
    """
    Creates a temporary file on the local filesystem with raw bytes,
    yields its absolute path, and guarantees deletion in finally block.
    Avoids permanent local document storage and Windows file-locking issues.
    """
    temp_file = tempfile.NamedTemporaryFile(suffix=suffix, delete=False)
    try:
        temp_file.write(file_bytes)
        temp_file.flush()
        temp_file.close()
        yield temp_file.name
    finally:
        if os.path.exists(temp_file.name):
            try:
                os.unlink(temp_file.name)
            except OSError as exc:
                logger.warning("Failed to remove temporary file '%s': %s", temp_file.name, exc)


__all__ = ["BaseLoader", "Document", "temporary_file_from_bytes"]
