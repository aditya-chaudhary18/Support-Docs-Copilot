"""
Unit tests for Gemini embedding and generation service.
All external Gemini API calls are mocked.
"""

from unittest.mock import MagicMock
from backend.app.services.gemini import GeminiService
from backend.app.rag.embedder import DocumentEmbedder


def test_embed_documents_batched():
    mock_client = MagicMock()
    mock_resp1 = MagicMock()
    # Mock return 2 vectors of dimension 768
    item1 = MagicMock(values=[0.1] * 768)
    item2 = MagicMock(values=[0.2] * 768)
    mock_resp1.embeddings = [item1, item2]

    mock_client.models.embed_content.return_value = mock_resp1

    service = GeminiService(client=mock_client)
    texts = ["chunk 1", "chunk 2"]
    vectors = service.embed_documents(texts)

    assert len(vectors) == 2
    assert len(vectors[0]) == 768
    assert len(vectors[1]) == 768
    mock_client.models.embed_content.assert_called_once()


def test_embed_query():
    mock_client = MagicMock()
    mock_resp = MagicMock()
    mock_resp.embeddings = [MagicMock(values=[0.3] * 768)]
    mock_client.models.embed_content.return_value = mock_resp

    embedder = DocumentEmbedder(gemini_service=GeminiService(client=mock_client))
    query_vec = embedder.embed_query("How to authenticate?")
    assert len(query_vec) == 768
    assert query_vec[0] == 0.3


def test_generate_grounded_answer_parsed():
    mock_client = MagicMock()
    mock_gen_resp = MagicMock()
    mock_gen_resp.text = '{"sufficient_context": true, "answer": "Use API key in header [S1]", "cited_source_ids": ["S1"]}'
    mock_client.models.generate_content.return_value = mock_gen_resp

    service = GeminiService(client=mock_client)
    result = service.generate_grounded_answer("System instruction", "Prompt")

    assert result["sufficient_context"] is True
    assert "header [S1]" in result["answer"]
    assert result["cited_source_ids"] == ["S1"]


def test_generate_answer_structured_schema():
    mock_client = MagicMock()
    mock_gen_resp = MagicMock()
    mock_gen_resp.text = '{"sufficient_context": true, "answer": "Grounded answer [S1]", "cited_source_ids": ["S1"]}'
    mock_client.models.generate_content.return_value = mock_gen_resp

    service = GeminiService(client=mock_client)
    obj = service.generate_answer("Prompt")
    assert obj.sufficient_context is True
    assert obj.answer == "Grounded answer [S1]"
    assert obj.cited_source_ids == ["S1"]


def test_embedding_dimension_mismatch_raises_app_exception():
    import pytest
    from backend.app.core.errors import AppException

    mock_client = MagicMock()
    mock_resp = MagicMock()
    # Return dimension 1536 instead of expected 768
    mock_resp.embeddings = [MagicMock(values=[0.1] * 1536)]
    mock_client.models.embed_content.return_value = mock_resp

    service = GeminiService(client=mock_client)
    with pytest.raises(AppException) as exc_info:
        service.embed_documents(["text"])
    assert exc_info.value.code == "EMBEDDING_DIMENSION_MISMATCH"
    assert exc_info.value.status_code == 500


def test_malformed_model_response_fallback():
    import pytest
    from backend.app.core.errors import AppException

    mock_client = MagicMock()
    mock_gen_resp = MagicMock()
    mock_gen_resp.text = "This is not valid JSON at all"
    mock_client.models.generate_content.return_value = mock_gen_resp

    service = GeminiService(client=mock_client)
    with pytest.raises(AppException) as exc_info:
        service.generate_grounded_answer("System instruction", "Prompt")
    assert exc_info.value.code == "MALFORMED_LLM_RESPONSE"
    assert exc_info.value.status_code == 502



def test_gemini_api_error_handling():
    import pytest
    from backend.app.core.errors import AppException

    mock_client = MagicMock()
    mock_client.models.embed_content.side_effect = RuntimeError("Fatal connection failure")

    service = GeminiService(client=mock_client)
    with pytest.raises(AppException) as exc_info:
        service.embed_query("Query")
    assert exc_info.value.code == "EMBEDDING_UNAVAILABLE"
    assert exc_info.value.status_code == 502

