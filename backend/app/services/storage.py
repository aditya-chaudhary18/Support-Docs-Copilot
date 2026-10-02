"""
Cloudflare R2 Object Storage Service adhering to PRD Section 12.
Provides private S3-compatible storage operations for original document bytes.
Object keys are structured strictly as: documents/{document_id}/{sanitized_filename}
"""

import re
import uuid
import logging
from typing import Optional
import boto3
from botocore.config import Config
from botocore.exceptions import ClientError, BotoCoreError

from backend.app.core.config import get_settings
from backend.app.core.errors import AppException

logger = logging.getLogger(__name__)


def sanitize_filename(filename: str, max_length: int = 150) -> str:
    """
    Sanitize an uploaded filename to prevent directory traversal and invalid S3 characters.
    Preserves basic alphanumerics, dots, hyphens, and underscores.
    """
    if not filename:
        return "unnamed_document"

    # Remove null bytes, control characters, and Windows drive prefixes (e.g. C:)
    clean = re.sub(r"[\x00-\x1f\x7f]", "", filename)
    clean = re.sub(r"^[a-zA-Z]:", "", clean)

    # Remove path traversal characters (slashes, backslashes, leading dots)
    name = clean.replace("\\", "/").split("/")[-1].strip()
    name = re.sub(r"^\.+", "", name)  # strip leading dots

    # Keep only safe alphanumeric, dash, underscore, and dot characters
    sanitized = re.sub(r"[^\w.\-_]", "_", name)
    sanitized = re.sub(r"_+", "_", sanitized)  # collapse multiple underscores


    # Ensure length cap while preserving extension
    if len(sanitized) > max_length:
        parts = sanitized.rsplit(".", 1)
        if len(parts) == 2:
            base, ext = parts
            allowed_base_len = max_length - len(ext) - 1
            sanitized = f"{base[:allowed_base_len]}.{ext}"
        else:
            sanitized = sanitized[:max_length]

    return sanitized or "document"


def build_object_key(document_id: str | uuid.UUID, filename: str) -> str:
    """Format object key according to PRD rule: documents/{document_id}/{sanitized_filename}."""
    safe_name = sanitize_filename(filename)
    return f"documents/{str(document_id)}/{safe_name}"


class StorageService:
    """Encapsulates all interaction with the Cloudflare R2 private bucket."""

    def __init__(self, s3_client=None):
        self.settings = get_settings()
        self.bucket_name = self.settings.R2_BUCKET_NAME
        self._client = s3_client

    @property
    def client(self):
        if self._client is None:
            # Build boto3 client for Cloudflare R2 (S3-compatible)
            boto_config = Config(
                retries={"max_attempts": 3, "mode": "standard"},
                signature_version="s3v4",
            )
            self._client = boto3.client(
                "s3",
                endpoint_url=self.settings.derived_r2_endpoint,
                aws_access_key_id=self.settings.R2_ACCESS_KEY_ID.get_secret_value(),
                aws_secret_access_key=self.settings.R2_SECRET_ACCESS_KEY.get_secret_value(),
                region_name="auto",
                config=boto_config,
            )
        return self._client

    def upload_bytes(
        self,
        object_key: str,
        data: bytes,
        content_type: str = "application/octet-stream",
    ) -> None:
        """Upload raw file bytes to the private R2 bucket."""
        try:
            self.client.put_object(
                Bucket=self.bucket_name,
                Key=object_key,
                Body=data,
                ContentType=content_type,
            )
            logger.info("Successfully uploaded object to R2: %s", object_key)
        except (ClientError, BotoCoreError) as exc:
            logger.error("R2 upload failure for key %s: %s", object_key, exc)
            raise AppException(
                status_code=502,
                code="STORAGE_UNAVAILABLE",
                message="Cloud storage is temporarily unavailable. Please try again.",
            ) from exc

    def download_bytes(self, object_key: str) -> bytes:
        """Download raw file bytes from R2 for processing or reprocessing."""
        try:
            response = self.client.get_object(Bucket=self.bucket_name, Key=object_key)
            return response["Body"].read()
        except ClientError as exc:
            error_code = exc.response.get("Error", {}).get("Code", "")
            if error_code in ("NoSuchKey", "404"):
                logger.warning("R2 object not found: %s", object_key)
                raise AppException(
                    status_code=404,
                    code="OBJECT_NOT_FOUND",
                    message="Requested document file was not found in storage.",
                ) from exc
            logger.error("R2 download error for key %s: %s", object_key, exc)
            raise AppException(
                status_code=502,
                code="STORAGE_UNAVAILABLE",
                message="Failed to retrieve document from storage.",
            ) from exc
        except BotoCoreError as exc:
            logger.error("BotoCore error downloading key %s: %s", object_key, exc)
            raise AppException(
                status_code=502,
                code="STORAGE_UNAVAILABLE",
                message="Storage communication failed.",
            ) from exc

    def delete_file(self, object_key: str) -> bool:
        """Delete an object from R2. Missing objects are treated as success per PRD Section 12.3."""
        try:
            self.client.delete_object(Bucket=self.bucket_name, Key=object_key)
            logger.info("Deleted R2 object: %s", object_key)
            return True
        except ClientError as exc:
            error_code = exc.response.get("Error", {}).get("Code", "")
            if error_code in ("NoSuchKey", "404"):
                logger.info("R2 object already missing: %s", object_key)
                return True
            logger.error("R2 deletion error for key %s: %s", object_key, exc)
            raise AppException(
                status_code=502,
                code="STORAGE_UNAVAILABLE",
                message="Failed to delete document from storage.",
            ) from exc
        except BotoCoreError as exc:
            logger.error("BotoCore deletion error for key %s: %s", object_key, exc)
            raise AppException(
                status_code=502,
                code="STORAGE_UNAVAILABLE",
                message="Storage communication failed during deletion.",
            ) from exc

    def upload_file(
        self,
        object_key: str,
        data: bytes,
        content_type: str = "application/octet-stream",
    ) -> None:
        """Upload raw file bytes or buffer to the private R2 bucket."""
        return self.upload_bytes(object_key, data, content_type)

    def download_file(self, object_key: str) -> bytes:
        """Download raw file bytes from R2."""
        return self.download_bytes(object_key)

    def file_exists(self, object_key: str) -> bool:
        """Check if an object exists in R2 without downloading full content."""
        try:
            self.client.head_object(Bucket=self.bucket_name, Key=object_key)
            return True
        except ClientError as exc:
            error_code = exc.response.get("Error", {}).get("Code", "")
            if error_code in ("NoSuchKey", "404"):
                return False
            logger.error("R2 head_object error for key %s: %s", object_key, exc)
            raise AppException(
                status_code=502,
                code="STORAGE_UNAVAILABLE",
                message="Failed to query storage status.",
            ) from exc
        except BotoCoreError as exc:
            logger.error("BotoCore error in file_exists for key %s: %s", object_key, exc)
            raise AppException(
                status_code=502,
                code="STORAGE_UNAVAILABLE",
                message="Storage communication failed.",
            ) from exc

    def get_file_metadata(self, object_key: str) -> dict:
        """Retrieve metadata for an object in R2."""
        try:
            response = self.client.head_object(Bucket=self.bucket_name, Key=object_key)
            return {
                "content_length": response.get("ContentLength"),
                "content_type": response.get("ContentType"),
                "etag": response.get("ETag"),
                "last_modified": response.get("LastModified"),
                "metadata": response.get("Metadata", {}),
            }
        except ClientError as exc:
            error_code = exc.response.get("Error", {}).get("Code", "")
            if error_code in ("NoSuchKey", "404"):
                raise AppException(
                    status_code=404,
                    code="OBJECT_NOT_FOUND",
                    message="Requested document file was not found in storage.",
                ) from exc
            logger.error("R2 get_file_metadata error for key %s: %s", object_key, exc)
            raise AppException(
                status_code=502,
                code="STORAGE_UNAVAILABLE",
                message="Failed to query document metadata from storage.",
            ) from exc
        except BotoCoreError as exc:
            logger.error("BotoCore error in get_file_metadata for key %s: %s", object_key, exc)
            raise AppException(
                status_code=502,
                code="STORAGE_UNAVAILABLE",
                message="Storage communication failed.",
            ) from exc

    def generate_presigned_url(
        self,
        object_key: str,
        expires_in: int = 3600,
        operation: str = "get_object",
    ) -> str:
        """Generate a short-lived presigned URL for private R2 object access."""
        try:
            return self.client.generate_presigned_url(
                ClientMethod=operation,
                Params={"Bucket": self.bucket_name, "Key": object_key},
                ExpiresIn=expires_in,
            )
        except (ClientError, BotoCoreError) as exc:
            logger.error("Failed to generate presigned URL for key %s: %s", object_key, exc)
            raise AppException(
                status_code=502,
                code="STORAGE_UNAVAILABLE",
                message="Failed to generate secure access URL.",
            ) from exc


_storage_service: Optional[StorageService] = None


def get_storage_service() -> StorageService:
    """Dependency provider for StorageService."""
    global _storage_service
    if _storage_service is None:
        _storage_service = StorageService()
    return _storage_service
