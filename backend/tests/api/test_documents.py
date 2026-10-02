"""
API Integration tests for /api/documents endpoints.
Adheres to PRD Section 15.2 - 15.5.
"""

import uuid
from datetime import datetime, timezone
import io
from backend.app.models.document import Document


def test_upload_empty_file_rejected(client):
    response = client.post(
        "/api/documents/upload",
        files={"file": ("empty.md", b"", "text/markdown")},
    )
    assert response.status_code == 400
    data = response.json()
    assert data["error"]["code"] == "EMPTY_FILE"


def test_upload_unsupported_extension_rejected(client):
    response = client.post(
        "/api/documents/upload",
        files={"file": ("script.py", b"print('hello')", "text/x-python")},
    )
    assert response.status_code == 415
    data = response.json()
    assert data["error"]["code"] == "UNSUPPORTED_FILE_TYPE"


def test_upload_invalid_pdf_signature_rejected(client):
    # Extension says pdf, but bytes are plain text
    response = client.post(
        "/api/documents/upload",
        files={"file": ("fake.pdf", b"This is not a pdf file header", "application/pdf")},
    )
    assert response.status_code == 415
    data = response.json()
    assert data["error"]["code"] == "INVALID_FILE_SIGNATURE"


def test_upload_valid_markdown_success(client, mock_db):
    mock_db.scalar.return_value = None  # No existing duplicate

    content = b"# API Setup\n\nConfigure your API credentials in .env."
    response = client.post(
        "/api/documents/upload",
        files={"file": ("guide.md", content, "text/markdown")},
    )
    assert response.status_code == 202
    data = response.json()
    assert data["filename"] == "guide.md"
    assert data["file_type"] == "md"
    assert data["status"] == "processing"
    assert "id" in data


def test_list_documents(client, mock_db, mock_user):
    doc1 = Document(
        id=uuid.uuid4(),
        owner_id=mock_user.id,
        filename="doc1.md",
        file_type="md",
        file_size=1024,
        content_hash="hash1",
        r2_object_key="documents/1/doc1.md",
        status="ready",
        chunk_count=5,
        uploaded_at=datetime.now(timezone.utc),
    )
    mock_db.scalar.return_value = 1  # Total count
    mock_db.scalars.return_value.all.return_value = [doc1]

    response = client.get("/api/documents")
    assert response.status_code == 200
    data = response.json()
    assert data["total"] == 1
    assert len(data["items"]) == 1
    assert data["items"][0]["filename"] == "doc1.md"


def test_get_document_by_id(client, mock_db, mock_user):
    doc_id = uuid.uuid4()
    doc = Document(
        id=doc_id,
        owner_id=mock_user.id,
        filename="reference.pdf",
        file_type="pdf",
        file_size=2048,
        content_hash="hash2",
        r2_object_key="documents/2/reference.pdf",
        status="ready",
        chunk_count=10,
        uploaded_at=datetime.now(timezone.utc),
    )
    mock_db.scalar.return_value = doc

    response = client.get(f"/api/documents/{doc_id}")
    assert response.status_code == 200
    data = response.json()
    assert data["id"] == str(doc_id)
    assert data["filename"] == "reference.pdf"


def test_get_document_not_found(client, mock_db):
    mock_db.scalar.return_value = None
    response = client.get(f"/api/documents/{uuid.uuid4()}")
    assert response.status_code == 404
    assert response.json()["error"]["code"] == "DOCUMENT_NOT_FOUND"


def test_delete_document_success(client, mock_db, mock_user, mock_storage):
    doc_id = uuid.uuid4()
    doc = Document(
        id=doc_id,
        owner_id=mock_user.id,
        filename="to_delete.txt",
        file_type="txt",
        file_size=500,
        content_hash="hash3",
        r2_object_key="documents/3/to_delete.txt",
        status="ready",
        uploaded_at=datetime.now(timezone.utc),
    )
    mock_db.scalar.return_value = doc

    response = client.delete(f"/api/documents/{doc_id}")
    assert response.status_code == 204
    mock_storage.delete_file.assert_called_once_with(doc.r2_object_key)
    mock_db.delete.assert_called_once_with(doc)


def test_view_document_file_inline(client, mock_db, mock_user, mock_storage):
    doc_id = uuid.uuid4()
    doc = Document(
        id=doc_id,
        owner_id=mock_user.id,
        filename="report.pdf",
        file_type="pdf",
        file_size=2048,
        content_hash="hash_pdf",
        r2_object_key="documents/view/report.pdf",
        status="ready",
        uploaded_at=datetime.now(timezone.utc),
    )
    mock_db.scalar.return_value = doc
    mock_storage.download_file.return_value = b"%PDF-1.4 test binary data"

    response = client.get(f"/api/documents/{doc_id}/file")
    assert response.status_code == 200
    assert response.headers["Content-Type"] == "application/pdf"
    assert "inline" in response.headers["Content-Disposition"]
    assert "report.pdf" in response.headers["Content-Disposition"]
    assert response.content == b"%PDF-1.4 test binary data"


def test_view_document_file_access_denied(client, mock_db, mock_storage):
    doc_id = uuid.uuid4()
    foreign_user_id = uuid.uuid4()
    doc = Document(
        id=doc_id,
        owner_id=foreign_user_id,
        filename="secret.pdf",
        file_type="pdf",
        file_size=1024,
        content_hash="hash_foreign",
        r2_object_key="documents/foreign/secret.pdf",
        status="ready",
        uploaded_at=datetime.now(timezone.utc),
    )
    mock_db.scalar.return_value = doc

    response = client.get(f"/api/documents/{doc_id}/file")
    assert response.status_code == 403
    assert response.json()["error"]["code"] == "DOCUMENT_ACCESS_DENIED"

