# Data & Document Storage Directory

## Storage Architecture Rule

**User-uploaded documents must NOT be stored in this directory or anywhere on the local filesystem.**

Per the architecture defined in the Product Requirements Document (PRD):
- **Cloudflare R2** is the sole persistent object storage for user uploads (stored in a private bucket).
- **Neon PostgreSQL (with pgvector)** stores document metadata, text chunks, and embedding vectors.
- This directory exists only to hold optional, committed, non-sensitive sample files or fixtures for local testing, demonstration, or evaluation.
- Local uploads and temporary artifacts are ignored by `.gitignore` to prevent data leakage and accidental git commits.
