"""
Dashboard REST endpoints returning user-scoped metrics and statistics.
"""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import select, func

from backend.app.db.session import get_db
from backend.app.models.user import User
from backend.app.models.document import Document
from backend.app.models.chunk import DocumentChunk
from backend.app.models.conversation import Conversation
from backend.app.schemas.dashboard import DashboardStatsResponse
from backend.app.api.deps import get_current_user

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


@router.get(
    "/stats",
    response_model=DashboardStatsResponse,
    summary="Get aggregated knowledge base statistics for authenticated user",
)
def get_dashboard_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> DashboardStatsResponse:
    # 1. Indexed documents: status == 'ready' for current user
    indexed_docs = db.scalar(
        select(func.count(Document.id)).where(
            Document.owner_id == current_user.id,
            Document.status == "ready",
        )
    ) or 0

    # 2. Conversations count for current user
    conv_count = db.scalar(
        select(func.count(Conversation.id)).where(
            Conversation.owner_id == current_user.id,
        )
    ) or 0

    # 3. Processing ingestion count for current user
    processing_count = db.scalar(
        select(func.count(Document.id)).where(
            Document.owner_id == current_user.id,
            Document.status == "processing",
        )
    ) or 0

    # 4. Total chunks across current user's documents
    chunks_count = db.scalar(
        select(func.count(DocumentChunk.id))
        .join(Document, DocumentChunk.document_id == Document.id)
        .where(Document.owner_id == current_user.id)
    ) or 0

    return DashboardStatsResponse(
        indexed_documents=indexed_docs,
        conversations=conv_count,
        processing_ingestion=processing_count,
        indexed_chunks=chunks_count,
    )
