"""
API route modules registry.
"""

from backend.app.api.routes.documents import router as documents_router
from backend.app.api.routes.chat import router as chat_router
from backend.app.api.routes.conversations import router as conversations_router
from backend.app.api.routes.auth import router as auth_router
from backend.app.api.routes.dashboard import router as dashboard_router

__all__ = [
    "documents_router",
    "chat_router",
    "conversations_router",
    "auth_router",
    "dashboard_router",
]

