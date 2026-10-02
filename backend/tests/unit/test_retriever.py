"""
Unit tests for VectorRetriever adhering to PRD Sections 7.2, 10.4 and retrieval specifications.
Tests query embedding, dimension validation, cosine distance ordering, top-k, threshold filtering,
document status filtering, document_id filtering, empty retrieval, and error handling.
"""

import uuid
from unittest.mock import MagicMock
import pytest

from backend.app.core.errors import AppException
from backend.app.rag.retriever import VectorRetriever, RetrievedChunk
from backend.app.models.document import Document
from backend.app.models.chunk import DocumentChunk


def create_fake_chunk(chunk_id, doc_id, index, content, page=None, section=None):
    chunk = MagicMock(spec=DocumentChunk)
    chunk.id = chunk_id
    chunk.document_id = doc_id
    chunk.chunk_index = index
    chunk.content = content
    chunk.page_number = page
    chunk.section_title = section
    chunk.source_location = f"Page {page}" if page else f"Section: {section}"
    chunk.chunk_metadata = {"char_count": len(content)}
    return chunk


def test_invalid_top_k_bounds():
    # top_k must be 1 <= k <= 20
    with pytest.raises(AppException) as exc_low:
        VectorRetriever(top_k=0)
    assert exc_low.value.code == "INVALID_TOP_K"

    with pytest.raises(AppException) as exc_high:
        VectorRetriever(top_k=25)
    assert exc_high.value.code == "INVALID_TOP_K"

    retriever = VectorRetriever(top_k=5)
    mock_db = MagicMock()
    with pytest.raises(AppException) as exc_call:
        retriever.retrieve(query_embedding=[0.1] * 768, db=mock_db, top_k=-1)
    assert exc_call.value.code == "INVALID_TOP_K"


def test_vector_dimension_validation():
    retriever = VectorRetriever()
    mock_db = MagicMock()

    # Pass vector of 512 dimensions instead of configured 768
    with pytest.raises(AppException) as exc:
        retriever.retrieve(query_embedding=[0.1] * 512, db=mock_db)
    assert exc.value.code == "INVALID_VECTOR_DIMENSION"
    assert "768" in exc.value.message


def test_query_embedding_pipeline():
    mock_embedder = MagicMock()
    mock_embedder.embed_query.return_value = [0.2] * 768

    retriever = VectorRetriever(embedder=mock_embedder)

    doc_id = uuid.uuid4()
    c1 = create_fake_chunk(uuid.uuid4(), doc_id, 0, "Authentication uses OAuth2 Bearer tokens.", page=1)

    mock_db = MagicMock()
    mock_db.execute.return_value.all.return_value = [(c1, "auth.pdf", 0.15)]

    results = retriever.retrieve_by_query("How do I authenticate?", db=mock_db)

    # Verify query was embedded using embedder
    mock_embedder.embed_query.assert_called_once_with("How do I authenticate?")
    assert len(results) == 1
    assert results[0].content == "Authentication uses OAuth2 Bearer tokens."
    assert results[0].distance == 0.15
    assert results[0].similarity == 0.85
    assert results[0].metadata["page_number"] == 1
    assert results[0].metadata["source"] == "auth.pdf"


def test_cosine_distance_ordering_and_top_k():
    retriever = VectorRetriever(top_k=2, distance_threshold=0.5)

    doc_id = uuid.uuid4()
    c1 = create_fake_chunk(uuid.uuid4(), doc_id, 0, "Best match text.", page=1)
    c2 = create_fake_chunk(uuid.uuid4(), doc_id, 1, "Second best match text.", page=2)

    mock_db = MagicMock()
    # Executed query returned ordered by ascending distance
    mock_db.execute.return_value.all.return_value = [
        (c1, "doc.pdf", 0.10),
        (c2, "doc.pdf", 0.25),
    ]

    results = retriever.retrieve(query_embedding=[0.1] * 768, db=mock_db, top_k=2)

    assert len(results) == 2
    assert results[0].distance < results[1].distance
    assert results[0].content == "Best match text."
    assert results[1].content == "Second best match text."


def test_threshold_filtering_excludes_distant_chunks():
    # Distance threshold 0.35: chunk with distance 0.40 must be excluded
    retriever = VectorRetriever(distance_threshold=0.35)

    doc_id = uuid.uuid4()
    c1 = create_fake_chunk(uuid.uuid4(), doc_id, 0, "Relevant chunk.", section="Auth")
    c2 = create_fake_chunk(uuid.uuid4(), doc_id, 1, "Distant unrelated chunk.", section="Billing")

    mock_db = MagicMock()
    mock_db.execute.return_value.all.return_value = [
        (c1, "guide.md", 0.20),
        (c2, "guide.md", 0.45),  # Exceeds 0.35 threshold
    ]

    results = retriever.retrieve(query_embedding=[0.1] * 768, db=mock_db)

    assert len(results) == 1
    assert results[0].content == "Relevant chunk."
    assert results[0].distance == 0.20
    assert results[0].metadata["section"] == "Auth"


def test_empty_retrieval_when_all_chunks_exceed_threshold():
    retriever = VectorRetriever(distance_threshold=0.30)

    doc_id = uuid.uuid4()
    c1 = create_fake_chunk(uuid.uuid4(), doc_id, 0, "Irrelevant content.")

    mock_db = MagicMock()
    mock_db.execute.return_value.all.return_value = [
        (c1, "manual.txt", 0.65),  # High distance = low similarity
    ]

    results = retriever.retrieve(query_embedding=[0.1] * 768, db=mock_db)

    # Must return empty list, no hallucinations, no LLM calls
    assert results == []


def test_document_id_filtering_in_query():
    retriever = VectorRetriever()

    mock_db = MagicMock()
    mock_db.execute.return_value.all.return_value = []

    target_doc_id = uuid.uuid4()
    retriever.retrieve(
        query_embedding=[0.1] * 768,
        db=mock_db,
        document_id=target_doc_id,
    )

    # Verify statement inspected by execute contains filter
    assert mock_db.execute.called
    stmt = mock_db.execute.call_args[0][0]
    compiled_sql = str(stmt)
    # Check that SQL joins documents and filters by document_id and status ready
    assert "documents.status = :status_1" in compiled_sql
    assert "documents.id = :id_1" in compiled_sql


def test_ready_document_status_filtering():
    retriever = VectorRetriever()

    mock_db = MagicMock()
    mock_db.execute.return_value.all.return_value = []

    retriever.retrieve(query_embedding=[0.1] * 768, db=mock_db)

    stmt = mock_db.execute.call_args[0][0]
    compiled_sql = str(stmt)
    assert "documents.status = :status_1" in compiled_sql
    # Parameter check
    params = stmt.compile().params
    assert params.get("status_1") == "ready"


def test_database_error_handling():
    retriever = VectorRetriever()

    mock_db = MagicMock()
    mock_db.execute.side_effect = RuntimeError("Database connection pool exhausted")

    with pytest.raises(AppException) as exc:
        retriever.retrieve(query_embedding=[0.1] * 768, db=mock_db)

    assert exc.value.code == "DATABASE_ERROR"
    assert "Failed to retrieve" in exc.value.message
