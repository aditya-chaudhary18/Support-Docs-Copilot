"""
Unit tests for Google OAuth2 ID Token Verification Service.
"""

import pytest
from unittest.mock import MagicMock
from backend.app.core.config import Settings
from backend.app.core.errors import AppException
from backend.app.services.google_auth_service import verify_google_credential


def test_verify_google_credential_empty():
    settings = Settings(APP_ENV="test")
    with pytest.raises(AppException) as exc_info:
        verify_google_credential("", settings)
    assert exc_info.value.status_code == 401
    assert exc_info.value.code == "INVALID_GOOGLE_TOKEN"


def test_verify_google_credential_success(monkeypatch):
    settings = Settings(APP_ENV="test", GOOGLE_CLIENT_ID="test-client-id.apps.googleusercontent.com")

    mock_id_token = MagicMock()
    mock_id_token.verify_oauth2_token.return_value = {
        "email": "test.engineer@company.com",
        "email_verified": True,
        "name": "Test Engineer",
        "sub": "google-user-12345",
        "picture": "https://lh3.googleusercontent.com/a/fake",
    }
    monkeypatch.setattr("backend.app.services.google_auth_service.id_token", mock_id_token)

    result = verify_google_credential("fake-valid-jwt-token", settings)
    assert result["email"] == "test.engineer@company.com"
    assert result["name"] == "Test Engineer"
    assert result["google_id"] == "google-user-12345"
    assert result["picture"] == "https://lh3.googleusercontent.com/a/fake"


def test_verify_google_credential_unverified_email(monkeypatch):
    settings = Settings(APP_ENV="test")

    mock_id_token = MagicMock()
    mock_id_token.verify_oauth2_token.return_value = {
        "email": "unverified@company.com",
        "email_verified": False,
        "name": "Unverified User",
        "sub": "123",
    }
    monkeypatch.setattr("backend.app.services.google_auth_service.id_token", mock_id_token)

    with pytest.raises(AppException) as exc_info:
        verify_google_credential("token-with-unverified-email", settings)
    assert exc_info.value.status_code == 400
    assert exc_info.value.code == "GOOGLE_EMAIL_UNVERIFIED"


def test_verify_google_credential_invalid_token(monkeypatch):
    settings = Settings(APP_ENV="test")

    mock_id_token = MagicMock()
    mock_id_token.verify_oauth2_token.side_effect = ValueError("Token expired")
    monkeypatch.setattr("backend.app.services.google_auth_service.id_token", mock_id_token)

    with pytest.raises(AppException) as exc_info:
        verify_google_credential("expired-token", settings)
    assert exc_info.value.status_code == 401
    assert exc_info.value.code == "INVALID_GOOGLE_TOKEN"
