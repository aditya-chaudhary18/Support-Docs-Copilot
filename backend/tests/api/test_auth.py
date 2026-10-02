"""
Authentication and User Ownership Integration Tests for Trace.
Adheres to requirements in Step 13 / Auth Hardening.
"""

import uuid
from datetime import datetime, timezone
import pytest
from sqlalchemy import select

from backend.app.models.user import User
from backend.app.models.document import Document
from backend.app.models.conversation import Conversation
from backend.app.services.auth_service import verify_password


def test_register_user_success(auth_client, test_db):
    """Registering a new user hashes the password, persists user, and returns access token."""
    res = auth_client.post(
        "/api/auth/register",
        json={
            "name": "Alice Smith",
            "email": "alice@example.com",
            "password": "super-secure-password-123",
        },
    )
    assert res.status_code == 201
    data = res.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"
    assert data["user"]["name"] == "Alice Smith"
    assert data["user"]["email"] == "alice@example.com"
    assert "password" not in data
    assert "password_hash" not in data

    # Verify database persistence & password hashing
    user = test_db.scalar(select(User).where(User.email == "alice@example.com"))
    assert user is not None
    assert user.password_hash != "super-secure-password-123"
    assert verify_password("super-secure-password-123", user.password_hash)


def test_duplicate_email_registration_rejected(auth_client):
    """Registering with an already existing email returns 409 DUPLICATE_EMAIL."""
    auth_client.post(
        "/api/auth/register",
        json={
            "name": "Bob Jones",
            "email": "bob@example.com",
            "password": "password12345",
        },
    )

    res = auth_client.post(
        "/api/auth/register",
        json={
            "name": "Bob Duplicate",
            "email": "bob@example.com",
            "password": "anotherpassword123",
        },
    )
    assert res.status_code == 409
    assert res.json()["error"]["code"] == "DUPLICATE_EMAIL"


def test_login_success(auth_client):
    """Login with valid email and password returns JWT access token."""
    auth_client.post(
        "/api/auth/register",
        json={
            "name": "Carol Danvers",
            "email": "carol@example.com",
            "password": "valid-password-999",
        },
    )

    res = auth_client.post(
        "/api/auth/login",
        json={
            "email": "carol@example.com",
            "password": "valid-password-999",
        },
    )
    assert res.status_code == 200
    data = res.json()
    assert "access_token" in data
    assert data["user"]["name"] == "Carol Danvers"


def test_login_invalid_password_rejected(auth_client):
    """Login with wrong password returns 401 INVALID_CREDENTIALS."""
    auth_client.post(
        "/api/auth/register",
        json={
            "name": "Dave Miller",
            "email": "dave@example.com",
            "password": "correct-password-123",
        },
    )

    res = auth_client.post(
        "/api/auth/login",
        json={
            "email": "dave@example.com",
            "password": "wrong-password",
        },
    )
    assert res.status_code == 401
    assert res.json()["error"]["code"] == "INVALID_CREDENTIALS"


def test_get_current_user_me(auth_client):
    """GET /api/auth/me returns the authenticated user from the bearer token."""
    reg = auth_client.post(
        "/api/auth/register",
        json={
            "name": "Elena Fisher",
            "email": "elena@example.com",
            "password": "uncharted-password-1",
        },
    )
    token = reg.json()["access_token"]

    res = auth_client.get(
        "/api/auth/me",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert res.status_code == 200
    data = res.json()
    assert data["name"] == "Elena Fisher"
    assert data["email"] == "elena@example.com"


def test_unauthorized_request_rejected(auth_client):
    """Accessing protected endpoint without token returns 401 UNAUTHORIZED."""
    res = auth_client.get("/api/auth/me")
    assert res.status_code == 401
    assert res.json()["error"]["code"] == "UNAUTHORIZED"


def test_dashboard_stats_user_isolation(auth_client, test_db):
    """Dashboard statistics must only count items belonging to the authenticated user."""
    # 1. Register User 1
    u1_res = auth_client.post(
        "/api/auth/register",
        json={"name": "User 1", "email": "user1@example.com", "password": "password1234"},
    )
    u1_token = u1_res.json()["access_token"]
    u1_id = uuid.UUID(u1_res.json()["user"]["id"])

    # 2. Register User 2
    u2_res = auth_client.post(
        "/api/auth/register",
        json={"name": "User 2", "email": "user2@example.com", "password": "password1234"},
    )
    u2_token = u2_res.json()["access_token"]
    u2_id = uuid.UUID(u2_res.json()["user"]["id"])

    # 3. Add documents and conversations for User 1
    doc1 = Document(
        id=uuid.uuid4(),
        owner_id=u1_id,
        filename="u1_guide.md",
        file_type="md",
        file_size=100,
        content_hash="hash1",
        r2_object_key="key1",
        status="ready",
        chunk_count=3,
        uploaded_at=datetime.now(timezone.utc),
    )
    conv1 = Conversation(
        id=uuid.uuid4(),
        owner_id=u1_id,
        title="U1 Thread",
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc),
    )
    test_db.add_all([doc1, conv1])
    test_db.commit()

    # User 1 stats should reflect 1 doc, 1 conv
    res1 = auth_client.get(
        "/api/dashboard/stats",
        headers={"Authorization": f"Bearer {u1_token}"},
    )
    assert res1.status_code == 200
    stats1 = res1.json()
    assert stats1["indexed_documents"] == 1
    assert stats1["conversations"] == 1

    # User 2 stats must be clean 0 (no data leakage)
    res2 = auth_client.get(
        "/api/dashboard/stats",
        headers={"Authorization": f"Bearer {u2_token}"},
    )
    assert res2.status_code == 200
    stats2 = res2.json()
    assert stats2["indexed_documents"] == 0
    assert stats2["conversations"] == 0
    assert stats2["processing_ingestion"] == 0
    assert stats2["indexed_chunks"] == 0


def test_user_cannot_access_foreign_document_or_conversation(auth_client, test_db):
    """User cannot fetch or delete another user's document or conversation."""
    u1_res = auth_client.post(
        "/api/auth/register",
        json={"name": "Owner User", "email": "owner@example.com", "password": "password1234"},
    )
    u1_id = uuid.UUID(u1_res.json()["user"]["id"])

    u2_res = auth_client.post(
        "/api/auth/register",
        json={"name": "Attacker User", "email": "attacker@example.com", "password": "password1234"},
    )
    u2_token = u2_res.json()["access_token"]

    doc = Document(
        id=uuid.uuid4(),
        owner_id=u1_id,
        filename="secret.pdf",
        file_type="pdf",
        file_size=200,
        content_hash="h2",
        r2_object_key="k2",
        status="ready",
        chunk_count=1,
        uploaded_at=datetime.now(timezone.utc),
    )
    conv = Conversation(
        id=uuid.uuid4(),
        owner_id=u1_id,
        title="Owner Private Chat",
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc),
    )
    test_db.add_all([doc, conv])
    test_db.commit()

    # User 2 attempts to read User 1's document -> 403
    res_doc = auth_client.get(
        f"/api/documents/{doc.id}",
        headers={"Authorization": f"Bearer {u2_token}"},
    )
    assert res_doc.status_code == 403
    assert res_doc.json()["error"]["code"] == "DOCUMENT_ACCESS_DENIED"

    # User 2 attempts to read User 1's conversation -> 403
    res_conv = auth_client.get(
        f"/api/conversations/{conv.id}",
        headers={"Authorization": f"Bearer {u2_token}"},
    )
    assert res_conv.status_code == 403
    assert res_conv.json()["error"]["code"] == "CONVERSATION_ACCESS_DENIED"


def test_logout_endpoint(auth_client):
    """POST /api/auth/logout succeeds."""
    res = auth_client.post("/api/auth/logout")
    assert res.status_code == 200
    assert res.json()["message"] == "Logged out successfully"


def test_update_profile_display_name(auth_client, test_db):
    """PATCH /api/auth/me updates user's display name."""
    reg = auth_client.post(
        "/api/auth/register",
        json={"name": "Old Name", "email": "rename@example.com", "password": "password123"},
    )
    token = reg.json()["access_token"]

    res = auth_client.patch(
        "/api/auth/me",
        headers={"Authorization": f"Bearer {token}"},
        json={"name": "Brand New Name"},
    )
    assert res.status_code == 200
    data = res.json()
    assert data["name"] == "Brand New Name"

    # Confirm in db
    user = test_db.scalar(select(User).where(User.email == "rename@example.com"))
    assert user.display_name == "Brand New Name"


def test_google_login_new_user(auth_client, test_db, monkeypatch):
    """POST /api/auth/google creates a new user when email does not exist."""
    def mock_verify(credential, settings, request_adapter=None):
        assert credential == "valid-mock-google-credential-token"
        return {
            "email": "newgoogle@example.com",
            "name": "Google Explorer",
            "google_id": "google-sub-9999",
            "picture": "https://example.com/avatar.jpg",
        }

    monkeypatch.setattr(
        "backend.app.api.routes.auth.verify_google_credential",
        mock_verify,
    )

    res = auth_client.post(
        "/api/auth/google",
        json={"credential": "valid-mock-google-credential-token"},
    )
    assert res.status_code == 200
    data = res.json()
    assert "access_token" in data
    assert data["user"]["name"] == "Google Explorer"
    assert data["user"]["email"] == "newgoogle@example.com"

    # Verify user in DB without password_hash
    user = test_db.scalar(select(User).where(User.email == "newgoogle@example.com"))
    assert user is not None
    assert user.password_hash is None
    assert user.display_name == "Google Explorer"


def test_google_login_existing_user(auth_client, test_db, monkeypatch):
    """POST /api/auth/google authenticates existing user."""
    # First create user via register
    auth_client.post(
        "/api/auth/register",
        json={"name": "Existing Account", "email": "existing@example.com", "password": "password123"},
    )

    def mock_verify(credential, settings, request_adapter=None):
        return {
            "email": "existing@example.com",
            "name": "Existing Account",
            "google_id": "google-sub-1111",
            "picture": None,
        }

    monkeypatch.setattr(
        "backend.app.api.routes.auth.verify_google_credential",
        mock_verify,
    )

    res = auth_client.post(
        "/api/auth/google",
        json={"credential": "mock-token-for-existing-user"},
    )
    assert res.status_code == 200
    data = res.json()
    assert "access_token" in data
    assert data["user"]["email"] == "existing@example.com"


def test_google_login_invalid_credential(auth_client, monkeypatch):
    """POST /api/auth/google rejects invalid credential with 401."""
    from backend.app.core.errors import AppException

    def mock_verify(credential, settings, request_adapter=None):
        raise AppException(
            status_code=401,
            code="INVALID_GOOGLE_TOKEN",
            message="Google token signature is invalid.",
        )

    monkeypatch.setattr(
        "backend.app.api.routes.auth.verify_google_credential",
        mock_verify,
    )

    res = auth_client.post(
        "/api/auth/google",
        json={"credential": "invalid-token-xyz"},
    )
    assert res.status_code == 401
    assert res.json()["error"]["code"] == "INVALID_GOOGLE_TOKEN"

