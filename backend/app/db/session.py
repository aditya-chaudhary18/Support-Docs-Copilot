"""
Database session management configured for Neon PostgreSQL.
Configured with pool_pre_ping=True to gracefully handle compute auto-suspend and reconnection.
"""

from typing import Generator
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
from backend.app.core.config import get_settings

settings = get_settings()

# Ensure database URL uses postgresql+psycopg driver for psycopg v3
db_url = settings.DATABASE_URL.get_secret_value()
if db_url.startswith("postgresql://"):
    db_url = db_url.replace("postgresql://", "postgresql+psycopg://", 1)

engine = create_engine(
    db_url,
    pool_pre_ping=True,      # Neon auto-suspend recovery
    pool_size=5,             # Conservative pool for free-tier limits
    max_overflow=10,
    pool_recycle=300,        # Recycle connections periodically
    echo=False,
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def get_db() -> Generator[Session, None, None]:
    """Dependency that yields a database session and guarantees closure."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
