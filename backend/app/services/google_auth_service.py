"""
Service for validating and decoding Google Identity Services OAuth2 ID tokens.
Adheres to PRD Section 31 and Google Identity Services specifications.
"""

from typing import Dict, Any, Optional
import logging
from google.oauth2 import id_token
from google.auth.transport import requests as google_requests

from backend.app.core.config import Settings
from backend.app.core.errors import AppException

logger = logging.getLogger(__name__)


def verify_google_credential(
    credential: str,
    settings: Settings,
    request_adapter: Optional[Any] = None,
) -> Dict[str, Any]:
    """
    Verifies a Google OAuth2 ID token credential and returns user profile claims.
    
    Args:
        credential: The raw JWT ID token sent by the Google Sign-In client.
        settings: Application settings containing GOOGLE_CLIENT_ID if configured.
        request_adapter: Optional google.auth.transport.requests.Request instance.
        
    Returns:
        Dict containing verified user claims (email, name, sub, picture).
        
    Raises:
        AppException: 401 if token is expired, invalid signature, or audience mismatch.
    """
    if not credential or not credential.strip():
        raise AppException(
            status_code=401,
            code="INVALID_GOOGLE_TOKEN",
            message="Google credential token cannot be empty.",
        )

    adapter = request_adapter or google_requests.Request()
    audience = settings.GOOGLE_CLIENT_ID if settings.GOOGLE_CLIENT_ID else None

    try:
        id_info = id_token.verify_oauth2_token(
            credential,
            adapter,
            audience=audience,
        )
    except ValueError as e:
        logger.warning(f"Google ID token verification failed: {e}")
        raise AppException(
            status_code=401,
            code="INVALID_GOOGLE_TOKEN",
            message=f"Google authentication failed: {str(e)}",
        )
    except Exception as e:
        logger.error(f"Unexpected error validating Google token: {e}")
        raise AppException(
            status_code=401,
            code="GOOGLE_AUTH_ERROR",
            message="Unable to verify Google authentication token.",
        )

    email = id_info.get("email")
    if not email:
        raise AppException(
            status_code=400,
            code="GOOGLE_EMAIL_MISSING",
            message="Google token does not contain a valid email address.",
        )

    # In standard Google Identity, email_verified is a boolean or string "true"
    email_verified = id_info.get("email_verified")
    if email_verified is False or email_verified == "false":
        raise AppException(
            status_code=400,
            code="GOOGLE_EMAIL_UNVERIFIED",
            message="The Google account email is not verified.",
        )

    name = id_info.get("name") or email.split("@")[0].capitalize()

    return {
        "email": email.strip().lower(),
        "name": name.strip(),
        "google_id": id_info.get("sub"),
        "picture": id_info.get("picture"),
    }
