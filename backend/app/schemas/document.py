"""
Document API request and response schemas adhering to PRD Section 15.2 - 15.5.
"""

import uuid
from datetime import datetime, timezone
from typing import List, Optional
from pydantic import BaseModel, ConfigDict, Field


class DocumentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    filename: str
    file_type: str
    file_size: int
    status: str
    processing_stage: Optional[str] = None
    chunk_count: int = 0
    page_count: Optional[int] = None
    processing_error: Optional[str] = None
    uploaded_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    processed_at: Optional[datetime] = None


class DocumentListResponse(BaseModel):
    items: List[DocumentResponse]
    total: int


class ChunkResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    document_id: uuid.UUID
    chunk_index: int
    content: str
    page_number: Optional[int] = None
    section_title: Optional[str] = None
    token_count: Optional[int] = None


class ChunkListResponse(BaseModel):
    items: List[ChunkResponse]
    total: int
