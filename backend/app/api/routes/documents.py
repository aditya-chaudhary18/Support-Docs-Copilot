"""
Document Management REST Endpoints adhering to PRD Sections 15.2 - 15.5.
Handles multipart upload, lifecycle querying, and cascading deletion.
"""

import uuid
from datetime import datetime, timezone
from typing import Optional
from fastapi import APIRouter, Depends, UploadFile, File, BackgroundTasks, status, Query
from fastapi.responses import Response
from sqlalchemy.orm import Session
from sqlalchemy import select, func, and_

from backend.app.core.errors import AppException
from backend.app.db.session import get_db
from backend.app.api.deps import get_current_user, validate_file_payload
from backend.app.models.user import User
from backend.app.models.document import Document
from backend.app.models.chunk import DocumentChunk
from backend.app.schemas.document import DocumentResponse, DocumentListResponse, ChunkResponse, ChunkListResponse
from backend.app.services.storage import get_storage_service, build_object_key, sanitize_filename
from backend.app.services.ingestion import process_document_pipeline

router = APIRouter(prefix="/documents", tags=["Documents"])


@router.post(
    "/upload",
    response_model=DocumentResponse,
    status_code=status.HTTP_202_ACCEPTED,
    summary="Upload and ingest technical documentation",
)
async def upload_document(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    storage=Depends(get_storage_service),
) -> DocumentResponse:
    """
    Validates file format and signature, uploads raw bytes to Cloudflare R2,
    records document in Neon DB, and dispatches background ingestion.
    """
    raw_filename = file.filename or "uploaded_document"
    safe_filename = sanitize_filename(raw_filename)
    file_bytes = await file.read()

    # 1. Validation (size, extension, signature, empty)
    file_type, content_hash = validate_file_payload(safe_filename, file_bytes)

    # 2. Check for duplicate upload by this owner
    existing = db.scalar(
        select(Document).where(
            Document.owner_id == current_user.id,
            Document.content_hash == content_hash,
            Document.status != "failed",
        )
    )
    if existing:
        # If an identical document is already indexed and ready, update filename if changed and return it
        if safe_filename and safe_filename != existing.filename:
            existing.filename = safe_filename
        existing.uploaded_at = datetime.now(timezone.utc)
        db.commit()
        db.refresh(existing)
        return DocumentResponse.model_validate(existing)

    # 3. Upload to Cloudflare R2
    doc_id = uuid.uuid4()
    r2_key = build_object_key(doc_id, safe_filename)
    storage.upload_bytes(r2_key, file_bytes, content_type=file.content_type or "application/octet-stream")

    # 4. Insert DB record
    document = Document(
        id=doc_id,
        owner_id=current_user.id,
        filename=safe_filename,
        file_type=file_type,
        file_size=len(file_bytes),
        content_hash=content_hash,
        r2_object_key=r2_key,
        status="processing",
        processing_stage="extracting",
        chunk_count=0,
        uploaded_at=datetime.now(timezone.utc),
    )
    db.add(document)
    db.commit()
    db.refresh(document)

    # 5. Launch asynchronous background processing pipeline
    background_tasks.add_task(
        process_document_pipeline,
        document_id=doc_id,
        file_bytes=None,
        filename=safe_filename,
        file_type=file_type,
    )


    return DocumentResponse.model_validate(document)


@router.get(
    "",
    response_model=DocumentListResponse,
    summary="List uploaded documents",
)
def list_documents(
    status_filter: Optional[str] = None,
    limit: int = 50,
    offset: int = 0,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> DocumentListResponse:
    """Lists all documents belonging to the authenticated owner."""
    conditions = [Document.owner_id == current_user.id]
    if status_filter:
        conditions.append(Document.status == status_filter)

    total = db.scalar(select(func.count(Document.id)).where(and_(*conditions))) or 0

    stmt = (
        select(Document)
        .where(and_(*conditions))
        .order_by(Document.uploaded_at.desc())
        .limit(limit)
        .offset(offset)
    )
    docs = db.scalars(stmt).all()

    return DocumentListResponse(
        items=[DocumentResponse.model_validate(d) for d in docs],
        total=total,
    )


@router.get(
    "/{document_id}",
    response_model=DocumentResponse,
    summary="Get single document metadata and polling status",
)
def get_document(
    document_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> DocumentResponse:
    doc = db.scalar(select(Document).where(Document.id == document_id))
    if not doc:
        raise AppException(
            status_code=404,
            code="DOCUMENT_NOT_FOUND",
            message=f"Document '{document_id}' was not found.",
        )
    if doc.owner_id != current_user.id:
        raise AppException(
            status_code=403,
            code="DOCUMENT_ACCESS_DENIED",
            message="You do not have permission to access this document.",
        )
    return DocumentResponse.model_validate(doc)


@router.get(
    "/{document_id}/chunks",
    response_model=ChunkListResponse,
    summary="List all indexed chunks for a document",
)
def list_document_chunks(
    document_id: uuid.UUID,
    limit: int = 200,
    offset: int = 0,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ChunkListResponse:
    doc = db.scalar(select(Document).where(Document.id == document_id))
    if not doc:
        raise AppException(
            status_code=404,
            code="DOCUMENT_NOT_FOUND",
            message=f"Document '{document_id}' was not found.",
        )
    if doc.owner_id != current_user.id:
        raise AppException(
            status_code=403,
            code="DOCUMENT_ACCESS_DENIED",
            message="You do not have permission to access this document.",
        )

    total = db.scalar(
        select(func.count(DocumentChunk.id)).where(DocumentChunk.document_id == document_id)
    ) or 0

    chunks = db.scalars(
        select(DocumentChunk)
        .where(DocumentChunk.document_id == document_id)
        .order_by(DocumentChunk.chunk_index.asc())
        .limit(limit)
        .offset(offset)
    ).all()

    return ChunkListResponse(
        items=[
            ChunkResponse(
                id=c.id,
                document_id=c.document_id,
                chunk_index=c.chunk_index,
                content=c.content,
                page_number=c.page_number,
                section_title=c.section_title,
                token_count=c.token_count,
            )
            for c in chunks
        ],
        total=total,
    )


@router.get(
    "/{document_id}/download",
    summary="Download original document from Cloudflare R2",
)
def download_document(
    document_id: uuid.UUID,
    disposition: str = Query("attachment", pattern="^(attachment|inline)$"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    storage=Depends(get_storage_service),
):
    """Retrieve original document bytes securely through the backend from private R2 storage."""
    doc = db.scalar(select(Document).where(Document.id == document_id))
    if not doc:
        raise AppException(
            status_code=404,
            code="DOCUMENT_NOT_FOUND",
            message=f"Document '{document_id}' was not found.",
        )
    if doc.owner_id != current_user.id:
        raise AppException(
            status_code=403,
            code="DOCUMENT_ACCESS_DENIED",
            message="You do not have permission to access this document.",
        )
    if not doc.r2_object_key:
        raise AppException(
            status_code=404,
            code="OBJECT_NOT_FOUND",
            message="No stored object found for this document.",
        )

    file_bytes = storage.download_file(doc.r2_object_key)
    mime_types = {
        "pdf": "application/pdf",
        "docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "txt": "text/plain; charset=utf-8",
        "md": "text/markdown; charset=utf-8",
    }
    media_type = mime_types.get(doc.file_type, "application/octet-stream")
    return Response(
        content=file_bytes,
        media_type=media_type,
        headers={"Content-Disposition": f'{disposition}; filename="{doc.filename}"'},
    )


@router.get(
    "/{document_id}/file",
    summary="View original document bytes inline securely from Cloudflare R2",
)
def view_document_file(
    document_id: uuid.UUID,
    disposition: str = Query("inline", pattern="^(attachment|inline)$"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    storage=Depends(get_storage_service),
):
    """
    Direct in-browser viewing endpoint for uploaded documents (PDF, DOCX, TXT, MD).
    Verifies user ownership, streams raw bytes from Cloudflare R2, and sets inline disposition.
    """
    return download_document(
        document_id=document_id,
        disposition=disposition,
        db=db,
        current_user=current_user,
        storage=storage,
    )


@router.delete(
    "/{document_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a document, chunks, and storage object",
)
def delete_document(
    document_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    storage=Depends(get_storage_service),
) -> None:
    doc = db.scalar(select(Document).where(Document.id == document_id))
    if not doc:
        raise AppException(
            status_code=404,
            code="DOCUMENT_NOT_FOUND",
            message=f"Document '{document_id}' was not found.",
        )
    if doc.owner_id != current_user.id:
        raise AppException(
            status_code=403,
            code="DOCUMENT_ACCESS_DENIED",
            message="You do not have permission to access this document.",
        )

    # Delete R2 object
    if doc.r2_object_key:
        storage.delete_file(doc.r2_object_key)

    # Cascades automatically to chunks
    db.delete(doc)
    db.commit()

