"""
Conversation and Message API schemas adhering to PRD Section 15.7 - 15.8.
"""

import uuid
from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, ConfigDict, Field


class MessageResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    role: str
    content: str
    sources: Optional[List[dict]] = None
    answer_status: Optional[str] = None
    created_at: datetime


class ConversationResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    title: str
    created_at: datetime
    updated_at: datetime
    message_count: int = 0
    selected_document_ids: Optional[List[str]] = None
    selected_documents: Optional[List[dict]] = None


class ConversationDetailResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    title: str
    created_at: datetime
    updated_at: datetime
    selected_document_ids: Optional[List[str]] = None
    selected_documents: Optional[List[dict]] = None
    messages: List[MessageResponse] = Field(default_factory=list)


class ConversationListResponse(BaseModel):
    items: List[ConversationResponse]
    total: int


class UpdateConversationScopeRequest(BaseModel):
    selected_document_ids: Optional[List[str]] = None
