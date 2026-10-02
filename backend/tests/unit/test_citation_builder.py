"""
Unit tests for the Citation Builder adhering to Step 9 requirements.

Covers:
1. Single valid source ID.
2. Multiple valid source IDs.
3. Source ID mapping (S1 -> chunk 0, S2 -> chunk 1, ...).
4. Metadata preservation (document_id, chunk_id, filename, page, section, chunk_index, similarity).
5. Missing page metadata handled as None (not 0 or fabricated).
6. Missing section metadata handled as None (not 'Unknown' or fabricated).
7. Invalid source ID (e.g. S99) discarded without crashing.
8. Mixed valid and invalid IDs (keeps valid S1, discards S99).
9. Duplicate source IDs deduplicated preserving first-occurrence order.
10. Citation order preserved as selected by model (e.g. [S3, S1] -> S3 then S1).
11. sufficient_context=False strictly yields empty citation list [].
12. Empty retrieval yields empty citation list [].
13. No model-generated metadata is trusted (only source IDs used).
14. Authoritative backend metadata is used.
15. Full pipeline integration (retrieval -> context -> prompt -> generation -> citations).
"""

import uuid
from unittest.mock import MagicMock
import pytest

from backend.app.rag.retriever import RetrievedChunk
from backend.app.rag.citation_builder import (
    Citation,
    CitationBuilder,
    build_citations,
    STANDARD_INSUFFICIENT_MESSAGE,
)
from backend.app.rag.pipeline import RagPipeline


# ---------------------------------------------------------------------------
# Test Fixtures & Helpers
# ---------------------------------------------------------------------------

def _create_chunk(
    content: str = "Test chunk content",
    filename: str | None = "guide.pdf",
    page: int | None = 4,
    section: str | None = "Setup",
    chunk_index: int = 0,
    similarity: float = 0.88,
    doc_id: uuid.UUID | None = None,
    chunk_id: uuid.UUID | None = None,
) -> RetrievedChunk:
    return RetrievedChunk(
        chunk_id=chunk_id or uuid.uuid4(),
        document_id=doc_id or uuid.uuid4(),
        content=content,
        distance=round(1.0 - similarity, 4),
        filename=filename or "",
        chunk_index=chunk_index,
        page_number=page,
        section_title=section,
        source_location=f"Page {page}" if page else f"Section: {section}" if section else "",
        similarity=similarity,
    )


# =====================================================================
# CITATION BUILDER UNIT TESTS
# =====================================================================

class TestCitationBuilderSingleAndMultiple:
    """Test 1 & 2: Single and multiple valid source IDs."""

    def test_single_valid_source_id(self):
        builder = CitationBuilder()
        doc_id = uuid.uuid4()
        chunk_id = uuid.uuid4()
        chunk = _create_chunk(
            content="Authentication requires Bearer token.",
            filename="auth.pdf",
            page=2,
            section="Authentication",
            doc_id=doc_id,
            chunk_id=chunk_id,
        )

        citations = builder.build(
            retrieved_chunks=[chunk],
            cited_source_ids=["S1"],
            sufficient_context=True,
        )

        assert len(citations) == 1
        cit = citations[0]
        assert cit.source_id == "S1"
        assert cit.document_id == doc_id
        assert cit.chunk_id == chunk_id
        assert cit.filename == "auth.pdf"
        assert cit.page == 2
        assert cit.page_number == 2
        assert cit.section == "Authentication"
        assert cit.section_title == "Authentication"
        assert "Authentication requires Bearer token." in cit.excerpt

    def test_multiple_valid_source_ids(self):
        builder = CitationBuilder()
        chunk1 = _create_chunk(content="Chunk 1", filename="doc1.pdf", page=1)
        chunk2 = _create_chunk(content="Chunk 2", filename="doc2.pdf", page=2)
        chunk3 = _create_chunk(content="Chunk 3", filename="doc3.pdf", page=3)

        citations = builder.build(
            retrieved_chunks=[chunk1, chunk2, chunk3],
            cited_source_ids=["S1", "S2", "S3"],
            sufficient_context=True,
        )

        assert len(citations) == 3
        assert [c.source_id for c in citations] == ["S1", "S2", "S3"]
        assert [c.filename for c in citations] == ["doc1.pdf", "doc2.pdf", "doc3.pdf"]


class TestCitationSourceIdMapping:
    """Test 3: Source ID mapping matches retrieval rank (S1 -> chunk 0, S2 -> chunk 1, etc.)."""

    def test_mapping_matches_retrieval_order(self):
        builder = CitationBuilder()
        chunk_a = _create_chunk(content="Content A", filename="a.pdf")
        chunk_b = _create_chunk(content="Content B", filename="b.pdf")
        chunk_c = _create_chunk(content="Content C", filename="c.pdf")

        citations = builder.build(
            retrieved_chunks=[chunk_a, chunk_b, chunk_c],
            cited_source_ids=["S2", "S3"],
            sufficient_context=True,
        )

        assert len(citations) == 2
        assert citations[0].source_id == "S2"
        assert citations[0].filename == "b.pdf"
        assert citations[1].source_id == "S3"
        assert citations[1].filename == "c.pdf"

    def test_mapping_from_dict(self):
        builder = CitationBuilder()
        chunk_x = _create_chunk(content="Content X", filename="x.md")
        source_dict = {"S1": chunk_x}

        citations = builder.build(
            retrieved_chunks=source_dict,
            cited_source_ids=["S1"],
            sufficient_context=True,
        )

        assert len(citations) == 1
        assert citations[0].filename == "x.md"


class TestCitationMetadataPreservation:
    """Test 4, 5, 6, 13, 14: Metadata preservation and handling of missing fields."""

    def test_metadata_preservation(self):
        builder = CitationBuilder()
        doc_id = uuid.uuid4()
        chunk_id = uuid.uuid4()
        chunk = _create_chunk(
            content="Full metadata chunk",
            filename="manual.pdf",
            page=12,
            section="Troubleshooting",
            chunk_index=3,
            similarity=0.91,
            doc_id=doc_id,
            chunk_id=chunk_id,
        )

        citations = builder.build([chunk], ["S1"])
        assert len(citations) == 1
        cit = citations[0]
        assert cit.document_id == doc_id
        assert cit.chunk_id == chunk_id
        assert cit.filename == "manual.pdf"
        assert cit.page == 12
        assert cit.section == "Troubleshooting"
        assert cit.chunk_index == 3
        assert cit.similarity == 0.91

    def test_missing_page_metadata_is_none(self):
        builder = CitationBuilder()
        chunk = _create_chunk(page=None)
        citations = builder.build([chunk], ["S1"])

        assert len(citations) == 1
        assert citations[0].page is None
        assert citations[0].page_number is None

    def test_missing_section_metadata_is_none(self):
        builder = CitationBuilder()
        chunk = _create_chunk(section=None)
        citations = builder.build([chunk], ["S1"])

        assert len(citations) == 1
        assert citations[0].section is None
        assert citations[0].section_title is None

    def test_no_model_generated_metadata_is_trusted(self):
        """Even if model claims a citation is from 'hacked.pdf' page 999, backend metadata wins."""
        builder = CitationBuilder()
        real_chunk = _create_chunk(filename="real_internal_doc.pdf", page=5, section="Real Section")

        citations = builder.build([real_chunk], ["S1"])
        assert len(citations) == 1
        assert citations[0].filename == "real_internal_doc.pdf"
        assert citations[0].page == 5
        assert citations[0].section == "Real Section"


class TestCitationValidationAndDeduplication:
    """Test 7, 8, 9, 10: Invalid IDs, mixed IDs, deduplication, and order preservation."""

    def test_invalid_source_id_discarded(self):
        builder = CitationBuilder()
        chunk = _create_chunk(filename="doc.pdf")

        # S99 does not exist in retrieval
        citations = builder.build([chunk], ["S99"])
        assert citations == []

    def test_mixed_valid_and_invalid_source_ids(self):
        builder = CitationBuilder()
        chunk1 = _create_chunk(filename="valid.pdf")

        # Model cited valid S1 and fabricated S42, S99
        citations = builder.build([chunk1], ["S1", "S42", "S99"])
        assert len(citations) == 1
        assert citations[0].source_id == "S1"
        assert citations[0].filename == "valid.pdf"

    def test_duplicate_source_ids_deduplicated_preserving_order(self):
        builder = CitationBuilder()
        chunk1 = _create_chunk(filename="first.pdf")
        chunk2 = _create_chunk(filename="second.pdf")
        chunk3 = _create_chunk(filename="third.pdf")

        # Gemini returns ["S1", "S1", "S3", "S1", "S2"]
        citations = builder.build([chunk1, chunk2, chunk3], ["S1", "S1", "S3", "S1", "S2"])
        assert len(citations) == 3
        assert [c.source_id for c in citations] == ["S1", "S3", "S2"]

    def test_citation_order_preservation(self):
        """Gemini chose [S3, S1]; order must be preserved, not alphabetically sorted."""
        builder = CitationBuilder()
        chunk1 = _create_chunk(filename="first.pdf")
        chunk2 = _create_chunk(filename="second.pdf")
        chunk3 = _create_chunk(filename="third.pdf")

        citations = builder.build([chunk1, chunk2, chunk3], ["S3", "S1"])
        assert len(citations) == 2
        assert citations[0].source_id == "S3"
        assert citations[0].filename == "third.pdf"
        assert citations[1].source_id == "S1"
        assert citations[1].filename == "first.pdf"


class TestCitationEdgeCases:
    """Test 11 & 12: Insufficient context and empty retrieval."""

    def test_insufficient_context_returns_empty_list(self):
        builder = CitationBuilder()
        chunk1 = _create_chunk(filename="doc.pdf")

        # Model hallucinates citation IDs despite sufficient_context=False
        citations = builder.build([chunk1], ["S1"], sufficient_context=False)
        assert citations == []

    def test_empty_retrieval_returns_empty_list(self):
        builder = CitationBuilder()
        citations = builder.build([], ["S1"], sufficient_context=True)
        assert citations == []

    def test_standalone_build_citations_function(self):
        chunk = _create_chunk(filename="standalone.pdf")
        citations = build_citations([chunk], ["S1"])
        assert len(citations) == 1
        assert citations[0].source_id == "S1"


class TestFullPipelineCitationIntegration:
    """Test 15: Full pipeline retrieval -> context -> prompt -> generation -> citations."""

    def test_pipeline_generates_citations(self):
        mock_embedder = MagicMock()
        mock_embedder.embed_query.return_value = [0.1] * 768

        chunk1 = _create_chunk(content="Auth info", filename="auth.pdf", page=4)
        chunk2 = _create_chunk(content="Rate limit info", filename="limits.docx", section="Limits")

        mock_retriever = MagicMock()
        mock_retriever.retrieve.return_value = [chunk1, chunk2]

        mock_gemini = MagicMock()
        mock_gemini.generate_grounded_answer.return_value = {
            "sufficient_context": True,
            "answer": "Authentication is Bearer [S1] and rate limits apply [S2].",
            "cited_source_ids": ["S1", "S2"],
        }

        pipeline = RagPipeline(
            embedder=mock_embedder,
            retriever=mock_retriever,
            gemini_service=mock_gemini,
        )

        mock_db = MagicMock()
        res = pipeline.run(mock_db, "How does auth and rate limiting work?", uuid.uuid4())

        assert res["sufficient_context"] is True
        assert res["answer_status"] == "answered"
        assert len(res["citations"]) == 2
        assert isinstance(res["citations"][0], Citation)
        assert res["citations"][0].source_id == "S1"
        assert res["citations"][0].filename == "auth.pdf"
        assert res["citations"][0].page == 4
        assert res["citations"][1].source_id == "S2"
        assert res["citations"][1].filename == "limits.docx"
        assert res["citations"][1].section == "Limits"

    def test_pipeline_empty_retrieval_no_citations(self):
        mock_embedder = MagicMock()
        mock_embedder.embed_query.return_value = [0.1] * 768

        mock_retriever = MagicMock()
        mock_retriever.retrieve.return_value = []

        mock_gemini = MagicMock()

        pipeline = RagPipeline(
            embedder=mock_embedder,
            retriever=mock_retriever,
            gemini_service=mock_gemini,
        )

        mock_db = MagicMock()
        res = pipeline.run(mock_db, "Unknown question?", uuid.uuid4())

        assert res["sufficient_context"] is False
        assert res["citations"] == []
        assert res["answer"] == STANDARD_INSUFFICIENT_MESSAGE
        mock_gemini.generate_grounded_answer.assert_not_called()
