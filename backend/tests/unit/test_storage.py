"""
Unit tests for Cloudflare R2 storage service and key management.
"""

import uuid
from unittest.mock import MagicMock
import pytest
from botocore.exceptions import ClientError
from backend.app.services.storage import (
    sanitize_filename,
    build_object_key,
    StorageService,
)
from backend.app.core.errors import AppException


def test_sanitize_filename():
    assert sanitize_filename("../../secret.pdf") == "secret.pdf"
    assert sanitize_filename("..\\..\\windows_traversal.docx") == "windows_traversal.docx"
    assert sanitize_filename("my report (2025) #final!.md") == "my_report_2025_final_.md"
    assert sanitize_filename("") == "unnamed_document"
    assert sanitize_filename("safe-doc.txt") == "safe-doc.txt"


def test_build_object_key():
    doc_id = uuid.uuid4()
    key = build_object_key(doc_id, "../../path/to/my-guide.pdf")
    assert key == f"documents/{doc_id}/my-guide.pdf"


def test_storage_service_upload_and_download():
    mock_s3 = MagicMock()
    service = StorageService(s3_client=mock_s3)

    key = "documents/test-id/doc.pdf"
    content = b"PDF mock content"

    # Upload
    service.upload_bytes(key, content, "application/pdf")
    mock_s3.put_object.assert_called_once_with(
        Bucket=service.bucket_name,
        Key=key,
        Body=content,
        ContentType="application/pdf",
    )

    # Download
    mock_s3.get_object.return_value = {"Body": MagicMock(read=lambda: content)}
    downloaded = service.download_bytes(key)
    assert downloaded == content

    # Delete
    assert service.delete_file(key) is True
    mock_s3.delete_object.assert_called_once_with(
        Bucket=service.bucket_name,
        Key=key,
    )


def test_storage_service_missing_delete_is_success():
    mock_s3 = MagicMock()
    mock_s3.delete_object.side_effect = ClientError(
        {"Error": {"Code": "NoSuchKey", "Message": "Not found"}}, "DeleteObject"
    )
    service = StorageService(s3_client=mock_s3)

    # Missing object treated as success
    assert service.delete_file("documents/test-id/missing.pdf") is True


def test_storage_service_upload_failure_raises_app_exception():
    mock_s3 = MagicMock()
    mock_s3.put_object.side_effect = ClientError(
        {"Error": {"Code": "AccessDenied", "Message": "Access Denied"}}, "PutObject"
    )
    service = StorageService(s3_client=mock_s3)

    with pytest.raises(AppException) as exc_info:
        service.upload_bytes("documents/test/key.pdf", b"data")
    assert exc_info.value.code == "STORAGE_UNAVAILABLE"
    assert exc_info.value.status_code == 502


def test_storage_service_file_exists_and_metadata():
    mock_s3 = MagicMock()
    service = StorageService(s3_client=mock_s3)

    # 1. file_exists -> True
    mock_s3.head_object.return_value = {
        "ContentLength": 1024,
        "ContentType": "application/pdf",
        "ETag": '"abcdef"',
        "LastModified": "2026-09-29T00:00:00Z",
    }
    assert service.file_exists("documents/test/doc.pdf") is True

    # 2. get_file_metadata
    meta = service.get_file_metadata("documents/test/doc.pdf")
    assert meta["content_length"] == 1024
    assert meta["content_type"] == "application/pdf"

    # 3. file_exists -> False on NoSuchKey
    mock_s3.head_object.side_effect = ClientError(
        {"Error": {"Code": "NoSuchKey", "Message": "Not found"}}, "HeadObject"
    )
    assert service.file_exists("documents/test/missing.pdf") is False

    # 4. get_file_metadata -> 404 on NoSuchKey
    with pytest.raises(AppException) as exc_info:
        service.get_file_metadata("documents/test/missing.pdf")
    assert exc_info.value.status_code == 404


def test_storage_service_presigned_url_and_aliases():
    mock_s3 = MagicMock()
    mock_s3.generate_presigned_url.return_value = "https://r2.example.com/presigned?token=123"
    service = StorageService(s3_client=mock_s3)

    url = service.generate_presigned_url("documents/test/doc.pdf", expires_in=1800)
    assert "https://r2.example.com/presigned" in url
    mock_s3.generate_presigned_url.assert_called_once_with(
        ClientMethod="get_object",
        Params={"Bucket": service.bucket_name, "Key": "documents/test/doc.pdf"},
        ExpiresIn=1800,
    )

    # Test upload_file / download_file aliases
    service.upload_file("documents/test/alias.txt", b"hello", "text/plain")
    mock_s3.put_object.assert_called_with(
        Bucket=service.bucket_name,
        Key="documents/test/alias.txt",
        Body=b"hello",
        ContentType="text/plain",
    )

    mock_s3.get_object.return_value = {"Body": MagicMock(read=lambda: b"hello")}
    assert service.download_file("documents/test/alias.txt") == b"hello"
