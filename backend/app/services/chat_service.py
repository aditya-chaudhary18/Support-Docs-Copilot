import uuid
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session 
from sqlalchemy import select, func

from backend.app.core.config import get_settings
from backend.app.core.errors import AppException
from backend.app.models.document import Document
from backend.app.services.conversation_service import ConversationService
from backend.app.rag.pipeline import RagPipeline

class ChatService:
    @staticmethod
    def send_message(
        db: Session,
        owner_id: uuid.UUID,
        question: str,
        conversation_id: uuid.UUID | None = None,
        document_ids: Optional[List[uuid.UUID]] = None,
    ) -> Dict[str, Any]:
        settings = get_settings()

        # 1. Resolve or create conversation with document scope
        history_records: List[Dict[str, str]] = []
        effective_doc_ids: Optional[List[uuid.UUID]] = None

        if conversation_id:
            conversation = ConversationService.get_conversation(db, conversation_id, owner_id)

            # If user explicitly passed new document_ids to update existing chat scope
            if document_ids is not None:
                if len(document_ids) == 0:
                    raise AppException(
                        status_code=400,
                        code="NO_DOCUMENT_SELECTED",
                        message="Select at least one document to start a grounded chat.",
                    )
                valid_docs = db.scalars(
                    select(Document.id).where(
                        Document.owner_id == owner_id,
                        Document.id.in_(document_ids),
                        Document.status == "ready",
                    )
                ).all()
                if not valid_docs:
                    raise AppException(
                        status_code=400,
                        code="NO_DOCUMENTS_READY",
                        message="None of the selected documents are ready for chat. Please upload and index documents first.",
                    )
                effective_doc_ids = valid_docs
                conversation.selected_document_ids = [str(d) for d in effective_doc_ids]
                db.commit()
            elif conversation.selected_document_ids:
                # Load persistent document scope from conversation
                effective_doc_ids = [uuid.UUID(d) for d in conversation.selected_document_ids]

            # Load last N messages for context
            messages = ConversationService.get_messages(db, conversation.id)
            prior_messages = messages[-settings.HISTORY_MESSAGES:] if settings.HISTORY_MESSAGES > 0 else []
            for msg in prior_messages:
                history_records.append({"role": msg.role, "content": msg.content})
        else:
            # New Conversation Flow:
            if document_ids is not None:
                if len(document_ids) == 0:
                    raise AppException(
                        status_code=400,
                        code="NO_DOCUMENT_SELECTED",
                        message="Select at least one document to start a grounded chat.",
                    )
                valid_docs = db.scalars(
                    select(Document.id).where(
                        Document.owner_id == owner_id,
                        Document.id.in_(document_ids),
                        Document.status == "ready",
                    )
                ).all()
                if not valid_docs:
                    raise AppException(
                        status_code=400,
                        code="NO_DOCUMENTS_READY",
                        message="None of the selected documents are ready for chat. Please upload and index documents first.",
                    )
                effective_doc_ids = valid_docs
                selected_ids_str = [str(d) for d in effective_doc_ids]
            else:
                # Check that at least one document is ready overall
                ready_count = db.scalar(
                    select(func.count(Document.id)).where(
                        Document.owner_id == owner_id,
                        Document.status == "ready",
                    )
                ) or 0

                if ready_count == 0:
                    raise AppException(
                        status_code=409,
                        code="NO_DOCUMENTS_READY",
                        message="No documents are currently ready in your knowledge base. Please upload documentation before asking questions.",
                    )
                selected_ids_str = None

            # Auto-derive title from first question (truncated)
            raw_title = question.strip().replace("\n", " ")
            title = (raw_title[:57] + "...") if len(raw_title) > 60 else raw_title
            conversation = ConversationService.create_conversation(
                db=db,
                owner_id=owner_id,
                title=title,
                selected_document_ids=selected_ids_str,
            )

        # 2. Persist user message
        ConversationService.add_message(
            db=db,
            conversation_id=conversation.id,
            role="user",
            content=question.strip(),
        )

        # 3. Execute RAG pipeline with strictly scoped document_ids
        rag_pipeline = RagPipeline()
        rag_result = rag_pipeline.run(
            db=db,
            question=question.strip(),
            owner_id=owner_id,
            conversation_history=history_records,
            document_ids=effective_doc_ids,
        )

        # 4. Persist assistant message with citation snapshot
        assistant_msg = ConversationService.add_message(
            db=db,
            conversation_id=conversation.id,
            role="assistant",
            content=rag_result["answer"],
            sources=rag_result["sources"],
            answer_status=rag_result["answer_status"],
        )

        # 5. Return response with session document scope
        return {
            "conversation_id": conversation.id,
            "message_id": assistant_msg.id,
            "answer": rag_result["answer"],
            "answer_status": rag_result["answer_status"],
            "sources": rag_result["sources"],
            "selected_document_ids": conversation.selected_document_ids,
        }
