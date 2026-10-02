"""
Dedicated Google Gemini API Service adhering to PRD Sections 9, 13, and 35.
Handles text embeddings (documents and queries) and structured grounded generation.
All API interactions are rate-limit resilient with exponential backoff and jitter.
"""

import time
import json
import random
import logging
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field

from google import genai
from google.genai import types
from google.genai.errors import APIError

from backend.app.core.config import get_settings
from backend.app.core.errors import AppException

logger = logging.getLogger(__name__)


class GroundedAnswerPayload(BaseModel):
    """Structured response schema enforced directly on Gemini generation."""
    sufficient_context: bool = Field(
        ...,
        description="Whether the provided document excerpts contained sufficient evidence to answer the question",
    )
    answer: str = Field(
        ...,
        description="The concise, grounded answer with inline [S#] citations, or an explicit statement of insufficient info",
    )
    cited_source_ids: List[str] = Field(
        default_factory=list,
        description="List of exact source IDs (e.g. S1, S2) used in formulating the answer",
    )


class GeminiService:
    """Encapsulates all outbound calls to the Google Gemini API."""

    def __init__(self, client: Optional[genai.Client] = None):
        self.settings = get_settings()
        self._client = client

    @property
    def client(self) -> genai.Client:
        if self._client is None:
            api_key = self.settings.GEMINI_API_KEY.get_secret_value()
            self._client = genai.Client(api_key=api_key)
        return self._client

    def embed_documents(self, texts: List[str]) -> List[List[float]]:
        """
        Embed a list of document chunks using RETRIEVAL_DOCUMENT task type.
        Batches requests according to EMBEDDING_BATCH_SIZE.
        """
        if not texts:
            return []

        all_embeddings: List[List[float]] = []
        batch_size = self.settings.EMBEDDING_BATCH_SIZE

        for i in range(0, len(texts), batch_size):
            batch = texts[i : i + batch_size]
            embeddings = self._embed_batch_with_retry(
                batch,
                task_type="RETRIEVAL_DOCUMENT",
            )
            all_embeddings.extend(embeddings)

        return all_embeddings

    def embed_texts(self, texts: List[str]) -> List[List[float]]:
        """Alias for embed_documents."""
        return self.embed_documents(texts)

    def embed_text(self, text: str) -> List[float]:
        """Embed a single text string."""
        return self.embed_query(text)

    def embed_query(self, query: str) -> List[float]:
        """
        Embed a single search question using RETRIEVAL_QUERY task type.
        Uses identical model and output dimension as document chunks.
        """
        results = self._embed_batch_with_retry(
            [query],
            task_type="RETRIEVAL_QUERY",
        )
        if not results:
            raise AppException(
                status_code=502,
                code="EMBEDDING_UNAVAILABLE",
                message="Failed to generate embedding for the search query.",
            )
        return results[0]

    def _embed_batch_with_retry(
        self,
        texts: List[str],
        task_type: str = "RETRIEVAL_DOCUMENT",
    ) -> List[List[float]]:
        """Executes embed_content with exponential backoff on rate limits, dimension validation, and model fallback."""
        max_retries = self.settings.EMBEDDING_MAX_RETRIES
        expected_dim = self.settings.EMBEDDING_DIMENSION

        candidate_models = [
            self.settings.GEMINI_EMBEDDING_MODEL,
            "gemini-embedding-001",
            "text-embedding-004",
        ]
        seen = set()
        models_to_try = [m for m in candidate_models if m and not (m in seen or seen.add(m))]

        last_exc = None
        for model_name in models_to_try:
            delay = 1.0
            for attempt in range(1, max_retries + 1):
                try:
                    config = types.EmbedContentConfig(
                        task_type=task_type,
                        output_dimensionality=expected_dim,
                    )
                    response = self.client.models.embed_content(
                        model=model_name,
                        contents=texts,
                        config=config,
                    )
                    vectors = []
                    for item in response.embeddings:
                        vec = list(item.values)
                        # Validate vector dimension strictly
                        if len(vec) != expected_dim:
                            err_msg = (
                                f"Embedding dimension mismatch: expected {expected_dim}, "
                                f"but model '{model_name}' returned {len(vec)}."
                            )
                            logger.error(err_msg)
                            raise AppException(
                                status_code=500,
                                code="EMBEDDING_DIMENSION_MISMATCH",
                                message=err_msg,
                            )
                        vectors.append(vec)
                    return vectors

                except AppException:
                    raise
                except Exception as exc:
                    last_exc = exc
                    is_rate_limit = "429" in str(exc) or "quota" in str(exc).lower() or isinstance(exc, APIError)
                    is_not_found = "404" in str(exc) or "not found" in str(exc).lower()
                    if is_not_found:
                        logger.warning("Embedding model '%s' not found or deprecated, trying fallback...", model_name)
                        break

                    if attempt == max_retries or not is_rate_limit:
                        logger.error("Gemini embedding failure for model '%s' (attempt %d/%d): %s", model_name, attempt, max_retries, exc)
                        break

                    sleep_time = delay + random.uniform(0.1, 0.5)
                    logger.warning(
                        "Gemini rate limit encountered (attempt %d/%d). Retrying in %.2fs...",
                        attempt,
                        max_retries,
                        sleep_time,
                    )
                    time.sleep(sleep_time)
                    delay *= 2.0

        raise AppException(
            status_code=502,
            code="EMBEDDING_UNAVAILABLE",
            message="Gemini embedding service is currently unavailable. Please try again shortly.",
        ) from last_exc

    def generate_grounded_answer(
        self,
        system_instruction: str,
        prompt: str,
    ) -> Dict[str, Any]:
        """
        Calls Gemini to generate a grounded response strictly conforming to GroundedAnswerPayload.
        Enforces low temperature and structured JSON output.
        Automatically falls back across active supported Gemini models on transient rate-limits or deprecations.
        """
        config = types.GenerateContentConfig(
            system_instruction=system_instruction,
            temperature=self.settings.GEMINI_TEMPERATURE,
            max_output_tokens=self.settings.GEMINI_MAX_OUTPUT_TOKENS,
            response_mime_type="application/json",
            response_schema=GroundedAnswerPayload,
        )

        candidate_models = [
            self.settings.GEMINI_GENERATION_MODEL,
            "gemini-flash-lite-latest",
            "gemini-3.1-flash-lite",
            "gemini-3.5-flash-lite",
            "gemini-3-flash-preview",
            "gemini-flash-latest",
        ]
        seen_models = set()
        models_to_try = []
        for m in candidate_models:
            if m and m not in seen_models:
                seen_models.add(m)
                models_to_try.append(m)

        last_error = None
        for model_name in models_to_try:
            max_retries = 2
            delay = 1.0
            for attempt in range(1, max_retries + 1):
                try:
                    response = self.client.models.generate_content(
                        model=model_name,
                        contents=prompt,
                        config=config,
                    )

                    response_text = response.text or "{}"
                    try:
                        data = json.loads(response_text)
                    except (json.JSONDecodeError, ValueError) as json_exc:
                        logger.error("Malformed JSON received from Gemini: %s", response_text)
                        raise AppException(
                            status_code=502,
                            code="MALFORMED_LLM_RESPONSE",
                            message="AI model returned an unparseable response.",
                        ) from json_exc

                    raw_cited = data.get("cited_source_ids", [])
                    return {
                        "sufficient_context": bool(data.get("sufficient_context", False)),
                        "answer": str(data.get("answer", "")).strip(),
                        "cited_source_ids": [str(sid).strip() for sid in raw_cited if str(sid).strip()],
                    }

                except AppException:
                    raise
                except Exception as exc:
                    last_error = exc
                    err_msg = str(exc)
                    # If model is deprecated (404) or quota exhausted (429), break immediately to try next model in candidate list
                    if (
                        "404" in err_msg
                        or "not found" in err_msg.lower()
                        or "no longer available" in err_msg.lower()
                        or "429" in err_msg
                        or "resource_exhausted" in err_msg.lower()
                        or "quota" in err_msg.lower()
                    ):
                        logger.warning(
                            "Model %s unavailable or quota exhausted: %s. Trying fallback model...",
                            model_name,
                            exc,
                        )
                        break

                    sleep_time = delay + random.uniform(0.1, 0.4)
                    logger.warning(
                        "Gemini generation error on %s (attempt %d/%d). Retrying in %.2fs: %s",
                        model_name,
                        attempt,
                        max_retries,
                        sleep_time,
                        exc,
                    )
                    time.sleep(sleep_time)
                    delay *= 2.0

        logger.error("Gemini generation failure across all candidate models: %s", last_error)
        raise AppException(
            status_code=502,
            code="LLM_UNAVAILABLE",
            message="Gemini generation service is temporarily unavailable. Please try again shortly.",
        ) from last_error

    def generate_answer(
        self,
        prompt: str,
        system_instruction: Optional[str] = None,
    ) -> GroundedAnswerPayload:
        """Typed generation method returning a validated GroundedAnswerPayload Pydantic object."""
        sys_inst = system_instruction or "Answer the question strictly from the supplied context."
        result = self.generate_grounded_answer(system_instruction=sys_inst, prompt=prompt)
        return GroundedAnswerPayload(
            sufficient_context=result["sufficient_context"],
            answer=result["answer"],
            cited_source_ids=result["cited_source_ids"],
        )


    def validate_embedding_dimension(self) -> bool:
        """
        Validates that the active model returns vectors matching EMBEDDING_DIMENSION.
        Fails fast at startup or setup if there is a mismatch.
        """
        try:
            probe_vector = self.embed_query("probe")
            actual_dim = len(probe_vector)
            expected_dim = self.settings.EMBEDDING_DIMENSION
            if actual_dim != expected_dim:
                msg = f"EMBEDDING_DIMENSION mismatch! Expected {expected_dim}, but model '{self.settings.GEMINI_EMBEDDING_MODEL}' returned {actual_dim}."
                logger.critical(msg)
                raise ValueError(msg)
            return True
        except Exception as exc:
            logger.error("Startup embedding dimension validation failed: %s", exc)
            raise


_gemini_service: Optional[GeminiService] = None


def get_gemini_service() -> GeminiService:
    """Dependency provider for GeminiService."""
    global _gemini_service
    if _gemini_service is None:
        _gemini_service = GeminiService()
    return _gemini_service
