"""
Health check endpoints for deployment readiness and uptime monitoring.
Adheres to PRD Section 15.9.
"""

from fastapi import APIRouter, Response, status
from sqlalchemy import text
from backend.app.core.config import get_settings
from backend.app.schemas.health import HealthResponse
from backend.app.db.session import SessionLocal

router = APIRouter(tags=["Health"])


@router.get("/health", response_model=HealthResponse)
def health_check(response: Response) -> HealthResponse:
    settings = get_settings()
    services_status = {}

    # 1. Neon PostgreSQL Database Check
    db_status = "healthy"
    try:
        db = SessionLocal()
        try:
            db.execute(text("SELECT 1"))
        finally:
            db.close()
    except Exception:
        db_status = "unavailable"
    services_status["database"] = db_status

    # 2. Cloudflare R2 Storage Check
    r2_status = "healthy"
    r2_key = settings.R2_ACCESS_KEY_ID.get_secret_value()
    if not settings.R2_ACCOUNT_ID or "placeholder" in settings.R2_ACCOUNT_ID.lower() or not r2_key or "placeholder" in r2_key.lower():
        r2_status = "unavailable"
    services_status["storage"] = r2_status

    # 3. Google Gemini Check
    gemini_status = "healthy"
    gemini_key = settings.GEMINI_API_KEY.get_secret_value()
    if not gemini_key or "placeholder" in gemini_key.lower():
        gemini_status = "unavailable"
    services_status["gemini"] = gemini_status

    app_status = "ok" if db_status == "healthy" else "degraded"
    if app_status == "degraded":
        response.status_code = status.HTTP_503_SERVICE_UNAVAILABLE

    return HealthResponse(
        status=app_status,
        database="ok" if db_status == "healthy" else "unavailable",
        environment=settings.APP_ENV,
        version="1.0.0",
        services=services_status,
    )

