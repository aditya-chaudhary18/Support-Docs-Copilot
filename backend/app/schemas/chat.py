"""
Chat API schemas adhering to PRD Section 15.6.
"""

import uuid
from typing import List, Optional
from pydantic import BaseModel, Field, AliasChoices, field_validator


class SourceCitation(BaseModel):
    source_id: str
    document_id: str
    filename: str
    page_number: Optional[int] = None
    section_title: Optional[str] = None
    source_location: str
    chunk_index: int
    excerpt: str
    similarity: float
    chunk_id: Optional[str] = None

    model_config = {"extra": "ignore"}


class ChatRequest(BaseModel):
    question: str = Field(
        ...,
        validation_alias=AliasChoices("question", "message"),
        min_length=1,
        max_length=2000,
        description="User technical query",
    )
    conversation_id: Optional[uuid.UUID] = Field(
        None,
        description="Optional ID of existing conversation thread",
    )
    document_ids: Optional[List[uuid.UUID]] = Field(
        None,
        description="Optional scoped document IDs for RAG retrieval",
    )

    @field_validator("question")
    @classmethod
    def validate_question(cls, v: str) -> str:
        cleaned = v.strip()
        if not cleaned:
            raise ValueError("Question cannot be empty or whitespace-only.")
        if len(v) > 2000:
            raise ValueError("Question exceeds maximum allowed length of 2000 characters.")
        return cleaned



class ChatResponse(BaseModel):
    conversation_id: uuid.UUID
    message_id: uuid.UUID
    answer: str
    answer_status: str
    sources: List[SourceCitation] = Field(default_factory=list)
    sufficient_context: Optional[bool] = None
    citations: Optional[List[SourceCitation]] = None

