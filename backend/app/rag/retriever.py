"""
Vector similarity search retriever adhering to PRD Sections 7.2 and 10.4.
Performs cosine distance nearest-neighbor queries on pgvector document_chunks.
Enforces owner boundaries, document status ('ready'), and distance threshold.
"""

import uuid
import logging
from dataclasses import dataclass, field
from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import select

from backend.app.core.config import get_settings
from backend.app.core.errors import AppException
from backend.app.models.document import Document
from backend.app.models.chunk import DocumentChunk
from backend.app.rag.embedder import DocumentEmbedder

logger = logging.getLogger(__name__)


@dataclass
class RetrievedChunk:
    """Represents a chunk retrieved from the vector database with distance and metadata."""
    chunk_id: uuid.UUID
    document_id: uuid.UUID
    content: str
    distance: float
    metadata: Dict[str, Any] = field(default_factory=dict)

    # Convenience attributes for backwards-compatibility with existing RAG consumers
    filename: str = ""
    chunk_index: int = 0
    page_number: Optional[int] = None
    section_title: Optional[str] = None
    source_location: str = ""
    similarity: float = 0.0

    def __post_init__(self):
        # Synchronize metadata dictionary and direct attributes
        if not self.metadata:
            meta: Dict[str, Any] = {
                "chunk_index": self.chunk_index,
                "source": self.filename,
                "filename": self.filename,
            }
            if self.page_number is not None:
                meta["page_number"] = self.page_number
            if self.section_title is not None:
                meta["section"] = self.section_title
            if self.source_location:
                meta["source_location"] = self.source_location
            self.metadata = meta
        else:
            if not self.filename:
                self.filename = self.metadata.get("filename") or self.metadata.get("source", "")
            if not self.chunk_index and "chunk_index" in self.metadata:
                self.chunk_index = self.metadata["chunk_index"]
            if self.page_number is None and "page_number" in self.metadata:
                self.page_number = self.metadata["page_number"]
            if self.section_title is None and "section" in self.metadata:
                self.section_title = self.metadata["section"]
            if not self.source_location and "source_location" in self.metadata:
                self.source_location = self.metadata["source_location"]

        if self.similarity == 0.0:
            self.similarity = round(max(0.0, min(1.0, 1.0 - self.distance)), 4)


class VectorRetriever:
    """
    Retrieval service executing semantic vector searches on Neon PostgreSQL with pgvector.
    Uses cosine distance (<=> operator) to rank and filter document chunks.
    """

    def __init__(
        self,
        db: Optional[Session] = None,
        top_k: Optional[int] = None,
        distance_threshold: Optional[float] = None,
        similarity_threshold: Optional[float] = None,
        embedder: Optional[DocumentEmbedder] = None,
    ):
        settings = get_settings()
        self.db = db
        self.top_k = top_k if top_k is not None else settings.TOP_K
        self.validate_top_k(self.top_k)

        # Configure distance threshold (lower distance = higher similarity)
        if distance_threshold is not None:
            self.distance_threshold = distance_threshold
        elif similarity_threshold is not None:
            # Cosine distance = 1 - Cosine similarity
            self.distance_threshold = 1.0 - similarity_threshold
        else:
            self.distance_threshold = settings.RETRIEVAL_DISTANCE_THRESHOLD

        self.embedder = embedder or DocumentEmbedder()

    @staticmethod
    def validate_top_k(k: int) -> None:
        """Enforces reasonable bounds on top_k retrieval (1 <= top_k <= 20)."""
        if not isinstance(k, int) or k < 1 or k > 20:
            raise AppException(
                status_code=400,
                code="INVALID_TOP_K",
                message=f"top_k must be an integer between 1 and 20, got {k}.",
            )

    @staticmethod
    def validate_vector_dimension(vector: List[float], expected_dim: int) -> None:
        """Validates that query vector matches the configured embedding dimension."""
        if not isinstance(vector, (list, tuple)):
            raise AppException(
                status_code=400,
                code="INVALID_VECTOR_FORMAT",
                message="Query vector must be a sequence of floats.",
            )
        if len(vector) != expected_dim:
            raise AppException(
                status_code=400,
                code="INVALID_VECTOR_DIMENSION",
                message=f"Query vector dimension ({len(vector)}) does not match system dimension ({expected_dim}).",
            )

    def retrieve(
        self,
        query_embedding: Optional[List[float]] = None,
        db: Optional[Session] = None,
        top_k: Optional[int] = None,
        distance_threshold: Optional[float] = None,
        similarity_threshold: Optional[float] = None,
        document_id: Optional[uuid.UUID] = None,
        owner_id: Optional[uuid.UUID] = None,
        query_vector: Optional[List[float]] = None,
        document_ids: Optional[List[uuid.UUID]] = None,
    ) -> List[RetrievedChunk]:
        """
        Executes vector retrieval using pgvector cosine distance (<=> operator).
        - Validates query vector dimensions
        - Enforces top_k bounds (1 <= top_k <= 20)
        - Filters for READY documents only (excludes uploaded, processing, failed)
        - Filters by optional document_id or list of document_ids (document scope)
        - Filters by optional owner_id
        - Filters by distance threshold
        - Returns list of RetrievedChunk objects ordered by ascending distance
        """
        settings = get_settings()
        target_vec = query_embedding if query_embedding is not None else query_vector
        if not target_vec:
            return []

        # 1. Validate vector dimension
        self.validate_vector_dimension(target_vec, settings.EMBEDDING_DIMENSION)

        # 2. Validate top_k
        effective_top_k = top_k if top_k is not None else self.top_k
        self.validate_top_k(effective_top_k)

        # 3. Resolve distance threshold cutoff
        if distance_threshold is not None:
            eff_dist_threshold = distance_threshold
        elif similarity_threshold is not None:
            eff_dist_threshold = 1.0 - similarity_threshold
        else:
            eff_dist_threshold = self.distance_threshold

        session = db or self.db
        if session is None:
            raise AppException(
                status_code=500,
                code="DATABASE_SESSION_REQUIRED",
                message="A database session is required for vector retrieval.",
            )

        try:
            # 4. Cosine distance operator (<=>) in pgvector
            distance_col = DocumentChunk.embedding.cosine_distance(target_vec).label("distance")

            stmt = (
                select(DocumentChunk, Document.filename, distance_col)
                .join(Document, DocumentChunk.document_id == Document.id)
                .where(
                    Document.status == "ready",
                    DocumentChunk.embedding.is_not(None),
                )
            )

            if document_ids:
                stmt = stmt.where(Document.id.in_(document_ids))
            elif document_id is not None:
                stmt = stmt.where(Document.id == document_id)

            if owner_id is not None:
                stmt = stmt.where(Document.owner_id == owner_id)

            stmt = stmt.order_by(distance_col.asc()).limit(effective_top_k)

            rows = session.execute(stmt).all()

        except Exception as exc:
            logger.error("Error executing vector retrieval: %s", exc)
            if isinstance(exc, AppException):
                raise
            raise AppException(
                status_code=500,
                code="DATABASE_ERROR",
                message="Failed to retrieve document chunks from database.",
            ) from exc

        # 5. Filter by distance threshold and construct RetrievedChunk objects
        retrieved: List[RetrievedChunk] = []
        for chunk, filename, distance in rows:
            dist_val = float(distance) if distance is not None else 1.0

            # Chunks with distance > threshold are discarded (lower distance = higher similarity)
            if dist_val <= eff_dist_threshold:
                metadata: Dict[str, Any] = {
                    "chunk_index": chunk.chunk_index,
                    "source": filename,
                    "filename": filename,
                    "source_location": chunk.source_location,
                }
                if chunk.page_number is not None:
                    metadata["page_number"] = chunk.page_number
                if chunk.section_title is not None:
                    metadata["section"] = chunk.section_title
                if chunk.chunk_metadata:
                    for k, v in chunk.chunk_metadata.items():
                        if k not in metadata and v is not None:
                            metadata[k] = v

                retrieved.append(
                    RetrievedChunk(
                        chunk_id=chunk.id,
                        document_id=chunk.document_id,
                        content=chunk.content,
                        distance=round(dist_val, 4),
                        metadata=metadata,
                        filename=filename,
                        chunk_index=chunk.chunk_index,
                        page_number=chunk.page_number,
                        section_title=chunk.section_title,
                        source_location=chunk.source_location,
                        similarity=round(max(0.0, min(1.0, 1.0 - dist_val)), 4),
                    )
                )

        return retrieved

    def retrieve_by_query(
        self,
        query: str,
        db: Optional[Session] = None,
        top_k: Optional[int] = None,
        distance_threshold: Optional[float] = None,
        similarity_threshold: Optional[float] = None,
        document_id: Optional[uuid.UUID] = None,
        owner_id: Optional[uuid.UUID] = None,
    ) -> List[RetrievedChunk]:
        """
        End-to-end vector retrieval for a user question text:
        1. Query string cleaning / validation
        2. Gemini query embedding generation
        3. Vector dimension validation
        4. pgvector cosine search
        5. Document status ('ready') and optional document_id / owner_id filtering
        6. Cosine distance threshold filtering
        7. Top-K ranking
        """
        cleaned_query = query.strip()
        if not cleaned_query:
            return []

        # Generate embedding for question
        query_vector = self.embedder.embed_query(cleaned_query)

        # Execute retrieval
        return self.retrieve(
            query_embedding=query_vector,
            db=db,
            top_k=top_k,
            distance_threshold=distance_threshold,
            similarity_threshold=similarity_threshold,
            document_id=document_id,
            owner_id=owner_id,
        )
