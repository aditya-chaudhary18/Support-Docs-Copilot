"""
Authentication REST Endpoints: Register, Login, Current User (Me), and Logout.
"""

import uuid
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
from sqlalchemy import select

from backend.app.core.config import Settings
from backend.app.core.errors import AppException
from backend.app.db.session import get_db
from backend.app.models.user import User
from backend.app.schemas.auth import (
    RegisterRequest,
    LoginRequest,
    GoogleLoginRequest,
    AuthResponse,
    UserResponse,
    UpdateProfileRequest,
)
from backend.app.services.auth_service import hash_password, verify_password, create_access_token
from backend.app.services.google_auth_service import verify_google_credential
from backend.app.core.config import get_settings
from backend.app.api.deps import get_current_user

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post(
    "/register",
    response_model=AuthResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Register a new user",
)
def register(
    payload: RegisterRequest,
    db: Session = Depends(get_db),
) -> AuthResponse:
    # 1. Check for existing user with identical email
    existing = db.scalar(select(User).where(User.email == payload.email))
    if existing:
        raise AppException(
            status_code=409,
            code="DUPLICATE_EMAIL",
            message="An account with this email already exists.",
        )

    # 2. Hash password & persist user
    new_user = User(
        id=uuid.uuid4(),
        email=payload.email,
        display_name=payload.name,
        password_hash=hash_password(payload.password),
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc),
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    # 3. Create access token
    token = create_access_token(user_id=new_user.id, email=new_user.email)

    return AuthResponse(
        access_token=token,
        token_type="bearer",
        user=UserResponse(
            id=new_user.id,
            name=new_user.display_name,
            email=new_user.email,
            created_at=new_user.created_at,
        ),
    )


@router.post(
    "/login",
    response_model=AuthResponse,
    summary="Authenticate user and obtain JWT token",
)
def login(
    payload: LoginRequest,
    db: Session = Depends(get_db),
) -> AuthResponse:
    user = db.scalar(select(User).where(User.email == payload.email))
    if not user or not user.password_hash or not verify_password(payload.password, user.password_hash):
        raise AppException(
            status_code=401,
            code="INVALID_CREDENTIALS",
            message="Invalid email or password.",
        )

    token = create_access_token(user_id=user.id, email=user.email or payload.email)

    return AuthResponse(
        access_token=token,
        token_type="bearer",
        user=UserResponse(
            id=user.id,
            name=user.display_name,
            email=user.email or payload.email,
            created_at=user.created_at,
        ),
    )


@router.post(
    "/google",
    response_model=AuthResponse,
    summary="Authenticate or register user with Google OAuth2 ID token",
)
def google_login(
    payload: GoogleLoginRequest,
    db: Session = Depends(get_db),
) -> AuthResponse:
    settings = get_settings()
    google_data = verify_google_credential(payload.credential, settings)
    email = google_data["email"]
    name = google_data["name"]

    user = db.scalar(select(User).where(User.email == email))
    if not user:
        # Create a new user with Google profile
        user = User(
            id=uuid.uuid4(),
            email=email,
            display_name=name,
            password_hash=None,
            created_at=datetime.now(timezone.utc),
            updated_at=datetime.now(timezone.utc),
        )
        db.add(user)
        db.commit()
        db.refresh(user)
    else:
        # Update display_name if it was empty or default
        if not user.display_name or user.display_name == "Demo User":
            user.display_name = name
            user.updated_at = datetime.now(timezone.utc)
            db.commit()
            db.refresh(user)

    token = create_access_token(user_id=user.id, email=user.email or email)

    return AuthResponse(
        access_token=token,
        token_type="bearer",
        user=UserResponse(
            id=user.id,
            name=user.display_name,
            email=user.email or email,
            created_at=user.created_at,
        ),
    )


@router.get(
    "/me",
    response_model=UserResponse,
    summary="Get current authenticated user profile",
)
def get_me(
    current_user: User = Depends(get_current_user),
) -> UserResponse:
    return UserResponse(
        id=current_user.id,
        name=current_user.display_name,
        email=current_user.email or "",
        created_at=current_user.created_at,
    )


@router.patch(
    "/me",
    response_model=UserResponse,
    summary="Update current authenticated user profile",
)
def update_me(
    payload: UpdateProfileRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> UserResponse:
    if payload.name is not None:
        current_user.display_name = payload.name
        current_user.updated_at = datetime.now(timezone.utc)
        db.commit()
        db.refresh(current_user)

    return UserResponse(
        id=current_user.id,
        name=current_user.display_name,
        email=current_user.email or "",
        created_at=current_user.created_at,
    )


@router.post(
    "/logout",
    summary="Log out of the current session",
)
def logout() -> dict:
    return {"message": "Logged out successfully"}
