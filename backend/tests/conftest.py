"""
Pytest configuration and shared fixtures for backend testing.
Provides mock DB session, test client, and mock storage service.
"""

import uuid
from datetime import datetime, timezone
import pytest
from unittest.mock import MagicMock
from fastapi.testclient import TestClient

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from sqlalchemy.ext.compiler import compiles
from pgvector.sqlalchemy import Vector

from backend.app.main import create_app
from backend.app.db.session import get_db
from backend.app.db.base import Base
from backend.app.api.deps import get_current_user
from backend.app.services.storage import get_storage_service
from backend.app.models.user import User

TEST_USER_ID = uuid.UUID("00000000-0000-0000-0000-000000000001")


@compiles(Vector, "sqlite")
def compile_vector_sqlite(type_, compiler, **kw):
    return "TEXT"


@pytest.fixture
def test_db_factory():
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(engine)
    TestingSession = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)
    yield TestingSession
    Base.metadata.drop_all(engine)


@pytest.fixture
def test_db(test_db_factory):
    session = test_db_factory()
    try:
        yield session
    finally:
        session.close()



@pytest.fixture
def mock_user():
    return User(
        id=TEST_USER_ID,
        display_name="Test Developer",
        email="test@trace.local",
        created_at=datetime.now(timezone.utc),
    )


@pytest.fixture
def mock_db():
    return MagicMock()


@pytest.fixture
def mock_storage():
    storage = MagicMock()
    storage.upload_bytes.return_value = None
    storage.download_bytes.return_value = b"test bytes"
    storage.delete_file.return_value = True
    return storage


@pytest.fixture
def client(mock_user, mock_db, mock_storage):
    """FastAPI TestClient with overridden dependencies."""
    app = create_app()

    app.dependency_overrides[get_current_user] = lambda: mock_user
    app.dependency_overrides[get_db] = lambda: mock_db
    app.dependency_overrides[get_storage_service] = lambda: mock_storage

    with TestClient(app) as test_client:
        yield test_client


@pytest.fixture
def auth_client(test_db, mock_storage):
    """FastAPI TestClient that enforces real JWT authentication against test_db."""
    app = create_app()

    app.dependency_overrides[get_db] = lambda: test_db
    app.dependency_overrides[get_storage_service] = lambda: mock_storage

    with TestClient(app) as test_client:
        yield test_client

