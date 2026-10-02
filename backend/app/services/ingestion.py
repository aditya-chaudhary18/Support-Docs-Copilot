"""
Document ingestion pipeline service adhering to PRD Section 7.1.
Executes extraction, cleaning, chunking, embedding generation, and atomic pgvector persistence.
Designed to run in background tasks with comprehensive error trapping and stage tracking.
"""

import uuid
import logging
from datetime import datetime, timezone
from sqlalchemy import delete

from backend.app.db.session import SessionLocal
from backend.app.models.document import Document
from backend.app.models.chunk import DocumentChunk
from backend.app.rag.extractors import get_extractor
from backend.app.rag.cleaner import clean_text_units
from backend.app.rag.chunker import DocumentChunker
from backend.app.rag.embedder import DocumentEmbedder
from backend.app.core.config import get_settings

from typing import Optional
from backend.app.services.storage import get_storage_service
from backend.app.core.errors import AppException

logger = logging.getLogger(__name__)


def process_document_pipeline(
    document_id: uuid.UUID,
    file_bytes: Optional[bytes] = None,
    filename: Optional[str] = None,
    file_type: Optional[str] = None,
) -> None:
    """
    Synchronous / background worker function to process an uploaded document.
    Downloads original file from R2 via storage_key if file_bytes is not supplied.
    Executes stages: extracting -> cleaning -> chunking -> embedding -> storing -> ready.
    Ensures transactional safety and cleans up partial chunks on failure.
    """
    settings = get_settings()
    db = SessionLocal()

    try:
        doc = db.get(Document, document_id)
        if not doc:
            logger.error("Ingestion failed: document %s not found in DB.", document_id)
            return

        doc.status = "processing"
        doc.processing_stage = "downloading"
        db.commit()

        # If file_bytes not provided in-memory, download directly from private R2 storage
        if not file_bytes:
            logger.info("Downloading document %s from R2 key: %s", document_id, doc.r2_object_key)
            storage = get_storage_service()
            file_bytes = storage.download_file(doc.r2_object_key)

        effective_filename = filename or doc.filename
        effective_file_type = file_type or doc.file_type

        # 1. Text Extraction
        doc.processing_stage = "extracting"
        db.commit()
        logger.info("Extracting text for document %s (%s)", document_id, effective_filename)
        extractor = get_extractor(effective_file_type)
        raw_units = extractor.extract(file_bytes, effective_filename)

        # 2. Text Cleaning
        doc.processing_stage = "cleaning"
        db.commit()
        cleaned_units = clean_text_units(raw_units, is_pdf=(effective_file_type == "pdf"))

        total_chars = sum(len(u.content) for u in cleaned_units)
        if total_chars < settings.MIN_EXTRACTED_CHARS:
            raise AppException(
                status_code=422,
                code="INSUFFICIENT_EXTRACTED_TEXT",
                message=f"Extracted content length ({total_chars} chars) is below minimum required {settings.MIN_EXTRACTED_CHARS} chars.",
            )

        # 3. Chunking
        doc.processing_stage = "chunking"
        db.commit()
        chunker = DocumentChunker()
        chunks = chunker.chunk_units(cleaned_units)
        if not chunks:
            raise AppException(
                status_code=422,
                code="NO_CHUNKS_PRODUCED",
                message="Document produced zero usable chunks after processing.",
            )

        # 4. Embeddings Generation (Batched)
        doc.processing_stage = "embedding"
        doc.embedding_model = settings.GEMINI_EMBEDDING_MODEL
        db.commit()

        embedder = DocumentEmbedder()
        chunk_texts = [c.content for c in chunks]
        vectors = embedder.embed_chunks(chunk_texts)

        if len(vectors) != len(chunks):
            raise AppException(
                status_code=500,
                code="EMBEDDING_COUNT_MISMATCH",
                message=f"Embedding vector count ({len(vectors)}) does not match chunk count ({len(chunks)}).",
            )

        # Validate every embedding vector dimension strictly
        expected_dim = settings.EMBEDDING_DIMENSION
        for idx, vec in enumerate(vectors):
            if not isinstance(vec, (list, tuple)) or len(vec) != expected_dim:
                actual_dim = len(vec) if isinstance(vec, (list, tuple)) else "non-sequence"
                raise AppException(
                    status_code=500,
                    code="EMBEDDING_DIMENSION_MISMATCH",
                    message=f"Embedding vector at index {idx} has invalid dimension {actual_dim}. Expected {expected_dim}.",
                )

        # 5. Atomic Storage in Neon pgvector
        doc.processing_stage = "storing"
        db.commit()

        # Idempotency: delete any existing chunks before insertion
        db.execute(delete(DocumentChunk).where(DocumentChunk.document_id == document_id))

        chunk_rows = []
        for chunk, vector in zip(chunks, vectors):
            chunk_rows.append(
                DocumentChunk(
                    document_id=document_id,
                    chunk_index=chunk.chunk_index,
                    content=chunk.content,
                    embedding=vector,
                    page_number=chunk.page_number,
                    section_title=chunk.section_title,
                    source_location=chunk.source_location,
                    chunk_metadata={
                        "char_count": chunk.char_count,
                        "embedding_model": settings.GEMINI_EMBEDDING_MODEL,
                    },
                )
            )

        db.add_all(chunk_rows)

        # Mark document ready
        doc.status = "ready"
        doc.processing_stage = None
        doc.chunk_count = len(chunks)
        doc.processing_error = None
        doc.processed_at = datetime.now(timezone.utc)
        db.commit()

        logger.info("Successfully ingested document %s (%d chunks ready in Neon pgvector)", document_id, len(chunks))

    except Exception as exc:
        db.rollback()
        logger.error("Document %s ingestion failed: %s", document_id, exc, exc_info=True)
        try:
            # Transaction safety: clean up any partially inserted chunks
            db.execute(delete(DocumentChunk).where(DocumentChunk.document_id == document_id))

            doc = db.get(Document, document_id)
            if doc:
                doc.status = "failed"
                doc.processing_stage = None
                if isinstance(exc, AppException):
                    user_safe_err = exc.message
                elif isinstance(exc, ValueError):
                    user_safe_err = str(exc)
                else:
                    user_safe_err = "Document processing encountered an error during ingestion."
                doc.processing_error = user_safe_err[:255]
                db.commit()
        except Exception as inner_exc:
            logger.error("Failed to clean up and set failed status on document %s: %s", document_id, inner_exc)
    finally:
        db.close()

