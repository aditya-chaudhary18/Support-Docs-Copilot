"""
API Integration tests for /api/chat and /api/conversations endpoints.
Adheres to PRD Section 15.6 - 15.8.
"""

import uuid
from datetime import datetime, timezone
from unittest.mock import patch, MagicMock
from backend.app.models.conversation import Conversation
from backend.app.models.message import Message


def test_chat_no_ready_documents_rejected(client, mock_db):
    # Ready count is 0
    mock_db.scalar.return_value = 0

    response = client.post(
        "/api/chat",
        json={"question": "How do I configure OAuth?"},
    )
    assert response.status_code == 409
    data = response.json()
    assert data["error"]["code"] == "NO_DOCUMENTS_READY"


def test_chat_with_ready_documents_success(client, mock_db, mock_user):
    # 1. Ready count check passes
    mock_db.scalar.side_effect = [
        3,  # count of ready documents = 3
        MagicMock(),
        MagicMock(),
    ]

    with patch("backend.app.services.chat_service.RagPipeline") as mock_pipeline_class:
        mock_pipeline = MagicMock()
        mock_pipeline.run.return_value = {
            "answer": "Set the AUTH_KEY in config [S1].",
            "answer_status": "answered",
            "sources": [
                {
                    "source_id": "S1",
                    "document_id": str(uuid.uuid4()),
                    "filename": "security.md",
                    "page_number": None,
                    "section_title": "Auth",
                    "source_location": "Section: Auth",
                    "chunk_index": 0,
                    "excerpt": "Set AUTH_KEY...",
                    "similarity": 0.89,
                }
            ],
        }
        mock_pipeline_class.return_value = mock_pipeline

        response = client.post(
            "/api/chat",
            json={"question": "How to set AUTH_KEY?"},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["answer_status"] == "answered"
        assert "AUTH_KEY" in data["answer"]
        assert len(data["sources"]) == 1
        assert data["sources"][0]["source_id"] == "S1"
        assert "conversation_id" in data
        assert "message_id" in data


def test_list_conversations(client, mock_db, mock_user):
    conv1 = Conversation(
        id=uuid.uuid4(),
        owner_id=mock_user.id,
        title="Setup Questions",
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc),
    )
    mock_db.scalar.side_effect = [
        1,  # total conversations count
        2,  # message count for conv1
    ]
    mock_db.scalars.return_value.all.return_value = [conv1]

    response = client.get("/api/conversations")
    assert response.status_code == 200
    data = response.json()
    assert data["total"] == 1
    assert len(data["items"]) == 1
    assert data["items"][0]["title"] == "Setup Questions"
    assert data["items"][0]["message_count"] == 2


def test_get_conversation_detail(client, mock_db, mock_user):
    conv_id = uuid.uuid4()
    conv = Conversation(
        id=conv_id,
        owner_id=mock_user.id,
        title="Deployment Thread",
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc),
    )
    msg1 = Message(
        id=uuid.uuid4(),
        conversation_id=conv_id,
        role="user",
        content="How do I deploy?",
        created_at=datetime.now(timezone.utc),
    )
    msg2 = Message(
        id=uuid.uuid4(),
        conversation_id=conv_id,
        role="assistant",
        content="Run docker-compose up [S1]",
        sources=[{"source_id": "S1", "filename": "deploy.md"}],
        answer_status="answered",
        created_at=datetime.now(timezone.utc),
    )

    mock_db.scalar.return_value = conv
    mock_db.scalars.return_value.all.return_value = [msg1, msg2]

    response = client.get(f"/api/conversations/{conv_id}")
    assert response.status_code == 200
    data = response.json()
    assert data["id"] == str(conv_id)
    assert len(data["messages"]) == 2
    assert data["messages"][0]["role"] == "user"
    assert data["messages"][1]["role"] == "assistant"


def test_delete_conversation(client, mock_db, mock_user):
    conv_id = uuid.uuid4()
    conv = Conversation(
        id=conv_id,
        owner_id=mock_user.id,
        title="To Delete",
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc),
    )
    mock_db.scalar.return_value = conv

    response = client.delete(f"/api/conversations/{conv_id}")
    assert response.status_code == 204
    mock_db.delete.assert_called_once_with(conv)


def test_export_conversation_markdown(client, mock_db, mock_user):
    conv_id = uuid.uuid4()
    conv = Conversation(
        id=conv_id,
        owner_id=mock_user.id,
        title="Deployment Thread",
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc),
    )
    msg1 = Message(
        id=uuid.uuid4(),
        conversation_id=conv_id,
        role="user",
        content="How do I deploy?",
        created_at=datetime.now(timezone.utc),
    )
    msg2 = Message(
        id=uuid.uuid4(),
        conversation_id=conv_id,
        role="assistant",
        content="Run docker-compose up [S1]",
        sources=[{
            "source_id": "S1",
            "filename": "deploy.md",
            "chunk_id": str(uuid.uuid4()),
            "page_number": 1,
            "section_title": "Docker Setup",
            "similarity": 0.92,
            "excerpt": "Run docker-compose up -d to launch the backend.",
        }],
        answer_status="answered",
        created_at=datetime.now(timezone.utc),
    )

    mock_db.scalar.return_value = conv
    mock_db.scalars.return_value.all.return_value = [msg1, msg2]

    response = client.get(f"/api/conversations/{conv_id}/export?format=markdown")
    assert response.status_code == 200
    assert "text/markdown" in response.headers["content-type"]
    assert "attachment" in response.headers["content-disposition"]
    text = response.text
    assert "# Support Docs Copilot" in text
    assert "Deployment Thread" in text
    assert "How do I deploy?" in text
    assert "Run docker-compose up [S1]" in text
    assert "[S1] deploy.md" in text
    assert "Docker Setup" in text


def test_export_conversation_json(client, mock_db, mock_user):
    conv_id = uuid.uuid4()
    conv = Conversation(
        id=conv_id,
        owner_id=mock_user.id,
        title="Deployment Thread",
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc),
    )
    msg1 = Message(
        id=uuid.uuid4(),
        conversation_id=conv_id,
        role="user",
        content="How do I deploy?",
        created_at=datetime.now(timezone.utc),
    )

    mock_db.scalar.return_value = conv
    mock_db.scalars.return_value.all.return_value = [msg1]

    response = client.get(f"/api/conversations/{conv_id}/export?format=json")
    assert response.status_code == 200
    assert "application/json" in response.headers["content-type"]
    data = response.json()
    assert data["application"] == "Support Docs Copilot"
    assert data["session_id"] == str(conv_id)
    assert len(data["turns"]) == 1
    assert data["turns"][0]["question"] == "How do I deploy?"


def test_export_conversation_pdf(client, mock_db, mock_user):
    conv_id = uuid.uuid4()
    conv = Conversation(
        id=conv_id,
        owner_id=mock_user.id,
        title="Production Deployment Guide",
        selected_document_ids=[str(uuid.uuid4())],
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc),
    )
    msg1 = Message(
        id=uuid.uuid4(),
        conversation_id=conv_id,
        role="user",
        content="How do I configure production SSL?",
        created_at=datetime.now(timezone.utc),
    )
    msg2 = Message(
        id=uuid.uuid4(),
        conversation_id=conv_id,
        role="assistant",
        content="Configure SSL certificates via Cloudflare [S1].",
        sources=[{
            "source_id": "S1",
            "filename": "ssl_guide.pdf",
            "chunk_id": str(uuid.uuid4()),
            "page_number": 3,
            "section_title": "SSL Config",
            "similarity": 0.95,
            "excerpt": "Provision TLS 1.3 certificates in Cloudflare dashboard.",
        }],
        answer_status="answered",
        created_at=datetime.now(timezone.utc),
    )

    mock_db.scalar.return_value = conv
    mock_db.scalars.return_value.all.return_value = [msg1, msg2]

    response = client.get(f"/api/conversations/{conv_id}/export?format=pdf")
    assert response.status_code == 200
    assert "application/pdf" in response.headers["content-type"]
    assert "attachment" in response.headers["content-disposition"]
    assert response.content.startswith(b"%PDF")
    assert len(response.content) > 500


def test_chat_empty_document_selection_rejected(client, mock_db):
    response = client.post(
        "/api/chat",
        json={"question": "What is in these docs?", "document_ids": []},
    )
    assert response.status_code == 400
    data = response.json()
    assert data["error"]["code"] == "NO_DOCUMENT_SELECTED"


def test_chat_with_selected_documents_success(client, mock_db, mock_user):
    doc_id1 = uuid.uuid4()
    doc_id2 = uuid.uuid4()

    mock_db.scalars.return_value.all.return_value = [doc_id1, doc_id2]

    with patch("backend.app.services.chat_service.RagPipeline") as mock_pipeline_class:
        mock_pipeline = MagicMock()
        mock_pipeline.run.return_value = {
            "answer": "This API uses JWT tokens [S1].",
            "answer_status": "answered",
            "sources": [{
                "source_id": "S1",
                "document_id": str(doc_id1),
                "filename": "api_spec.pdf",
                "page_number": 1,
                "section_title": "Auth",
                "source_location": "Page 1",
                "chunk_index": 0,
                "excerpt": "API uses JWT Bearer tokens.",
                "similarity": 0.96,
            }],
        }
        mock_pipeline_class.return_value = mock_pipeline

        response = client.post(
            "/api/chat",
            json={
                "question": "What authentication is used?",
                "document_ids": [str(doc_id1), str(doc_id2)],
            },
        )
        assert response.status_code == 200
        data = response.json()
        assert data["answer_status"] == "answered"
        assert len(data["sources"]) == 1
        assert "JWT" in data["answer"]


def test_update_conversation_scope(client, mock_db, mock_user):
    conv_id = uuid.uuid4()
    doc_id1 = str(uuid.uuid4())
    doc_id2 = str(uuid.uuid4())

    conv = Conversation(
        id=conv_id,
        owner_id=mock_user.id,
        title="Active Thread",
        selected_document_ids=None,
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc),
    )
    mock_db.scalar.side_effect = [conv, 0]
    mock_db.scalars.return_value.all.return_value = []

    response = client.patch(
        f"/api/conversations/{conv_id}/scope",
        json={"selected_document_ids": [doc_id1, doc_id2]},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["id"] == str(conv_id)
    assert data["selected_document_ids"] == [doc_id1, doc_id2]



