"""
Unit tests for RAG pipeline components: retriever, context builder, citation builder, and pipeline orchestrator.
"""

import uuid
from unittest.mock import MagicMock
from backend.app.rag.retriever import RetrievedChunk
from backend.app.rag.context_builder import ContextBuilder
from backend.app.rag.citation_builder import CitationBuilder, STANDARD_INSUFFICIENT_MESSAGE
from backend.app.rag.pipeline import RagPipeline


def test_context_builder_labels_and_budget():
    builder = ContextBuilder(max_context_chars=500)
    chunk1 = RetrievedChunk(
        chunk_id=uuid.uuid4(),
        document_id=uuid.uuid4(),
        filename="api.pdf",
        chunk_index=0,
        content="Authentication requires Bearer token.",
        page_number=3,
        section_title="Auth",
        source_location="Page 3",
        similarity=0.92,
        distance=0.08,
    )
    chunk2 = RetrievedChunk(
        chunk_id=uuid.uuid4(),
        document_id=uuid.uuid4(),
        filename="api.pdf",
        chunk_index=1,
        content="Endpoints are rate limited to 100 req/min.",
        page_number=4,
        section_title="Limits",
        source_location="Page 4",
        similarity=0.85,
        distance=0.15,
    )

    bundle = builder.build_context([chunk1, chunk2])
    assert "S1" in bundle.sources_by_id
    assert "S2" in bundle.sources_by_id
    assert "[S1]" in bundle.formatted_context
    assert "[S2]" in bundle.formatted_context
    assert "Document: api.pdf" in bundle.formatted_context
    assert bundle.sources_by_id["S1"].content == chunk1.content


def test_citation_builder_strips_fabricated_sources():
    builder = CitationBuilder()
    doc_id = uuid.uuid4()
    chunk1 = RetrievedChunk(
        chunk_id=uuid.uuid4(),
        document_id=doc_id,
        filename="guide.md",
        chunk_index=0,
        content="Run trace init to setup.",
        page_number=None,
        section_title="Init",
        source_location="Section: Init",
        similarity=0.88,
        distance=0.12,
    )
    sources_by_id = {"S1": chunk1}

    # Model cited S1 and fabricated S99
    raw_answer = "Run trace init [S1] and configure cluster [S99]."
    answer, sources, status = builder.build_citations(
        raw_answer=raw_answer,
        sufficient_context=True,
        raw_cited_ids=["S1", "S99"],
        sources_by_id=sources_by_id,
    )

    assert status == "answered"
    assert len(sources) == 1
    assert sources[0]["source_id"] == "S1"
    assert sources[0]["filename"] == "guide.md"
    assert "[S99]" not in answer  # Stripped fabricated tag
    assert "[S1]" in answer


def test_citation_builder_ungrounded_refusal():
    builder = CitationBuilder()
    # Model claims sufficient context but cites 0 valid sources
    raw_answer = "This is a hallucinated statement."
    answer, sources, status = builder.build_citations(
        raw_answer=raw_answer,
        sufficient_context=True,
        raw_cited_ids=["S42"],  # S42 does not exist
        sources_by_id={},
    )
    assert status == "insufficient_context"
    assert answer == STANDARD_INSUFFICIENT_MESSAGE
    assert sources == []


def test_rag_pipeline_retrieval_gate_short_circuits():
    # If no chunks pass threshold, pipeline MUST NOT call Gemini
    mock_embedder = MagicMock()
    mock_embedder.embed_query.return_value = [0.1] * 768

    mock_retriever = MagicMock()
    mock_retriever.retrieve.return_value = []  # No chunks above threshold

    mock_gemini = MagicMock()

    pipeline = RagPipeline(
        embedder=mock_embedder,
        retriever=mock_retriever,
        gemini_service=mock_gemini,
    )

    mock_db = MagicMock()
    res = pipeline.run(mock_db, "What is the meaning of life?", uuid.uuid4())

    assert res["answer_status"] == "insufficient_context"
    assert res["sources"] == []
    # Assert Gemini was never called
    mock_gemini.generate_grounded_answer.assert_not_called()
