"""
FastAPI Application Entry Point for Trace.
Adheres to PRD Section 15 and Architectural Rules Section 35.
Configures CORS, Request-ID middleware, structured error responses, lifecycle handlers,
stale processing recovery, and modular REST route registration.
"""

import uuid
import logging
from datetime import datetime, timezone, timedelta
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException
from sqlalchemy import select, update

from backend.app.core.config import get_settings
from backend.app.core.logging import setup_logging
from backend.app.core.errors import AppException, AppErrorResponse, ErrorDetail
from backend.app.db.session import SessionLocal
from backend.app.models.document import Document
from backend.app.api.health import router as health_router
from backend.app.api.routes import (
    documents_router,
    chat_router,
    conversations_router,
    auth_router,
    dashboard_router,
)

logger = logging.getLogger(__name__)



def recover_stale_processing_documents():
    """
    Stale-processing recovery per PRD Section 7.1:
    Any document in 'processing' status older than PROCESSING_TIMEOUT_MINUTES
    is marked failed to recover from server sleep or restart during background tasks.
    """
    settings = get_settings()
    cutoff = datetime.now(timezone.utc) - timedelta(minutes=settings.PROCESSING_TIMEOUT_MINUTES)
    try:
        db = SessionLocal()
        try:
            stmt = (
                update(Document)
                .where(
                    Document.status == "processing",
                    Document.uploaded_at < cutoff,
                )
                .values(
                    status="failed",
                    processing_stage=None,
                    processing_error="Processing was interrupted. Please delete and re-upload.",
                )
            )
            result = db.execute(stmt)
            db.commit()
            if result.rowcount > 0:
                logger.warning("Recovered %d stale processing document(s).", result.rowcount)
        finally:
            db.close()
    except Exception as exc:
        logger.debug("Stale document recovery skipped or DB not yet connected: %s", exc)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan setup and teardown."""
    setup_logging()
    settings = get_settings()
    logger.info("Starting Trace Backend in %s mode", settings.APP_ENV)

    # Perform stale document cleanup on startup
    recover_stale_processing_documents()

    yield
    logger.info("Shutting down Trace Backend")


def create_app() -> FastAPI:
    settings = get_settings()

    app = FastAPI(
        title="Trace API",
        description="AI-powered RAG technical documentation assistant with verified citations.",
        version="1.0.0",
        lifespan=lifespan,
    )

    # 1. Request-ID Middleware
    @app.middleware("http")
    async def request_id_middleware(request: Request, call_next):
        req_id = request.headers.get("X-Request-ID", str(uuid.uuid4()))
        request.state.request_id = req_id
        response = await call_next(request)
        response.headers["X-Request-ID"] = req_id
        return response

    # 2. Security Headers Middleware (PRD Section 35 & Step 13)
    @app.middleware("http")
    async def security_headers_middleware(request: Request, call_next):
        response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        return response

    # 3. CORS Middleware
    cors_origins = [o for o in settings.cors_origins if o != "*"]
    has_wildcard = "*" in settings.cors_origins
    origin_regex = r".*" if has_wildcard else r"^https:\/\/.*\.vercel\.app$"

    app.add_middleware(
        CORSMiddleware,
        allow_origins=cors_origins,
        allow_origin_regex=origin_regex,
        allow_credentials=True,
        allow_methods=["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
        allow_headers=["*"],
    )

    # 4. Centralized Exception Handlers
    @app.exception_handler(AppException)
    async def app_exception_handler(request: Request, exc: AppException):
        req_id = getattr(request.state, "request_id", None)
        logger.warning(
            "AppException [%s]: %s (request_id=%s)",
            exc.code,
            exc.message,
            req_id,
        )
        return JSONResponse(
            status_code=exc.status_code,
            content=AppErrorResponse(
                error=ErrorDetail(
                    code=exc.code,
                    message=exc.message,
                    request_id=req_id,
                )
            ).model_dump(),
        )

    @app.exception_handler(RequestValidationError)
    async def validation_exception_handler(request: Request, exc: RequestValidationError):
        req_id = getattr(request.state, "request_id", None)
        # Extract the first actionable human-readable validation error message
        errors = exc.errors()
        if errors:
            first_err = errors[0]
            field = ".".join(str(loc) for loc in first_err.get("loc", []) if loc != "body")
            msg = first_err.get("msg", "Invalid input")
            clean_message = f"{field}: {msg}" if field else msg
        else:
            clean_message = "Invalid request payload."

        logger.warning(
            "Validation error: %s (request_id=%s)",
            clean_message,
            req_id,
        )
        return JSONResponse(
            status_code=400,
            content=AppErrorResponse(
                error=ErrorDetail(
                    code="VALIDATION_ERROR",
                    message=clean_message,
                    request_id=req_id,
                )
            ).model_dump(),
        )

    @app.exception_handler(StarletteHTTPException)
    async def http_exception_handler(request: Request, exc: StarletteHTTPException):
        req_id = getattr(request.state, "request_id", None)
        status_code = exc.status_code
        code_map = {
            404: "NOT_FOUND",
            405: "METHOD_NOT_ALLOWED",
            413: "FILE_TOO_LARGE",
            415: "UNSUPPORTED_MEDIA_TYPE",
        }
        code = code_map.get(status_code, f"HTTP_{status_code}")
        message = str(exc.detail) if exc.detail else "An HTTP error occurred."

        logger.warning(
            "HTTPException [%d - %s]: %s (request_id=%s)",
            status_code,
            code,
            message,
            req_id,
        )
        return JSONResponse(
            status_code=status_code,
            content=AppErrorResponse(
                error=ErrorDetail(
                    code=code,
                    message=message,
                    request_id=req_id,
                )
            ).model_dump(),
        )

    @app.exception_handler(Exception)
    async def unhandled_exception_handler(request: Request, exc: Exception):
        req_id = getattr(request.state, "request_id", None)
        logger.error(
            "Unhandled server error: %s (request_id=%s)",
            exc,
            req_id,
            exc_info=True,
        )
        return JSONResponse(
            status_code=500,
            content=AppErrorResponse(
                error=ErrorDetail(
                    code="INTERNAL_ERROR",
                    message="Something went wrong. Please try again.",
                    request_id=req_id,
                )
            ).model_dump(),
        )


    # 4. Route Registration
    # Root health probe for container infrastructure
    app.include_router(health_router)

    # API Routes prefixed by /api
    prefix = settings.API_BASE_PATH
    app.include_router(health_router, prefix=prefix)
    app.include_router(auth_router, prefix=prefix)
    app.include_router(dashboard_router, prefix=prefix)
    app.include_router(documents_router, prefix=prefix)
    app.include_router(chat_router, prefix=prefix)
    app.include_router(conversations_router, prefix=prefix)

    return app


app = create_app()
