# RAG Evaluation Framework

This directory houses the evaluation harness, benchmark datasets, and experiment tracking logs for **Support Docs Copilot** as defined in Section 27 of the Product Requirements Document (PRD).

## Purpose

A lightweight, repeatable evaluation suite designed to run on-demand (conserving free-tier API quotas) to systematically calibrate:
- `SIMILARITY_THRESHOLD`
- `CHUNK_SIZE` and `CHUNK_OVERLAP`
- `TOP_K` retrieval parameters
- System prompts and hallucination resistance

## Target Metrics

| Metric | Definition | Measurement Method |
|---|---|---|
| **Retrieval Relevance (Hit Rate@K)** | Fraction of queries where at least one retrieved chunk matches the expected source. | Automated comparison against expected source metadata. |
| **MRR (Mean Reciprocal Rank)** | Position of the first relevant chunk in retrieved Top-K list. | Automated. |
| **Context Relevance** | Precision of retrieved context in addressing the query without extraneous noise. | Manual review or LLM-as-a-judge. |
| **Answer Groundedness** | Proportion of claims in the generated response supported by the cited context. | Manual review / Rubric-based verification. |
| **Citation Correctness** | Verification that cited source IDs map to retrieved chunks containing the claim. | Automated against stored metadata. |
| **Hallucination Rate** | Fraction of answers containing unsupported claims or answering unanswerable queries. | Automated refusal verification + manual claim spot-checks. |
| **Correct Refusal Rate** | Percentage of unanswerable questions correctly declined with the standard message. | Automated. |

## Dataset Schema

Evaluation datasets (`eval_set.json`) adhere to the following schema:

```json
[
  {
    "id": "eval-001",
    "question": "How do I configure API key authentication?",
    "expected_source": "api-guide.pdf",
    "expected_answer_or_context": "API keys must be passed in the X-API-Key header",
    "answerable": true
  },
  {
    "id": "eval-002",
    "question": "What is the CEO's favorite book?",
    "expected_source": null,
    "expected_answer_or_context": null,
    "answerable": false
  }
]
```

## Running Evaluations

Once the RAG pipeline is implemented, run the evaluation script:
```bash
python -m evaluation.evaluate --dataset evaluation/eval_set.json
```
Results will be recorded in `evaluation/RESULTS.md` with timestamps and hyperparameter configurations.
