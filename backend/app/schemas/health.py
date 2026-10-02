"""
Health check schema adhering to PRD Section 15.9.
"""

from typing import Optional, Dict
from pydantic import BaseModel, Field


class HealthResponse(BaseModel):
    status: str = Field(default="ok", description="Application status: ok | degraded")
    database: Optional[str] = Field(default="ok", description="Database status: ok | unavailable")
    environment: str = Field(..., description="Active environment name")
    version: str = Field(default="1.0.0", description="API version")
    services: Optional[Dict[str, str]] = Field(default_factory=dict, description="Status of dependent services")

