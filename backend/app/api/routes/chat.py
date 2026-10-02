"""
Chat REST Endpoints adhering to PRD Section 15.6.
Executes question retrieval, hallucination-gated generation, and conversation persistence.
"""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from backend.app.db.session import get_db
from backend.app.api.deps import get_current_user
from backend.app.models.user import User
from backend.app.schemas.chat import ChatRequest, ChatResponse, SourceCitation
from backend.app.services.chat_service import ChatService

router = APIRouter(prefix="/chat", tags=["Chat"])


@router.post(
    "",
    response_model=ChatResponse,
    summary="Ask a technical question grounded in uploaded documents",
)
def chat(
    payload: ChatRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ChatResponse:
    result = ChatService.send_message(
        db=db,
        owner_id=current_user.id,
        question=payload.question,
        conversation_id=payload.conversation_id,
        document_ids=payload.document_ids,
    )

    source_citations = [SourceCitation(**src) for src in result["sources"]]
    sufficient_context = (result["answer_status"] != "insufficient_context")

    return ChatResponse(
        conversation_id=result["conversation_id"],
        message_id=result["message_id"],
        answer=result["answer"],
        answer_status=result["answer_status"],
        sources=source_citations,
        sufficient_context=sufficient_context,
        citations=source_citations,
    )
