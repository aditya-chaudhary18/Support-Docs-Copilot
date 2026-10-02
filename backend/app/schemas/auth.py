"""
Pydantic schemas for authentication and user identity.
"""

import uuid
import re
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field, field_validator


class RegisterRequest(BaseModel):
    name: str = Field(..., min_length=2, max_length=100, description="User's full name")
    email: str = Field(..., min_length=5, max_length=255, description="User's email address")
    password: str = Field(..., min_length=8, max_length=128, description="User password (min 8 chars)")

    @field_validator("name")
    @classmethod
    def validate_name(cls, v: str) -> str:
        cleaned = v.strip()
        if len(cleaned) < 2:
            raise ValueError("Name must be at least 2 characters long.")
        return cleaned

    @field_validator("email")
    @classmethod
    def validate_email(cls, v: str) -> str:
        cleaned = v.strip().lower()
        if not re.match(r"^[^@]+@[^@]+\.[^@]+$", cleaned):
            raise ValueError("Please provide a valid email address.")
        return cleaned

    @field_validator("password")
    @classmethod
    def validate_password(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters long.")
        return v


class LoginRequest(BaseModel):
    email: str = Field(..., description="User's email address")
    password: str = Field(..., description="User's password")

    @field_validator("email")
    @classmethod
    def validate_email(cls, v: str) -> str:
        cleaned = v.strip().lower()
        if not cleaned:
            raise ValueError("Email cannot be empty.")
        return cleaned


class UserResponse(BaseModel):
    id: uuid.UUID
    name: str
    email: str
    created_at: datetime

    model_config = {"from_attributes": True}


class AuthResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse


class UpdateProfileRequest(BaseModel):
    name: Optional[str] = Field(None, min_length=2, max_length=100, description="User's full name")

    @field_validator("name")
    @classmethod
    def validate_name(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            cleaned = v.strip()
            if len(cleaned) < 2:
                raise ValueError("Name must be at least 2 characters long.")
            return cleaned
        return v


class GoogleLoginRequest(BaseModel):
    credential: str = Field(..., min_length=10, description="Google OAuth2 ID token credential")
