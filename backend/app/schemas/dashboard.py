"""
Pydantic schemas for the dashboard endpoints.
"""

from pydantic import BaseModel, Field


class DashboardStatsResponse(BaseModel):
    indexed_documents: int = Field(default=0, description="Ready documents indexed for current user")
    conversations: int = Field(default=0, description="Total conversations belonging to current user")
    processing_ingestion: int = Field(default=0, description="Documents currently in processing state")
    indexed_chunks: int = Field(default=0, description="Total chunks indexed across current user's documents")
