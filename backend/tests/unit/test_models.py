"""
Unit tests for database models and schema definitions.
Verifies model instantiation, constraints, and relationships.
"""

import uuid
from backend.app.models.user import User
from backend.app.models.document import Document
from backend.app.models.chunk import DocumentChunk
from backend.app.models.conversation import Conversation
from backend.app.models.message import Message


def test_model_instantiation():
    user_id = uuid.uuid4()
    user = User(id=user_id, display_name="Test Developer", email="dev@trace.local")
    assert user.display_name == "Test Developer"
    assert user.id == user_id

    doc_id = uuid.uuid4()
    doc = Document(
        id=doc_id,
        owner_id=user_id,
        filename="quickstart.md",
        file_type="md",
        file_size=1024,
        content_hash="abc123hash",
        r2_object_key=f"documents/{doc_id}/quickstart.md",
        status="uploaded",
    )
    assert doc.filename == "quickstart.md"
    assert doc.status == "uploaded"

    chunk = DocumentChunk(
        document_id=doc_id,
        chunk_index=0,
        content="Getting started with Trace API",
        source_location="Section: Quickstart",
        section_title="Quickstart",
        chunk_metadata={"token_count": 25},
    )
    assert chunk.chunk_index == 0
    assert chunk.section_title == "Quickstart"

    conv_id = uuid.uuid4()
    conv = Conversation(
        id=conv_id,
        owner_id=user_id,
        title="API Setup Query",
    )
    assert conv.title == "API Setup Query"

    msg = Message(
        conversation_id=conv_id,
        role="assistant",
        content="Configure the authorization header [S1]",
        sources=[{"source_id": "S1", "document_id": str(doc_id)}],
        answer_status="answered",
    )
    assert msg.role == "assistant"
    assert msg.answer_status == "answered"
    assert len(msg.sources) == 1
