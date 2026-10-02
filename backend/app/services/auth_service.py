"""
Authentication Service handling password hashing and JWT token management.
"""

import uuid
from datetime import datetime, timezone, timedelta
from typing import Dict, Any, Optional
import bcrypt
import jwt

from backend.app.core.config import get_settings
from backend.app.core.errors import AppException


def hash_password(password: str) -> str:
    """Hash plaintext password securely using bcrypt with auto-generated salt."""
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(password.encode("utf-8"), salt)
    return hashed.decode("utf-8")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify plaintext password against bcrypt hash."""
    if not plain_password or not hashed_password:
        return False
    try:
        return bcrypt.checkpw(plain_password.encode("utf-8"), hashed_password.encode("utf-8"))
    except Exception:
        return False


def create_access_token(user_id: uuid.UUID, email: str, expires_delta: Optional[timedelta] = None) -> str:
    """Generate signed JWT access token containing user identity."""
    settings = get_settings()
    now = datetime.now(timezone.utc)
    if expires_delta:
        expire = now + expires_delta
    else:
        expire = now + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)

    payload: Dict[str, Any] = {
        "sub": str(user_id),
        "email": email,
        "iat": int(now.timestamp()),
        "exp": int(expire.timestamp()),
    }

    secret = settings.JWT_SECRET.get_secret_value()
    token = jwt.encode(payload, secret, algorithm=settings.JWT_ALGORITHM)
    return token


def decode_access_token(token: str) -> Dict[str, Any]:
    """Decode and validate JWT access token signature and expiration."""
    settings = get_settings()
    secret = settings.JWT_SECRET.get_secret_value()
    try:
        payload = jwt.decode(
            token,
            secret,
            algorithms=[settings.JWT_ALGORITHM],
        )
        return payload
    except jwt.ExpiredSignatureError:
        raise AppException(
            status_code=401,
            code="UNAUTHORIZED",
            message="Your session has expired. Please log in again.",
        )
    except jwt.InvalidTokenError:
        raise AppException(
            status_code=401,
            code="UNAUTHORIZED",
            message="Please log in to continue.",
        )
