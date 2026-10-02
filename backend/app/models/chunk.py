"""
DocumentChunk Database Model adhering to PRD Section 10.3 and 11.4.
Stores partitioned chunk text, source location metadata, and pgvector embeddings.
"""

import uuid
from datetime import datetime, timezone
from sqlalchemy import (
    Integer,
    Text,
    DateTime,
    ForeignKey,
    UniqueConstraint,
    Index,
    JSON,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from pgvector.sqlalchemy import Vector

from backend.app.db.base import Base
from backend.app.core.config import get_settings

settings = get_settings()


class DocumentChunk(Base):
    __tablename__ = "document_chunks"
    __table_args__ = (
        UniqueConstraint("document_id", "chunk_index", name="uq_document_chunks_doc_chunk_idx"),
        Index("ix_document_chunks_document_id", "document_id"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    document_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("documents.id", ondelete="CASCADE"),
        nullable=False,
    )
    chunk_index: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
    )
    content: Mapped[str] = mapped_column(
        Text,
        nullable=False,
    )
    embedding = mapped_column(
        Vector(settings.EMBEDDING_DIMENSION),
        nullable=True,
    )
    page_number: Mapped[int | None] = mapped_column(
        Integer,
        nullable=True,
    )
    section_title: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )
    source_location: Mapped[str] = mapped_column(
        Text,
        nullable=False,
    )
    chunk_metadata: Mapped[dict | None] = mapped_column(
        "metadata",
        JSON,
        nullable=True,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    # Relationships
    document = relationship("Document", back_populates="chunks")
