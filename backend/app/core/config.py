"""
Central Application Settings Configuration.
All configuration is read from environment variables through this class.
Secrets are strictly encapsulated as SecretStr to prevent accidental leakage in logs.
"""

from functools import lru_cache
from typing import List, Optional
from pydantic import Field, SecretStr, field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=("backend/.env", ".env"),
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",
    )

    # ---------- Application ----------
    APP_ENV: str = Field(default="development", description="development | production | test")
    DEBUG: bool = Field(default=False, description="Debug mode; strictly False in production")
    LOG_LEVEL: str = Field(default="INFO", description="DEBUG | INFO | WARNING | ERROR")

    API_BASE_PATH: str = Field(default="/api", description="Base API route prefix")
    CORS_ALLOWED_ORIGINS: str = Field(
        default="http://localhost:5173,http://127.0.0.1:5173,http://localhost:3000,http://127.0.0.1:3000",
        description="Comma-separated list of allowed CORS origins",
    )

    CORS_ORIGINS: Optional[str] = Field(
        default=None,
        description="Alternative alias for CORS_ALLOWED_ORIGINS",
    )

    # ---------- Authentication (JWT) ----------
    JWT_SECRET: SecretStr = Field(
        default=SecretStr("trace-insecure-dev-secret-change-in-production-2026"),
        description="Secret key for signing JWT access tokens",
    )
    JWT_ALGORITHM: str = Field(default="HS256", description="Algorithm for JWT signing")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = Field(default=1440, description="Token expiration lifetime in minutes (24 hours)")
    GOOGLE_CLIENT_ID: Optional[str] = Field(
        default=None,
        description="Google OAuth2 Client ID for Sign-In with Google verification",
    )

    # ---------- Neon PostgreSQL (pgvector) ----------
    DATABASE_URL: SecretStr = Field(
        default=SecretStr("postgresql://postgres:postgres@localhost:5432/support_docs?sslmode=require"),
        description="Neon PostgreSQL connection string with pgvector extension",
    )

    # ---------- Google Gemini API ----------
    GEMINI_API_KEY: SecretStr = Field(
        default=SecretStr("placeholder-gemini-key"),
        description="Google Gemini API Key",
    )
    GEMINI_GENERATION_MODEL: str = Field(
        default="gemini-flash-latest",
        description="Gemini model for grounded generation",
    )
    GEMINI_EMBEDDING_MODEL: str = Field(
        default="text-embedding-004",
        description="Gemini model for text embeddings",
    )
    EMBEDDING_DIMENSION: int = Field(
        default=768,
        description="Output dimension of the selected embedding model (must match DB vector column)",
    )
    GEMINI_TEMPERATURE: float = Field(
        default=0.1,
        description="Low temperature for deterministic, grounded responses",
    )
    GEMINI_MAX_OUTPUT_TOKENS: int = Field(
        default=2048,
        description="Maximum tokens for generated responses",
    )
    GEMINI_TIMEOUT_SECONDS: int = Field(
        default=30,
        description="Timeout for outbound Gemini requests",
    )
    EMBEDDING_BATCH_SIZE: int = Field(
        default=32,
        description="Batch size for embedding generation",
    )
    EMBEDDING_MAX_RETRIES: int = Field(
        default=5,
        description="Maximum retries with backoff on Gemini rate limits",
    )

    # ---------- Cloudflare R2 (Object Storage) ----------
    R2_ACCOUNT_ID: str = Field(default="placeholder-account-id")
    R2_ACCESS_KEY_ID: SecretStr = Field(default=SecretStr("placeholder-access-key"))
    R2_SECRET_ACCESS_KEY: SecretStr = Field(default=SecretStr("placeholder-secret-key"))
    R2_BUCKET_NAME: str = Field(default="support-docs-copilot")
    R2_ENDPOINT: Optional[str] = Field(default=None, description="Direct R2 S3 API endpoint URL")
    R2_ENDPOINT_URL: Optional[str] = Field(default=None, description="Direct R2 endpoint alias")

    # ---------- Upload & Document Limits ----------
    MAX_UPLOAD_MB: int = Field(default=10, description="Maximum file upload size in MB")
    MAX_PDF_PAGES: int = Field(default=100, description="Maximum pages for uploaded PDFs")
    MAX_CHUNKS_PER_DOCUMENT: int = Field(default=2000, description="Max chunks permitted per document")
    MIN_EXTRACTED_CHARS: int = Field(default=50, description="Minimum characters for valid document text")
    PROCESSING_TIMEOUT_MINUTES: int = Field(default=15, description="Stale processing threshold")

    # ---------- RAG Pipeline Parameters ----------
    CHUNK_SIZE: int = Field(default=1200, description="Target chunk size in characters")
    CHUNK_OVERLAP: int = Field(default=200, description="Overlap between consecutive chunks")
    MIN_CHUNK_CHARS: int = Field(default=100, description="Minimum characters for a valid chunk")
    TOP_K: int = Field(default=5, description="Number of top chunks to retrieve")
    RETRIEVAL_DISTANCE_THRESHOLD: float = Field(
        default=0.4,
        description="Maximum cosine distance cutoff for vector retrieval (lower distance = higher similarity)",
    )
    SIMILARITY_THRESHOLD: float = Field(default=0.65, description="Minimum cosine similarity cutoff")
    MAX_CONTEXT_CHARS: int = Field(default=6000, description="Maximum total characters in prompt context")
    MAX_CONTEXT_CHARACTERS: int = Field(default=6000, description="Maximum total characters in prompt context (alias)")
    HISTORY_MESSAGES: int = Field(default=6, description="Number of recent messages to include as history")
    MAX_QUESTION_CHARS: int = Field(default=2000, description="Maximum allowed question length")

    # ---------- In-Process Rate Limiting ----------
    RATE_LIMIT_CHAT_PER_MINUTE: int = Field(default=20)
    RATE_LIMIT_UPLOAD_PER_MINUTE: int = Field(default=10)

    @field_validator("CHUNK_OVERLAP")
    @classmethod
    def validate_overlap(cls, v: int, info) -> int:
        chunk_size = info.data.get("CHUNK_SIZE", 1000)
        if v >= chunk_size:
            raise ValueError(f"CHUNK_OVERLAP ({v}) must be strictly less than CHUNK_SIZE ({chunk_size})")
        return v

    @model_validator(mode="after")
    def validate_production_configuration(self) -> "Settings":
        """Strictly validates secrets and security rules when running in production."""
        if self.APP_ENV == "production":
            errors = []
            db_val = self.DATABASE_URL.get_secret_value()
            if not db_val or "placeholder" in db_val.lower() or "localhost" in db_val.lower():
                errors.append("DATABASE_URL must be configured with a valid production Neon connection string.")

            gemini_key = self.GEMINI_API_KEY.get_secret_value()
            if not gemini_key or "placeholder" in gemini_key.lower():
                errors.append("GEMINI_API_KEY must be set to a valid API key.")

            if not self.R2_ACCOUNT_ID or "placeholder" in self.R2_ACCOUNT_ID.lower():
                errors.append("R2_ACCOUNT_ID must be set.")

            r2_key = self.R2_ACCESS_KEY_ID.get_secret_value()
            if not r2_key or "placeholder" in r2_key.lower():
                errors.append("R2_ACCESS_KEY_ID must be set.")

            r2_sec = self.R2_SECRET_ACCESS_KEY.get_secret_value()
            if not r2_sec or "placeholder" in r2_sec.lower():
                errors.append("R2_SECRET_ACCESS_KEY must be set.")

            if not self.R2_BUCKET_NAME or "placeholder" in self.R2_BUCKET_NAME.lower():
                errors.append("R2_BUCKET_NAME must be configured.")

            if self.DEBUG is True:
                errors.append("DEBUG mode must be False in production.")

            if errors:
                raise ValueError("Production configuration validation failed: " + "; ".join(errors))

        return self


    @property
    def cors_origins(self) -> List[str]:
        raw_origins = self.CORS_ORIGINS or self.CORS_ALLOWED_ORIGINS
        return [origin.strip() for origin in raw_origins.split(",") if origin.strip()]

    @property
    def derived_r2_endpoint(self) -> str:
        endpoint = self.R2_ENDPOINT or self.R2_ENDPOINT_URL
        if endpoint:
            return endpoint
        return f"https://{self.R2_ACCOUNT_ID}.r2.cloudflarestorage.com"


@lru_cache()
def get_settings() -> Settings:
    """Return cached application settings singleton."""
    return Settings()
