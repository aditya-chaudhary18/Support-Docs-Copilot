"""
Standard error definitions and schemas adhering to PRD Section 20.
User-facing error messages are clean, informative, and free of sensitive internals.
"""

from typing import Optional
from pydantic import BaseModel, Field


class ErrorDetail(BaseModel):
    code: str = Field(..., description="Machine-readable error code")
    message: str = Field(..., description="User-friendly error message")
    request_id: Optional[str] = Field(None, description="Request tracking ID")


class AppErrorResponse(BaseModel):
    error: ErrorDetail


class AppException(Exception):
    """Base application exception with HTTP status and user-friendly error payload."""

    def __init__(
        self,
        status_code: int,
        code: str,
        message: str,
    ):
        self.status_code = status_code
        self.code = code
        self.message = message
        super().__init__(message)
