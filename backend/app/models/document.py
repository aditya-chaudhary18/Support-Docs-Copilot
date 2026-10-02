"""
Document Database Model adhering to PRD Section 11.3.
Stores document metadata, processing status, and lifecycle stages.
Original bytes reside in Cloudflare R2; vectors reside in document_chunks.
"""

import uuid
from datetime import datetime, timezone
from sqlalchemy import (
    String,
    BigInteger,
    Integer,
    Text,
    DateTime,
    ForeignKey,
    UniqueConstraint,
    Index,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from backend.app.db.base import Base


class Document(Base):
    __tablename__ = "documents"
    __table_args__ = (
        UniqueConstraint("owner_id", "content_hash", name="uq_documents_owner_content_hash"),
        Index("ix_documents_owner_status", "owner_id", "status"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    owner_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    filename: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
    )
    file_type: Mapped[str] = mapped_column(
        String(10),
        nullable=False,
    )
    file_size: Mapped[int] = mapped_column(
        BigInteger,
        nullable=False,
    )
    content_hash: Mapped[str] = mapped_column(
        String(64),
        nullable=False,
    )
    r2_object_key: Mapped[str] = mapped_column(
        String(512),
        nullable=False,
    )
    status: Mapped[str] = mapped_column(
        String(20),
        default="uploaded",
        nullable=False,
        index=True,
    )
    processing_stage: Mapped[str | None] = mapped_column(
        String(30),
        nullable=True,
    )
    chunk_count: Mapped[int] = mapped_column(
        Integer,
        default=0,
        nullable=False,
    )
    page_count: Mapped[int | None] = mapped_column(
        Integer,
        nullable=True,
    )
    processing_error: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )
    embedding_model: Mapped[str | None] = mapped_column(
        String(100),
        nullable=True,
    )
    uploaded_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
    processed_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    # Relationships
    owner = relationship("User", back_populates="documents")
    chunks = relationship("DocumentChunk", back_populates="document", cascade="all, delete-orphan")

    @property
    def storage_key(self) -> str:
        """Alias for r2_object_key conforming to storage terminology."""
        return self.r2_object_key

