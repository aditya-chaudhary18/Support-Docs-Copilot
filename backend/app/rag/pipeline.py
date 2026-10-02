"""
End-to-End RAG Pipeline Orchestrator adhering to PRD Section 7.2.
Coordinates question cleaning, vector search, pre-generation retrieval gating,
context construction, and prompt assembly.

Exposes a clean `prepare()` method that stops before Gemini answer generation,
adhering to Step 7 requirements.
"""

import uuid
from dataclasses import dataclass, field
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session

from backend.app.rag.cleaner import clean_text
from backend.app.rag.embedder import DocumentEmbedder
from backend.app.rag.retriever import VectorRetriever, RetrievedChunk
from backend.app.rag.context_builder import ContextBuilder, ContextBundle, Context
from backend.app.rag.prompt import SYSTEM_INSTRUCTIONS, build_rag_prompt, PromptBuilder
from backend.app.rag.citation_builder import CitationBuilder, STANDARD_INSUFFICIENT_MESSAGE
from backend.app.services.gemini import get_gemini_service


@dataclass
class RAGPreparationResult:
    """
    Output of the retrieval + context + prompt preparation stages.
    Contains all data needed for the downstream generation step.
    """
    query: str
    retrieved_chunks: List[RetrievedChunk]
    context: Context
    prompt: str
    system_instruction: str
    has_context: bool
    available_source_ids: List[str] = field(default_factory=list)


class RagPipeline:
    """Coordinates retrieval, gating, generation, and citation grounding."""

    def __init__(
        self,
        embedder: Optional[DocumentEmbedder] = None,
        retriever: Optional[VectorRetriever] = None,
        context_builder: Optional[ContextBuilder] = None,
        prompt_builder: Optional[PromptBuilder] = None,
        citation_builder: Optional[CitationBuilder] = None,
        gemini_service=None,
    ):
        self.embedder = embedder or DocumentEmbedder()
        self.retriever = retriever or VectorRetriever()
        self.context_builder = context_builder or ContextBuilder()
        self.prompt_builder = prompt_builder or PromptBuilder()
        self.citation_builder = citation_builder or CitationBuilder()
        self.gemini_service = gemini_service or get_gemini_service()

    def prepare(
        self,
        db: Session,
        question: str,
        owner_id: uuid.UUID,
        conversation_history: Optional[List[Dict[str, str]]] = None,
        document_ids: Optional[List[uuid.UUID]] = None,
    ) -> RAGPreparationResult:
        """
        Executes the retrieval → context construction → prompt construction pipeline.
        Stops before Gemini generation.

        Steps:
        1. Clean query
        2. Embed query via Gemini
        3. Retrieve Top-K chunks via pgvector cosine distance (scoped to document_ids if provided)
        4. Build structured context with deterministic S1, S2, S3... source IDs
        5. Build RAG prompt with system instructions and injection resistance

        Returns a RAGPreparationResult containing everything needed for the
        generation stage.
        """
        # 1. Clean query
        cleaned_question = clean_text(question.strip())
        if not cleaned_question:
            empty_context = Context(
                items=[],
                formatted_text="",
                formatted_context="",
                has_context=False,
                sources_by_id={},
                total_chars=0,
            )
            return RAGPreparationResult(
                query=question.strip(),
                retrieved_chunks=[],
                context=empty_context,
                prompt="",
                system_instruction=self.prompt_builder.system_instruction,
                has_context=False,
                available_source_ids=[],
            )

        # 2. Embed query
        query_vector = self.embedder.embed_query(cleaned_question)

        # 3. Vector similarity search (filtered by document_ids scope if present)
        retrieved_chunks = self.retriever.retrieve(
            db=db,
            query_vector=query_vector,
            owner_id=owner_id,
            document_ids=document_ids,
        )

        # 4. Build structured context
        context_bundle = self.context_builder.build_context(retrieved_chunks)

        # 5. Build prompt
        available_source_ids = list(context_bundle.sources_by_id.keys())

        prompt = self.prompt_builder.build_prompt(
            question=cleaned_question,
            formatted_context=context_bundle.formatted_context,
            conversation_history=conversation_history,
            available_source_ids=available_source_ids if available_source_ids else None,
        )

        return RAGPreparationResult(
            query=cleaned_question,
            retrieved_chunks=retrieved_chunks,
            context=context_bundle,
            prompt=prompt,
            system_instruction=self.prompt_builder.system_instruction,
            has_context=context_bundle.has_context,
            available_source_ids=available_source_ids,
        )

    def run(
        self,
        db: Session,
        question: str,
        owner_id: uuid.UUID,
        conversation_history: Optional[List[Dict[str, str]]] = None,
        document_ids: Optional[List[uuid.UUID]] = None,
    ) -> Dict[str, Any]:
        """
        Executes the full query pipeline:
        1. Clean query
        2. Embed query
        3. Retrieve Top-K chunks via pgvector scoped to document_ids
        4. Apply retrieval gate: if no chunks above threshold, short-circuit
        5. Build context & prompt
        6. Call Gemini
        7. Validate citations & return
        """
        # Use prepare() for steps 1-5
        prep = self.prepare(
            db=db,
            question=question,
            owner_id=owner_id,
            conversation_history=conversation_history,
            document_ids=document_ids,
        )

        # Retrieval Gate: short-circuit if evidence is below similarity threshold
        if not prep.has_context:
            return {
                "query": prep.query,
                "answer": STANDARD_INSUFFICIENT_MESSAGE,
                "sufficient_context": False,
                "citations": [],
                "sources": [],
                "answer_status": "insufficient_context",
            }

        # 6. Gemini generation
        generation_result = self.gemini_service.generate_grounded_answer(
            system_instruction=prep.system_instruction,
            prompt=prep.prompt,
        )

        # 7. Validate citations against retrieved set using CitationBuilder
        answer, sources, status = self.citation_builder.build_citations(
            raw_answer=generation_result.get("answer", ""),
            sufficient_context=generation_result.get("sufficient_context", False),
            raw_cited_ids=generation_result.get("cited_source_ids", []),
            sources_by_id=prep.context.sources_by_id,
        )

        citations = self.citation_builder.build(
            retrieved_chunks=prep.retrieved_chunks,
            cited_source_ids=generation_result.get("cited_source_ids", []),
            sufficient_context=(status == "answered"),
        )

        return {
            "query": prep.query,
            "answer": answer,
            "sufficient_context": (status == "answered"),
            "citations": citations,
            "sources": sources,
            "answer_status": status,
        }
