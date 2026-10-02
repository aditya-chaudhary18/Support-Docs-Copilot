# Support Docs Copilot

> **AI-Powered Technical Support Documentation Assistant with Grounded Answers and Verifiable Citations.**

Support Docs Copilot is a full-stack, cloud-native **Retrieval-Augmented Generation (RAG)** application. It allows developers, support engineers, and users to upload technical documentation (PDF, DOCX, TXT, Markdown) and ask questions in natural language. Answers are strictly grounded in retrieved documentation and accompanied by traceable source citations (document name, page number, and section title).

---

## 🏛️ Architecture & Tech Stack

The architecture is deliberately designed for maximum simplicity, maintainability, and zero infrastructure cost on free-tier cloud platforms.

```
┌───────────────────────────┐
│ React + TypeScript + Vite │  (Frontend: Vercel / Cloudflare Pages)
└─────────────┬─────────────┘
              │ HTTPS (REST API)
┌─────────────▼─────────────┐
│      FastAPI Backend      │  (Container: Render / Koyeb / Fly.io)
└──────┬──────────────┬─────┘
       │              │
       │ TLS          │ HTTPS (S3 API)
┌──────▼──────┐ ┌─────▼───────────┐
│ Neon Postgre│ │  Cloudflare R2  │
│  (pgvector) │ │ (Private Bucket)│
└─────────────┘ └─────────────────┘
       ▲
       │ HTTPS
┌──────┴──────────────┐
│  Google Gemini API  │  (Embeddings & Grounded Generation)
└─────────────────────┘
```

| Layer | Technology | Purpose |
|---|---|---|
| **Frontend** | React 18, TypeScript, TailwindCSS, Vite | Single-page conversational UI, document management, citation inspection |
| **Backend** | Python 3.11+, FastAPI, Pydantic, SQLAlchemy 2 | REST API, ingestion pipeline, similarity search, prompt orchestration |
| **Database & Vectors** | Neon PostgreSQL + `pgvector` | Relational application data AND vector embeddings in a single database |
| **Document Storage** | Cloudflare R2 (S3-compatible) | Secure, private cloud object store for original uploaded document bytes |
| **AI & Embeddings** | Google Gemini API | Text chunk embeddings (`text-embedding-004`) and grounded generation (`gemini-2.5-flash`) |

### Core Architectural Rules
1. **Unified Storage**: Neon PostgreSQL with `pgvector` handles both relational state and vector similarity search. **No Qdrant, Pinecone, or Chroma**.
2. **No Redis or Message Queues**: Background ingestion tasks run in-process via FastAPI background tasks. **No Celery, Redis, or Kafka**.
3. **No Local File Storage**: User-uploaded files are never stored on local disks; Cloudflare R2 is the sole source of truth for original files.
4. **Strict Grounding & Hallucination Resistance**: If retrieved context is below the similarity threshold or does not contain the answer, the model explicitly declines with a standard refusal rather than guessing.
5. **No Leaked Secrets**: All secrets reside strictly in the backend environment. Frontend receives only public configuration (`VITE_API_BASE_URL`).

---

## 📂 Project Structure

```
support-docs-copilot/
├── frontend/                   # React + TypeScript + TailwindCSS (Vite)
│   ├── src/
│   │   ├── api/                # Typed API client
│   │   ├── components/         # Reusable UI components
│   │   ├── pages/              # Dashboard, Documents, Chat
│   │   ├── hooks/              # Custom React hooks
│   │   ├── types/              # Domain models & TypeScript interfaces
│   │   ├── App.tsx             # Main application layout
│   │   ├── main.tsx            # Vite entry point
│   │   └── index.css           # Tailwind CSS directives
│   ├── public/                 # Static assets
│   ├── package.json
│   ├── tsconfig.json
│   ├── vite.config.ts
│   ├── tailwind.config.js
│   ├── postcss.config.js
│   ├── .env.example            # Public frontend environment template
│   └── Dockerfile              # Multi-stage production build (Node + Nginx)
│
├── backend/                    # Python + FastAPI + Pydantic + SQLAlchemy
│   ├── app/
│   │   ├── api/                # FastAPI routers (documents, chat, conversations, health)
│   │   ├── core/               # Settings (Pydantic BaseSettings), logging, errors, middleware
│   │   ├── db/                 # Neon session, SQLAlchemy base, migrations
│   │   ├── models/             # SQLAlchemy ORM models (User, Document, DocumentChunk, etc.)
│   │   ├── schemas/            # Pydantic request/response schemas
│   │   ├── services/           # Storage (R2), Gemini, Document & Chat services
│   │   ├── rag/                # Document extractors, text cleaner, chunker, retriever
│   │   └── main.py             # FastAPI app factory, CORS, exception handlers
│   ├── alembic/                # Database migrations for Neon + pgvector
│   ├── tests/                  # Unit, API, and RAG pipeline tests
│   │   ├── unit/
│   │   ├── api/
│   │   ├── rag/
│   │   └── fixtures/
│   ├── requirements.txt
│   ├── .env.example            # Backend environment template
│   └── Dockerfile
│
├── data/
│   └── documents/              # Sample fixtures/evaluation files only (NO user uploads)
│       └── README.md
│
├── evaluation/                 # RAG evaluation harness & benchmarks (Hit Rate@K, MRR, Groundedness)
│   └── README.md
│
├── docker-compose.yml          # Container configuration (frontend + backend ONLY)
├── .env.example                # Central environment variables template
├── .gitignore                  # Git ignore rules for Python, Node, env, IDE, temp data
├── README.md                   # Project documentation
└── PRD.md                      # Product Requirements Document (Source of Truth)
```

---

## ⚙️ Prerequisites

Before running the application locally, ensure you have:

- **Python 3.11+** installed
- **Node.js 20+** and **npm** installed
- A **Neon PostgreSQL** database account (free tier) with `pgvector` enabled
- A **Cloudflare R2** account (free allowance) with a private bucket created
- A **Google Gemini API Key** (free tier supported)
- *(Optional)* **Docker & Docker Compose** for containerized execution

---

## 🚀 Getting Started (Local Development)

### 1. Configure Environment Variables

Copy `.env.example` to `.env` in the root (or configure `backend/.env` and `frontend/.env`):

```bash
cp .env.example .env
```

Fill in your provider credentials:
- `DATABASE_URL`: Your Neon PostgreSQL connection string (including `?sslmode=require`).
- `GEMINI_API_KEY`: Your Google Gemini API key.
- `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`: Your Cloudflare R2 bucket details.

---

### 2. Backend Setup

```bash
# Navigate to backend directory
cd backend

# Create and activate virtual environment
python -m venv .venv

# Windows (PowerShell):
.venv\Scripts\Activate.ps1
# macOS / Linux:
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Run migrations (once DB models are active)
# alembic upgrade head

# Start development server
uvicorn backend.app.main:app --reload --host 0.0.0.0 --port 8000
```

The backend API will be available at `http://localhost:8000`.
- Health Check: `http://localhost:8000/api/health`
- Interactive API Docs: `http://localhost:8000/docs`

---

### 3. Frontend Setup

In a separate terminal:

```bash
# Navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Start Vite development server
npm run dev
```

The frontend will be running at `http://localhost:5173`.

---

### 4. Running with Docker Compose

To run both services in reproducible Docker containers:

```bash
docker compose up --build
```

- Frontend: `http://localhost:5173`
- Backend: `http://localhost:8000`

---

## 🧪 Testing

Run backend tests:
```bash
pytest backend/tests/ -v
```

Run frontend type check & lint:
```bash
cd frontend
npm run build
```

---

## 📋 Free-Tier Deployment Notes & Caveats

- **Cold Starts**: On free container hosts (such as Render or Koyeb), instances may sleep after inactivity. The first request after sleep may take 15–30 seconds.
- **Neon Auto-Suspend**: Neon compute instances auto-suspend when idle. The database connection pool is configured with `pool_pre_ping=True` and automatic reconnection to handle this transparently.
- **Background Ingestion**: Ingestion tasks run within the FastAPI process. Large document uploads are capped at 10 MB / 100 pages to prevent memory exhaustion on 512 MB free containers.
- **Private Buckets**: Cloudflare R2 buckets should remain private. Original files are accessed solely through backend S3-compatible APIs.

---

## 📜 Source of Truth

For complete requirements, functional specifications, and data schemas, refer to [`PRD.md`](./PRD.md).
