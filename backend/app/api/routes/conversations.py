"""
Conversations and History REST Endpoints adhering to PRD Sections 15.7 - 15.8.
Provides thread listing, message retrieval with citation snapshots, and deletion.
"""

import re
import json
import uuid
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, Query, Response, status
from sqlalchemy.orm import Session

from backend.app.db.session import get_db
from backend.app.api.deps import get_current_user
from backend.app.models.user import User
from backend.app.schemas.conversation import (
    ConversationResponse,
    ConversationListResponse,
    ConversationDetailResponse,
    MessageResponse,
    UpdateConversationScopeRequest,
)
from backend.app.services.conversation_service import ConversationService

from sqlalchemy import select
from backend.app.models.document import Document
from backend.app.services.pdf_export_service import generate_session_pdf

router = APIRouter(prefix="/conversations", tags=["Conversations"])


def resolve_document_metadata(db: Session, doc_ids: Optional[list[str]]) -> list[dict]:
    if not doc_ids:
        return []
    try:
        uuids = [uuid.UUID(d) for d in doc_ids]
        docs = db.scalars(select(Document).where(Document.id.in_(uuids))).all()
        return [{"id": str(d.id), "name": d.filename, "file_type": d.file_type} for d in docs]
    except Exception:
        return []


def format_conversation_markdown(conv, messages, selected_doc_names: Optional[list[str]] = None) -> str:
    scope_str = ", ".join(selected_doc_names) if selected_doc_names else "All Indexed Documents in Knowledge Base"
    lines = [
        "# Support Docs Copilot — Grounded Session Export",
        f"**Session Title:** {conv.title}",
        f"**Session ID:** `{conv.id}`",
        f"**Exported At:** {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M:%S UTC')}",
        f"**Document Scope:** {scope_str}",
        "**Grounding Guarantee:** Strict pgvector HNSW Vector Retrieval + Gemini Grounded Synthesis",
        "",
        "---",
        "",
    ]

    turn = 1
    i = 0
    while i < len(messages):
        msg = messages[i]
        if msg.role == "user":
            lines.append(f"## Turn {turn}")
            lines.append("")
            lines.append("### Question")
            lines.append(f"{msg.content}")
            lines.append("")
            if i + 1 < len(messages) and messages[i + 1].role == "assistant":
                asst = messages[i + 1]
                lines.append("### Answer")
                lines.append(f"{asst.content}")
                lines.append("")
                sources = asst.sources or []
                if sources:
                    lines.append(f"### Retrieved Grounded Sources ({len(sources)})")
                    for src in sources:
                        src_id = src.get("source_id", "S1")
                        fname = src.get("filename") or "Unknown Document"
                        chunk_id = src.get("chunk_id", "N/A")
                        page = src.get("page_number") or 1
                        section = src.get("section_title") or src.get("source_location") or "Extracted Section"
                        sim = src.get("similarity")
                        sim_str = f" • Similarity: {round(float(sim) * 100)}%" if sim is not None else ""
                        lines.append(f"- **[{src_id}] {fname}** (Page {page}, Section: {section}{sim_str})")
                        lines.append(f"  - **Chunk ID:** `{chunk_id}`")
                        excerpt = (src.get("excerpt") or "").strip()
                        if excerpt:
                            quoted = "\n  > ".join(excerpt.split("\n"))
                            lines.append(f"  > {quoted}")
                        lines.append("")
                else:
                    lines.append("*No retrieved sources were cited for this response.*")
                    lines.append("")
                i += 1
            lines.append("---")
            lines.append("")
            turn += 1
        elif msg.role == "assistant":
            lines.append("### Assistant Note")
            lines.append(f"{msg.content}")
            lines.append("")
            lines.append("---")
            lines.append("")
        i += 1

    return "\n".join(lines)


def format_conversation_json(conv, messages, selected_doc_names: Optional[list[str]] = None) -> str:
    turns = []
    turn = 1
    i = 0
    while i < len(messages):
        msg = messages[i]
        if msg.role == "user":
            asst = None
            if i + 1 < len(messages) and messages[i + 1].role == "assistant":
                asst = messages[i + 1]
                i += 1
            turns.append({
                "turn": turn,
                "question": msg.content,
                "question_created_at": msg.created_at.isoformat() if msg.created_at else None,
                "answer": asst.content if asst else None,
                "answer_status": asst.answer_status if asst else None,
                "sources": asst.sources if asst else [],
            })
            turn += 1
        else:
            turns.append({
                "role": msg.role,
                "content": msg.content,
                "created_at": msg.created_at.isoformat() if msg.created_at else None,
                "sources": msg.sources or [],
            })
        i += 1

    data = {
        "application": "Support Docs Copilot",
        "session_id": str(conv.id),
        "session_title": conv.title,
        "document_scope": selected_doc_names or ["All Indexed Documents"],
        "created_at": conv.created_at.isoformat() if conv.created_at else None,
        "exported_at": datetime.now(timezone.utc).isoformat(),
        "turns": turns,
    }
    return json.dumps(data, indent=2)


@router.get(
    "",
    response_model=ConversationListResponse,
    summary="List conversation threads",
)
def list_conversations(
    limit: int = 50,
    offset: int = 0,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ConversationListResponse:
    conversations, total = ConversationService.list_conversations(db, current_user.id, limit, offset)

    items = []
    for conv in conversations:
        msg_count = ConversationService.get_message_count(db, conv.id)
        selected_docs = resolve_document_metadata(db, conv.selected_document_ids)
        items.append(
            ConversationResponse(
                id=conv.id,
                title=conv.title,
                created_at=conv.created_at,
                updated_at=conv.updated_at,
                message_count=msg_count,
                selected_document_ids=conv.selected_document_ids,
                selected_documents=selected_docs if selected_docs else None,
            )
        )

    return ConversationListResponse(items=items, total=total)


@router.get(
    "/{conversation_id}",
    response_model=ConversationDetailResponse,
    summary="Get conversation detail with messages and citations",
)
def get_conversation(
    conversation_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ConversationDetailResponse:
    conv = ConversationService.get_conversation(db, conversation_id, current_user.id)
    messages = ConversationService.get_messages(db, conv.id)
    selected_docs = resolve_document_metadata(db, conv.selected_document_ids)

    return ConversationDetailResponse(
        id=conv.id,
        title=conv.title,
        created_at=conv.created_at,
        updated_at=conv.updated_at,
        selected_document_ids=conv.selected_document_ids,
        selected_documents=selected_docs if selected_docs else None,
        messages=[MessageResponse.model_validate(m) for m in messages],
    )


@router.patch(
    "/{conversation_id}/scope",
    response_model=ConversationResponse,
    summary="Update selected document scope for a conversation",
)
def update_conversation_scope(
    conversation_id: uuid.UUID,
    payload: UpdateConversationScopeRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ConversationResponse:
    conv = ConversationService.update_conversation_scope(
        db=db,
        conversation_id=conversation_id,
        owner_id=current_user.id,
        selected_document_ids=payload.selected_document_ids,
    )
    msg_count = ConversationService.get_message_count(db, conv.id)
    count_val = int(msg_count) if isinstance(msg_count, int) else 0
    selected_docs = resolve_document_metadata(db, conv.selected_document_ids)
    return ConversationResponse(
        id=conv.id,
        title=conv.title,
        created_at=conv.created_at,
        updated_at=conv.updated_at,
        message_count=count_val,
        selected_document_ids=conv.selected_document_ids,
        selected_documents=selected_docs if selected_docs else None,
    )


@router.get(
    "/{conversation_id}/export",
    summary="Export conversation session with grounded sources to Markdown, PDF, or JSON",
)
def export_conversation(
    conversation_id: uuid.UUID,
    format: str = Query("markdown", pattern="^(markdown|json|text|pdf)$"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    conv = ConversationService.get_conversation(db, conversation_id, current_user.id)
    messages = ConversationService.get_messages(db, conv.id)
    selected_docs = resolve_document_metadata(db, conv.selected_document_ids)
    doc_names = [d["name"] for d in selected_docs] if selected_docs else None

    safe_title = re.sub(r"[^a-zA-Z0-9_\-]", "-", conv.title.lower()).strip("-")[:40] or "session"

    if format == "pdf":
        pdf_bytes = generate_session_pdf(
            title=conv.title,
            session_id=str(conv.id),
            created_at=conv.created_at,
            messages=messages,
            selected_document_names=doc_names,
        )
        filename = f"support-docs-copilot-{safe_title}.pdf"
        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={
                "Content-Disposition": f'attachment; filename="{filename}"',
                "Access-Control-Expose-Headers": "Content-Disposition",
            },
        )

    if format == "json":
        content = format_conversation_json(conv, messages, selected_doc_names=doc_names)
        filename = f"support-docs-copilot-{safe_title}.json"
        media_type = "application/json; charset=utf-8"
    else:
        content = format_conversation_markdown(conv, messages, selected_doc_names=doc_names)
        filename = f"support-docs-copilot-{safe_title}.md"
        media_type = "text/markdown; charset=utf-8"

    return Response(
        content=content,
        media_type=media_type,
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"',
            "Access-Control-Expose-Headers": "Content-Disposition",
        },
    )


@router.delete(
    "/{conversation_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete conversation thread and messages",
)
def delete_conversation(
    conversation_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> None:
    ConversationService.delete_conversation(db, conversation_id, current_user.id)

