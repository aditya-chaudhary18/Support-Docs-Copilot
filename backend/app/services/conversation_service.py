import uuid
from typing import List, Tuple, Optional
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from sqlalchemy import select, func

from backend.app.models.conversation import Conversation
from backend.app.models.message import Message
from backend.app.core.errors import AppException

class ConversationService:
    @staticmethod
    def get_conversation(db: Session, conversation_id: uuid.UUID, owner_id: uuid.UUID) -> Conversation:
        conv = db.scalar(select(Conversation).where(Conversation.id == conversation_id))
        if not conv:
            raise AppException(
                status_code=404,
                code="CONVERSATION_NOT_FOUND",
                message=f"Conversation '{conversation_id}' was not found.",
            )
        if conv.owner_id != owner_id:
            raise AppException(
                status_code=403,
                code="CONVERSATION_ACCESS_DENIED",
                message="You do not have permission to access this conversation.",
            )
        return conv


    @staticmethod
    def list_conversations(db: Session, owner_id: uuid.UUID, limit: int = 50, offset: int = 0) -> Tuple[List[Conversation], int]:
        total = db.scalar(
            select(func.count(Conversation.id)).where(Conversation.owner_id == owner_id)
        ) or 0

        stmt = (
            select(Conversation)
            .where(Conversation.owner_id == owner_id)
            .order_by(Conversation.updated_at.desc())
            .limit(limit)
            .offset(offset)
        )
        conversations = db.scalars(stmt).all()
        return conversations, total

    @staticmethod
    def create_conversation(
        db: Session,
        owner_id: uuid.UUID,
        title: str,
        selected_document_ids: Optional[List[str]] = None,
    ) -> Conversation:
        conversation = Conversation(
            id=uuid.uuid4(),
            owner_id=owner_id,
            title=title or "New Conversation",
            selected_document_ids=selected_document_ids,
            created_at=datetime.now(timezone.utc),
            updated_at=datetime.now(timezone.utc),
        )
        db.add(conversation)
        db.commit()
        db.refresh(conversation)
        return conversation

    @staticmethod
    def update_conversation_scope(
        db: Session,
        conversation_id: uuid.UUID,
        owner_id: uuid.UUID,
        selected_document_ids: Optional[List[str]],
    ) -> Conversation:
        conv = ConversationService.get_conversation(db, conversation_id, owner_id)
        conv.selected_document_ids = selected_document_ids
        conv.updated_at = datetime.now(timezone.utc)
        db.commit()
        db.refresh(conv)
        return conv

    @staticmethod
    def delete_conversation(db: Session, conversation_id: uuid.UUID, owner_id: uuid.UUID) -> None:
        conv = ConversationService.get_conversation(db, conversation_id, owner_id)
        db.delete(conv)
        db.commit()

    @staticmethod
    def get_messages(db: Session, conversation_id: uuid.UUID) -> List[Message]:
        messages = db.scalars(
            select(Message)
            .where(Message.conversation_id == conversation_id)
            .order_by(Message.created_at.asc())
        ).all()
        return messages

    @staticmethod
    def get_message_count(db: Session, conversation_id: uuid.UUID) -> int:
        return db.scalar(
            select(func.count(Message.id)).where(Message.conversation_id == conversation_id)
        ) or 0

    @staticmethod
    def add_message(
        db: Session,
        conversation_id: uuid.UUID,
        role: str,
        content: str,
        sources: Optional[List[dict]] = None,
        answer_status: Optional[str] = None
    ) -> Message:
        msg = Message(
            id=uuid.uuid4(),
            conversation_id=conversation_id,
            role=role,
            content=content,
            sources=sources,
            answer_status=answer_status,
            created_at=datetime.now(timezone.utc),
        )
        db.add(msg)
        
        # update conversation updated_at
        conv = db.scalar(select(Conversation).where(Conversation.id == conversation_id))
        if conv:
            conv.updated_at = datetime.now(timezone.utc)
            db.add(conv)
            
        db.commit()
        db.refresh(msg)
        return msg
