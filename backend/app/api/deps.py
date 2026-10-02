"""
API Dependencies and Request Validators adhering to PRD Sections 6.2, 11.2, 18.
Resolves owner scope and performs deep file validation (size, extension, signatures).
"""

import uuid
import hashlib
from typing import Tuple, Optional
from fastapi import Depends, UploadFile, Security
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from sqlalchemy import select

from backend.app.core.config import get_settings
from backend.app.core.errors import AppException
from backend.app.db.session import get_db
from backend.app.models.user import User
from backend.app.services.auth_service import decode_access_token

security_scheme = HTTPBearer(auto_error=False)


def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Security(security_scheme),
    token_query: Optional[str] = None,
    db: Session = Depends(get_db),
) -> User:
    """
    Resolves the current authenticated user from the Authorization: Bearer <token> header
    or token query parameter fallback.
    Validates token signature and expiration, and fetches user entity from database.
    """
    token = credentials.credentials if credentials and credentials.credentials else token_query
    if not token:
        raise AppException(
            status_code=401,
            code="UNAUTHORIZED",
            message="Please log in to continue.",
        )
    payload = decode_access_token(token)
    user_id_str = payload.get("sub")
    if not user_id_str:
        raise AppException(
            status_code=401,
            code="UNAUTHORIZED",
            message="Please log in to continue.",
        )

    try:
        user_id = uuid.UUID(user_id_str)
    except (ValueError, TypeError):
        raise AppException(
            status_code=401,
            code="UNAUTHORIZED",
            message="Invalid user credentials in token.",
        )

    user = db.scalar(select(User).where(User.id == user_id))
    if not user:
        raise AppException(
            status_code=401,
            code="UNAUTHORIZED",
            message="User account associated with this token was not found.",
        )

    return user



def validate_file_payload(filename: str, data: bytes) -> Tuple[str, str]:
    """
    Validates uploaded file payload:
    - Empty file guard
    - Size limit guard
    - File extension validation
    - Magic byte / signature validation
    Returns normalized (file_type, content_hash).
    """
    settings = get_settings()

    if not filename or not filename.strip():
        raise AppException(
            status_code=400,
            code="INVALID_FILENAME",
            message="Filename cannot be empty.",
        )

    if "\x00" in filename:
        raise AppException(
            status_code=400,
            code="INVALID_FILENAME",
            message="Filename contains invalid characters.",
        )

    if not data or len(data) == 0:
        raise AppException(
            status_code=400,
            code="EMPTY_FILE",
            message="Uploaded file is empty.",
        )


    max_bytes = settings.MAX_UPLOAD_MB * 1024 * 1024
    if len(data) > max_bytes:
        raise AppException(
            status_code=413,
            code="FILE_TOO_LARGE",
            message=f"File exceeds maximum allowed size of {settings.MAX_UPLOAD_MB} MB.",
        )

    parts = filename.rsplit(".", 1)
    if len(parts) < 2:
        raise AppException(
            status_code=415,
            code="UNSUPPORTED_FILE_TYPE",
            message="Uploaded file has no extension.",
        )

    ext = parts[1].lower().strip()
    if ext == "pdf":
        # Validate PDF signature
        if not data.startswith(b"%PDF"):
            raise AppException(
                status_code=415,
                code="INVALID_FILE_SIGNATURE",
                message="File extension is PDF, but file signature is not a valid PDF header.",
            )
        file_type = "pdf"

    elif ext in ("docx", "doc"):
        # Validate PK ZIP signature for docx
        if not data.startswith(b"PK\x03\x04"):
            raise AppException(
                status_code=415,
                code="INVALID_FILE_SIGNATURE",
                message="File extension is DOCX, but file signature is not a valid Office Open XML header.",
            )
        file_type = "docx"

    elif ext in ("md", "markdown"):
        # Text/markdown should not contain null bytes
        if b"\x00" in data[:1024]:
            raise AppException(
                status_code=415,
                code="INVALID_FILE_SIGNATURE",
                message="Binary content detected in Markdown file.",
            )
        file_type = "md"

    elif ext in ("txt", "text"):
        # Text should not contain null bytes
        if b"\x00" in data[:1024]:
            raise AppException(
                status_code=415,
                code="INVALID_FILE_SIGNATURE",
                message="Binary content detected in plain text file.",
            )
        file_type = "txt"

    else:
        raise AppException(
            status_code=415,
            code="UNSUPPORTED_FILE_TYPE",
            message=f"Unsupported file extension '.{ext}'. Supported types: PDF, DOCX, TXT, Markdown.",
        )

    content_hash = hashlib.sha256(data).hexdigest()
    return file_type, content_hash
