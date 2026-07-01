# AskDocs — Enterprise RAG Knowledge Base

## Design Specification

**Date:** 2026-06-30
**Purpose:** Showcase portfolio project for Upwork — demonstrates advanced RAG capabilities to win AI/ML engineering contracts.
**Build time target:** 1-2 days
**Demo domain:** Business compliance (LLC, EIN, registered agents) — but fully domain-agnostic

---

## 1. System Overview

AskDocs is a self-contained, domain-agnostic RAG knowledge base that lets users upload documents, ask natural language questions, and receive cited answers with confidence scores. It uses advanced retrieval (hybrid search + cross-encoder re-ranking) to differentiate from basic RAG demos.

### What Makes This a Job-Winning Demo

| Feature | Why it wins contracts |
|---------|----------------------|
| Hybrid search (BM25 + vector) | 80% of RAG job posts specifically ask for this |
| Cross-encoder re-ranking | Shows understanding of retrieval quality beyond naive cosine similarity |
| Citation with source + page | Every enterprise client needs auditability |
| Confidence scores | Shows the system knows when it doesn't know |
| Hallucination guardrail | The #1 concern in every RAG job description |
| Admin dashboard with metrics | Proves production-readiness, not just a chatbot |
| Docker Compose one-command deploy | Client can clone and run in 60 seconds |
| Pre-loaded compliance demo data | Works immediately in a Loom video — no setup needed |

### Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14 (App Router), React 18, Tailwind CSS, shadcn/ui |
| Backend | FastAPI, Python 3.11+, LangChain |
| Vector Store | ChromaDB (Docker container) |
| Embeddings | `all-MiniLM-L6-v2` (sentence-transformers, local, free) |
| Re-ranker | `cross-encoder/ms-marco-MiniLM-L-6-v2` (local, free) |
| Keyword Search | `rank-bm25` (in-memory, rebuilt on startup from ChromaDB metadata) |
| LLM | OpenAI GPT-4o-mini (default) or Claude 3.5 Sonnet (configurable via env var) |
| Infra | Docker Compose (3 services: frontend, backend, chromadb) |

---

## 2. Architecture Diagram

```
┌─────────────────────────────────────────────────────┐
│                    FRONTEND (Next.js 14)             │
│                                                      │
│  ┌──────────┐  ┌──────────┐  ┌───────────────────┐  │
│  │Dashboard │  │Documents │  │    Chat + Sources  │  │
│  │  Page    │  │  Page    │  │      Page          │  │
│  └────┬─────┘  └────┬─────┘  └────────┬──────────┘  │
│       │              │                  │             │
│       └──────────────┴──────────────────┘             │
│                      │                                │
│              API calls (fetch)                        │
└──────────────────────┬────────────────────────────────┘
                       │ HTTP :3000 → :8000
┌──────────────────────┴────────────────────────────────┐
│                   BACKEND (FastAPI)                     │
│                                                        │
│  ┌─────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │  API Router  │  │  Ingestion   │  │  Retrieval   │  │
│  │  Layer       │  │  Pipeline    │  │  Pipeline    │  │
│  └──────┬──────┘  └──────┬───────┘  └──────┬───────┘  │
│         │                │                  │          │
│  ┌──────┴──────┐  ┌──────┴───────┐  ┌──────┴───────┐  │
│  │  Models /   │  │  Chunker     │  │  Hybrid      │  │
│  │  Schemas    │  │  Service     │  │  Searcher    │  │
│  └─────────────┘  └──────┬───────┘  └──────┬───────┘  │
│                          │                  │          │
│                   ┌──────┴───────┐  ┌──────┴───────┐  │
│                   │  Embedder    │  │  Re-ranker   │  │
│                   │  Service     │  │  Service     │  │
│                   └──────┬───────┘  └──────┬───────┘  │
│                          │                  │          │
│                   ┌──────┴──────────────────┴───────┐  │
│                   │        ChromaDB Client          │  │
│                   └──────────────┬──────────────────┘  │
│                                 │                      │
│                   ┌─────────────┴────────────────────┐ │
│                   │        LLM Client                │ │
│                   │  (OpenAI / Claude, configurable) │ │
│                   └──────────────────────────────────┘ │
└────────────────────────────────────────────────────────┘
                       │
              Docker network :8000
┌──────────────────────┴────────────────────────────────┐
│                  CHROMADB (Container)                   │
│                  Port: 8100                             │
│                  Persistent volume: ./chroma_data       │
└────────────────────────────────────────────────────────┘
```

---

## 3. Backend — Detailed Design

### 3.1 Directory Structure

```
backend/
├── app/
│   ├── main.py                  # FastAPI app, CORS, lifespan
│   ├── config.py                # Settings from env vars (pydantic-settings)
│   ├── routers/
│   │   ├── documents.py         # Upload, list, delete, view chunks
│   │   ├── chat.py              # Query endpoint (streaming)
│   │   └── stats.py             # Dashboard statistics
│   ├── services/
│   │   ├── ingestion.py         # Orchestrates: extract → chunk → embed → store
│   │   ├── text_extractor.py    # PDF, DOCX, TXT extraction
│   │   ├── chunker.py           # Semantic + recursive chunking
│   │   ├── embedder.py          # sentence-transformers wrapper
│   │   ├── reranker.py          # cross-encoder wrapper
│   │   ├── hybrid_search.py     # BM25 + vector + RRF fusion
│   │   ├── retrieval.py         # Orchestrates: search → rerank → format
│   │   └── llm_client.py        # OpenAI / Claude abstraction
│   ├── models/
│   │   └── schemas.py           # Pydantic models for all requests/responses
│   └── data/
│       └── demo_docs/           # Pre-loaded compliance PDFs/TXTs
├── requirements.txt
├── Dockerfile
└── .env.example
```

### 3.2 API Endpoints — Full Specification

#### Documents Router (`/api/documents`)

**POST `/api/documents/upload`**
- Input: `multipart/form-data` — one or more files (PDF, DOCX, TXT)
- Max file size: 20MB per file
- Processing: synchronous (files are small for demo; production would use background tasks)
- Response:
```json
{
  "documents": [
    {
      "id": "uuid",
      "filename": "llc-formation-guide.pdf",
      "file_type": "pdf",
      "file_size_bytes": 245000,
      "num_pages": 12,
      "num_chunks": 47,
      "uploaded_at": "2026-06-30T10:00:00Z"
    }
  ]
}
```

**GET `/api/documents`**
- Response: List of all documents with metadata
```json
{
  "documents": [...],
  "total": 15
}
```

**GET `/api/documents/{doc_id}`**
- Response: Single document detail with chunk preview
```json
{
  "id": "uuid",
  "filename": "llc-formation-guide.pdf",
  "file_type": "pdf",
  "num_chunks": 47,
  "chunks_preview": [
    {
      "chunk_id": "uuid",
      "chunk_index": 0,
      "text_preview": "First 200 chars...",
      "page_number": 1,
      "token_count": 487
    }
  ]
}
```

**DELETE `/api/documents/{doc_id}`**
- Deletes document metadata + all chunks from ChromaDB + removes from BM25 index
- Response: `{ "deleted": true }`

**GET `/api/documents/{doc_id}/chunks`**
- Query params: `?page=1&per_page=20`
- Response: Paginated list of all chunks with full text
```json
{
  "chunks": [
    {
      "chunk_id": "uuid",
      "chunk_index": 0,
      "text": "Full chunk text...",
      "page_number": 1,
      "token_count": 487,
      "metadata": {}
    }
  ],
  "total": 47,
  "page": 1,
  "per_page": 20
}
```

#### Chat Router (`/api/chat`)

**POST `/api/chat`**
- Input:
```json
{
  "question": "What documents are needed to form an LLC in Texas?",
  "top_k": 5,
  "use_reranking": true
}
```
- Response (streamed via SSE):
```json
{
  "answer": "To form an LLC in Texas, you need to file a Certificate of Formation with the Secretary of State [Source: llc-formation-guide.pdf, p.3]. You will also need an EIN from the IRS [Source: ein-filing-guide.pdf, p.1]...",
  "sources": [
    {
      "chunk_id": "uuid",
      "document_name": "llc-formation-guide.pdf",
      "page_number": 3,
      "text": "The full chunk text that was used...",
      "relevance_score": 0.94,
      "rerank_score": 0.87
    }
  ],
  "confidence": 0.91,
  "retrieval_metadata": {
    "total_chunks_searched": 350,
    "vector_candidates": 20,
    "bm25_candidates": 20,
    "after_fusion": 20,
    "after_reranking": 5,
    "retrieval_time_ms": 145,
    "generation_time_ms": 1200
  }
}
```

#### Stats Router (`/api/stats`)

**GET `/api/stats`**
- Response:
```json
{
  "total_documents": 15,
  "total_chunks": 523,
  "avg_chunk_tokens": 412,
  "total_queries": 87,
  "avg_confidence": 0.84,
  "avg_retrieval_time_ms": 132,
  "recent_queries": [
    {
      "question": "What is a registered agent?",
      "confidence": 0.92,
      "timestamp": "2026-06-30T10:05:00Z"
    }
  ],
  "documents_by_type": {
    "pdf": 10,
    "docx": 3,
    "txt": 2
  }
}
```

### 3.3 Ingestion Pipeline — Detailed Flow

```
File Upload
    │
    ▼
┌─────────────────┐
│ Text Extractor   │
│                  │
│ PDF → PyPDF2     │
│ DOCX → python-docx│
│ TXT → raw read   │
│                  │
│ Output: raw text │
│ + page numbers   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Chunker          │
│                  │
│ Step 1: Split by │
│ headings/sections│
│ (regex: ## / \n\n)│
│                  │
│ Step 2: If chunk │
│ > 500 tokens,    │
│ recursive split  │
│ at sentence      │
│ boundaries       │
│                  │
│ Overlap: 50 tokens│
│                  │
│ Output: chunks[] │
│ with page_number │
│ + chunk_index    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Embedder         │
│                  │
│ Model:           │
│ all-MiniLM-L6-v2 │
│ (384 dimensions) │
│                  │
│ Batch embed all  │
│ chunks           │
│                  │
│ Output:          │
│ embeddings[]     │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ ChromaDB Store   │
│                  │
│ Collection:      │
│ "askdocs_chunks" │
│                  │
│ Store: embedding │
│ + text + metadata│
│ (doc_id, doc_name│
│  page_num, index)│
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ BM25 Index       │
│                  │
│ Add chunks to    │
│ in-memory BM25   │
│ index            │
│                  │
│ Rebuilt on app   │
│ startup from     │
│ ChromaDB data    │
└─────────────────┘
```

### 3.4 Retrieval Pipeline — Detailed Flow

```
User Question
    │
    ▼
┌──────────────────┐
│ Embed Question    │
│ (same model:     │
│ all-MiniLM-L6-v2)│
└────────┬─────────┘
         │
    ┌────┴────┐
    │         │
    ▼         ▼
┌────────┐ ┌────────┐
│Vector  │ │ BM25   │
│Search  │ │Search  │
│        │ │        │
│Top 20  │ │Top 20  │
│by cosine│ │by TF-IDF│
└───┬────┘ └───┬────┘
    │          │
    └────┬─────┘
         │
         ▼
┌──────────────────┐
│ Reciprocal Rank  │
│ Fusion (RRF)     │
│                  │
│ Score = Σ 1/(k+r)│
│ k=60 (constant)  │
│ r=rank in list   │
│                  │
│ Merge & dedupe   │
│ Output: Top 20   │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ Cross-Encoder    │
│ Re-rank          │
│                  │
│ Model:           │
│ ms-marco-MiniLM  │
│ -L-6-v2          │
│                  │
│ Score each       │
│ (query, chunk)   │
│ pair             │
│                  │
│ Output: Top 5    │
│ with scores      │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ LLM Generation   │
│                  │
│ System prompt:   │
│ "Answer using    │
│ ONLY the provided│
│ sources. Cite    │
│ each claim as    │
│ [Source: name,   │
│ p.X]. If info    │
│ not in sources,  │
│ say so."         │
│                  │
│ User: question   │
│ Context: top 5   │
│ chunks           │
│                  │
│ Stream via SSE   │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ Response Builder │
│                  │
│ Parse citations  │
│ from LLM output  │
│ Match to source  │
│ chunks           │
│ Calculate avg    │
│ confidence from  │
│ rerank scores    │
│ Attach retrieval │
│ metadata         │
└──────────────────┘
```

### 3.5 Configuration (env vars)

```env
# LLM
LLM_PROVIDER=openai          # openai | anthropic
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
LLM_MODEL=gpt-4o-mini        # or claude-3-5-sonnet-20241022

# ChromaDB
CHROMA_HOST=chromadb
CHROMA_PORT=8100

# Retrieval
CHUNK_SIZE=500                # tokens
CHUNK_OVERLAP=50              # tokens
RETRIEVAL_TOP_K=5             # final chunks sent to LLM
VECTOR_SEARCH_K=20            # initial vector candidates
BM25_SEARCH_K=20              # initial keyword candidates

# Server
BACKEND_PORT=8000
CORS_ORIGINS=http://localhost:3000
```

---

## 4. Frontend — Detailed Design

### 4.1 Directory Structure

```
frontend/
├── app/
│   ├── layout.tsx             # Root layout, sidebar nav, global styles
│   ├── page.tsx               # Dashboard (home page)
│   ├── documents/
│   │   └── page.tsx           # Document management page
│   ├── chat/
│   │   └── page.tsx           # Chat + sources page
│   └── api/                   # Next.js API routes (proxy to backend if needed)
├── components/
│   ├── layout/
│   │   ├── Sidebar.tsx        # Navigation sidebar
│   │   └── Header.tsx         # Top bar with project name
│   ├── dashboard/
│   │   ├── StatsCards.tsx      # Doc count, chunk count, queries, avg confidence
│   │   ├── RecentQueries.tsx   # Last 10 queries with confidence
│   │   └── DocTypeChart.tsx    # Pie chart of document types
│   ├── documents/
│   │   ├── UploadZone.tsx     # Drag-and-drop file upload
│   │   ├── DocumentTable.tsx  # List of documents with actions
│   │   ├── ChunkViewer.tsx    # Modal to view chunks of a document
│   │   └── DeleteDialog.tsx   # Confirm delete
│   └── chat/
│       ├── ChatInput.tsx      # Message input with send button
│       ├── ChatMessages.tsx   # Message list (user + AI)
│       ├── SourcePanel.tsx    # Right panel showing cited sources
│       ├── SourceCard.tsx     # Individual source with text + score
│       └── ConfidenceBadge.tsx # Visual confidence indicator
├── lib/
│   └── api.ts                 # API client (fetch wrapper to backend)
├── tailwind.config.ts
├── next.config.js
├── Dockerfile
├── package.json
└── .env.example
```

### 4.2 Pages — Detailed Wireframes

#### Page 1: Dashboard (`/`)

```
┌─────────────────────────────────────────────────────────┐
│ [Sidebar]  │            DASHBOARD                       │
│            │                                             │
│ ● Dashboard│  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────────┐  │
│ ○ Documents│  │  15  │ │ 523  │ │  87  │ │  0.84    │  │
│ ○ Chat     │  │ Docs │ │Chunks│ │Queries│ │Avg Conf. │  │
│            │  └──────┘ └──────┘ └──────┘ └──────────┘  │
│            │                                             │
│            │  ┌─────────────────┐ ┌──────────────────┐  │
│            │  │ Recent Queries  │ │ Docs by Type     │  │
│            │  │                 │ │                  │  │
│            │  │ Q: What is...   │ │   ┌────┐         │  │
│            │  │ Conf: 0.92      │ │   │ PIE│ PDF:10  │  │
│            │  │                 │ │   │CHART│ DOCX:3  │  │
│            │  │ Q: How do I...  │ │   └────┘ TXT:2   │  │
│            │  │ Conf: 0.87      │ │                  │  │
│            │  └─────────────────┘ └──────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

#### Page 2: Documents (`/documents`)

```
┌─────────────────────────────────────────────────────────┐
│ [Sidebar]  │         DOCUMENTS                          │
│            │                                             │
│            │  ┌─────────────────────────────────────┐   │
│            │  │  ┌─────────────────────────────┐    │   │
│            │  │  │     Drag & drop files here   │    │   │
│            │  │  │     or click to browse        │    │   │
│            │  │  │     PDF, DOCX, TXT (max 20MB) │    │   │
│            │  │  └─────────────────────────────┘    │   │
│            │  └─────────────────────────────────────┘   │
│            │                                             │
│            │  ┌─────────────────────────────────────┐   │
│            │  │ Filename        │Type│Chunks│Actions │   │
│            │  │─────────────────│────│──────│────────│   │
│            │  │ llc-guide.pdf   │PDF │  47  │👁 🗑   │   │
│            │  │ ein-filing.pdf  │PDF │  23  │👁 🗑   │   │
│            │  │ annual-rpt.docx │DOCX│  31  │👁 🗑   │   │
│            │  └─────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘

Eye icon (👁) → Opens ChunkViewer modal showing all chunks
Trash icon (🗑) → DeleteDialog confirmation
```

#### Page 3: Chat (`/chat`)

```
┌─────────────────────────────────────────────────────────┐
│ [Sidebar]  │         CHAT          │    SOURCES         │
│            │                       │                     │
│            │  ┌─────────────────┐  │  No sources yet    │
│            │  │ You: What docs  │  │                     │
│            │  │ are needed for  │  │                     │
│            │  │ an LLC in TX?   │  │                     │
│            │  └─────────────────┘  │                     │
│            │                       │                     │
│            │  ┌─────────────────┐  │  ┌───────────────┐ │
│            │  │ AI: To form an  │  │  │Source 1       │ │
│            │  │ LLC in Texas,   │  │  │llc-guide.pdf  │ │
│            │  │ you need to file│  │  │Page 3         │ │
│            │  │ a Certificate   │  │  │Score: 0.94    │ │
│            │  │ [Source: llc-   │  │  │               │ │
│            │  │ guide.pdf, p.3] │  │  │"The Certificate│ │
│            │  │ ...             │  │  │of Formation..."│ │
│            │  │                 │  │  └───────────────┘ │
│            │  │ Confidence: 91% │  │                     │
│            │  └─────────────────┘  │  ┌───────────────┐ │
│            │                       │  │Source 2       │ │
│            │  ┌─────────────────┐  │  │ein-filing.pdf │ │
│            │  │ Type a question │  │  │Page 1         │ │
│            │  │            [Send]│  │  │Score: 0.87    │ │
│            │  └─────────────────┘  │  └───────────────┘ │
└─────────────────────────────────────────────────────────┘

Left panel: Chat conversation with streamed AI responses
Right panel: Source cards that populate when AI responds
  - Each card: doc name, page, relevance score, chunk text preview
  - Clicking a citation in the chat highlights the matching source card
```

### 4.3 UI Component Behavior

**UploadZone:**
- Drag-and-drop or click to browse
- Shows upload progress bar per file
- Displays chunk count after processing completes
- Rejects files > 20MB or unsupported types

**ChatMessages (streaming):**
- User message appears immediately
- AI response streams token-by-token via SSE
- After stream completes, source cards appear in right panel
- Confidence badge shows below the AI message (green >0.8, yellow 0.5-0.8, red <0.5)

**SourceCard:**
- Shows document name, page number, relevance score as a colored bar
- Expandable to show full chunk text
- Clicking a citation `[Source: X]` in the chat scrolls to and highlights the matching card

---

## 5. Infrastructure — Docker Compose

```yaml
# docker-compose.yml
version: "3.8"

services:
  frontend:
    build: ./frontend
    ports:
      - "3000:3000"
    environment:
      - NEXT_PUBLIC_API_URL=http://localhost:8000
    depends_on:
      - backend

  backend:
    build: ./backend
    ports:
      - "8000:8000"
    environment:
      - CHROMA_HOST=chromadb
      - CHROMA_PORT=8100
      - LLM_PROVIDER=openai
      - OPENAI_API_KEY=${OPENAI_API_KEY}
    volumes:
      - ./backend/app/data/demo_docs:/app/data/demo_docs
    depends_on:
      - chromadb

  chromadb:
    image: chromadb/chroma:latest
    ports:
      - "8100:8000"
    volumes:
      - chroma_data:/chroma/chroma

volumes:
  chroma_data:
```

**Startup sequence:**
1. ChromaDB starts, creates persistent volume
2. Backend starts, loads sentence-transformers + cross-encoder models (first run downloads ~100MB)
3. Backend checks if demo docs are loaded; if not, auto-ingests from `demo_docs/` folder
4. Frontend starts, connects to backend API

---

## 6. Demo Data — Pre-loaded Compliance Documents

> **TODO:** Before writing demo docs, browse the source links below and pull the best factual content.
> Pick sections that have clear headings, structured lists, and state-specific details — these chunk well and make impressive demos.
> Save raw source material to `demo_docs_sources/` for reference.

### Source Links (US Government — Public Domain)

| Source | URL | Best content to pull |
|--------|-----|---------------------|
| SBA.gov — Business Guide | https://www.sba.gov/business-guide | LLC formation, business plans, funding |
| SBA.gov — Choose Structure | https://www.sba.gov/business-guide/launch-your-business/choose-business-structure | Entity types comparison (LLC vs Corp vs Sole Prop) |
| SBA.gov — Register Business | https://www.sba.gov/business-guide/launch-your-business/register-your-business | State registration, DBA, permits |
| SBA.gov — Get EIN | https://www.sba.gov/business-guide/launch-your-business/get-federal-and-state-tax-id-numbers | EIN application process |
| IRS.gov — EIN FAQ | https://www.irs.gov/businesses/small-businesses-self-employed/employer-id-numbers | EIN requirements, who needs one |
| IRS.gov — Apply for EIN | https://www.irs.gov/businesses/small-businesses-self-employed/apply-for-an-employer-identification-number-ein-online | Application steps |
| SBA.gov — Manage Business | https://www.sba.gov/business-guide/manage-your-business | Compliance, taxes, legal requirements |
| SCORE.org — Guides | https://www.score.org/resource-library | Small business checklists, templates |
| USA.gov — Start Business | https://www.usa.gov/start-business | Federal requirements overview |
| SBA.gov — Close Business | https://www.sba.gov/business-guide/manage-your-business/close-or-sell-your-business | Dissolution process |

### Target Demo Documents (10 files)

| # | File | Topic | Source | ~Pages |
|---|------|-------|--------|--------|
| 1 | llc-formation-guide.txt | How to form an LLC (by state) | SBA.gov | 3 |
| 2 | ein-application-guide.txt | EIN/tax ID filing process | IRS.gov | 2 |
| 3 | registered-agent-faq.txt | What is a registered agent, requirements | SBA.gov + state sites | 2 |
| 4 | annual-report-requirements.txt | State annual report filing | SBA.gov | 3 |
| 5 | business-compliance-checklist.txt | General compliance checklist | SCORE.org | 2 |
| 6 | corporate-vs-llc.txt | Comparison of entity types | SBA.gov | 2 |
| 7 | state-filing-fees.txt | Filing fees by state | SBA.gov + state sites | 2 |
| 8 | operating-agreement-guide.txt | LLC operating agreement basics | SBA.gov | 2 |
| 9 | dissolution-process.txt | How to dissolve a business entity | SBA.gov | 2 |
| 10 | foreign-qualification.txt | Registering in other states | SBA.gov | 2 |

All content is US government public domain — no copyright issues. Files will be written with clear headings for optimal chunking.

---

## 7. Phases & Tickets — Detailed Breakdown

**Total: 7 phases, 42 tickets**
**Estimated build time: ~16-18 hours (2 focused days)**

---

### Phase 0: Project Setup & Infrastructure
> Get the repo, Docker, and dev environment ready so everything else plugs in cleanly.

| # | Ticket | What exactly to do | Depends on | Est. |
|---|--------|--------------------|------------|------|
| 0.1 | **Create GitHub repo** | Create `askdocs-rag` repo on GitHub. Add `.gitignore` (Python + Node). Add MIT license. Clone locally. | — | 5 min |
| 0.2 | **Root project structure** | Create folder layout: `backend/`, `frontend/`, `docker-compose.yml`, `.env.example`, `README.md` (placeholder) | 0.1 | 5 min |
| 0.3 | **Docker Compose file** | Write `docker-compose.yml` with 3 services (backend, frontend, chromadb). Map ports 3000, 8000, 8100. Add `chroma_data` volume. | 0.2 | 10 min |
| 0.4 | **Environment config** | Create `.env.example` with all vars (OPENAI_API_KEY, CHROMA_HOST, LLM_PROVIDER, etc). Create `.env` locally with real keys. Add `.env` to `.gitignore`. | 0.2 | 5 min |
| 0.5 | **Verify ChromaDB starts** | Run `docker-compose up chromadb` — confirm it's accessible on port 8100. | 0.3 | 5 min |

**Phase 0 total: ~30 min**

---

### Phase 1: Backend — App Shell & Config
> Get FastAPI running with health check, config loading, and CORS.

| # | Ticket | What exactly to do | Depends on | Est. |
|---|--------|--------------------|------------|------|
| 1.1 | **FastAPI app skeleton** | Create `backend/app/main.py` with FastAPI app instance, CORS middleware, lifespan handler (placeholder). Add `/health` endpoint. | 0.2 | 10 min |
| 1.2 | **Config with pydantic-settings** | Create `backend/app/config.py`. Load all env vars into a `Settings` class: `LLM_PROVIDER`, `OPENAI_API_KEY`, `CHROMA_HOST`, `CHROMA_PORT`, `CHUNK_SIZE`, `CHUNK_OVERLAP`, `RETRIEVAL_TOP_K`, `CORS_ORIGINS`. | 1.1 | 10 min |
| 1.3 | **Requirements.txt** | List all Python deps: `fastapi`, `uvicorn`, `python-multipart`, `chromadb`, `sentence-transformers`, `rank-bm25`, `openai`, `anthropic`, `pypdf2`, `python-docx`, `pydantic-settings`, `sse-starlette`. | — | 5 min |
| 1.4 | **Backend Dockerfile** | Python 3.11 slim. Copy requirements, install. Copy app. CMD uvicorn. | 1.3 | 10 min |
| 1.5 | **Pydantic schemas** | Create `backend/app/models/schemas.py`. Define: `DocumentResponse`, `ChunkResponse`, `ChatRequest`, `ChatResponse`, `SourceInfo`, `RetrievalMetadata`, `StatsResponse`, `UploadResponse`. | — | 15 min |
| 1.6 | **Verify backend starts** | Run `docker-compose up backend` — hit `/health` and `/docs` (Swagger). Confirm CORS headers. | 1.1-1.4 | 5 min |

**Phase 1 total: ~55 min**

---

### Phase 2: Backend — Ingestion Pipeline
> The upload-to-searchable pipeline: extract text → chunk → embed → store.

| # | Ticket | What exactly to do | Depends on | Est. |
|---|--------|--------------------|------------|------|
| 2.1 | **Text extractor service** | Create `backend/app/services/text_extractor.py`. Three functions: `extract_pdf(file_bytes) → list[{text, page_num}]` using PyPDF2, `extract_docx(file_bytes) → list[{text, page_num}]` using python-docx, `extract_txt(file_bytes) → list[{text, page_num}]`. Auto-detect by extension. Return list of `(text, page_number)` tuples. | 1.1 | 20 min |
| 2.2 | **Chunker service** | Create `backend/app/services/chunker.py`. Input: list of `(text, page_number)`. Step 1: Split by double-newlines and markdown headings (`## ...`). Step 2: If any chunk > `CHUNK_SIZE` tokens, recursively split at sentence boundaries (`. `, `? `, `! `). Add `CHUNK_OVERLAP` tokens overlap between consecutive chunks. Output: list of `{text, page_number, chunk_index, token_count}`. | 1.2 | 25 min |
| 2.3 | **Embedder service** | Create `backend/app/services/embedder.py`. Load `all-MiniLM-L6-v2` once on startup (singleton). Function: `embed_texts(texts: list[str]) → list[list[float]]`. Batch processing. Also: `embed_query(query: str) → list[float]`. | 1.1 | 15 min |
| 2.4 | **ChromaDB client** | Create `backend/app/services/chroma_client.py`. Connect to ChromaDB using `CHROMA_HOST:CHROMA_PORT`. Get or create collection `askdocs_chunks`. Functions: `add_chunks(doc_id, chunks, embeddings)`, `delete_by_doc_id(doc_id)`, `get_all_chunks()`, `get_chunks_by_doc_id(doc_id)`, `vector_search(embedding, top_k) → results`. Store metadata: `doc_id`, `doc_name`, `page_number`, `chunk_index`. | 1.2 | 20 min |
| 2.5 | **Ingestion pipeline** | Create `backend/app/services/ingestion.py`. Orchestrator function: `ingest_document(filename, file_bytes) → DocumentResponse`. Calls: text_extractor → chunker → embedder → chroma_client.add_chunks. Generates UUID for doc_id. Returns doc metadata with chunk count. | 2.1-2.4 | 15 min |
| 2.6 | **Documents router** | Create `backend/app/routers/documents.py`. Endpoints: `POST /api/documents/upload` (accepts multipart files, calls ingestion pipeline, returns doc list), `GET /api/documents` (list all unique doc_ids from ChromaDB with metadata), `GET /api/documents/{doc_id}` (single doc detail), `GET /api/documents/{doc_id}/chunks?page=1&per_page=20` (paginated chunks), `DELETE /api/documents/{doc_id}` (delete from ChromaDB). Register router in main.py. | 2.5, 1.5 | 25 min |
| 2.7 | **Test ingestion end-to-end** | Upload a sample .txt file via Swagger `/docs`. Verify: chunks appear in ChromaDB, list endpoint returns doc, chunks endpoint returns chunks with correct page numbers. | 2.6 | 10 min |

**Phase 2 total: ~2 hr 10 min**

---

### Phase 3: Backend — Retrieval Pipeline
> The query pipeline: hybrid search → re-rank → LLM generation → cited answer.

| # | Ticket | What exactly to do | Depends on | Est. |
|---|--------|--------------------|------------|------|
| 3.1 | **BM25 index service** | Create `backend/app/services/bm25_index.py`. On startup: load all chunk texts from ChromaDB, build `BM25Okapi` index. Functions: `build_index()`, `search(query, top_k) → list of (chunk_id, score)`, `add_to_index(chunks)`, `remove_from_index(doc_id)`. Keep a parallel `chunk_id_map` list so BM25 results map back to ChromaDB IDs. | 2.4 | 25 min |
| 3.2 | **Hybrid search service** | Create `backend/app/services/hybrid_search.py`. Function: `hybrid_search(query, top_k=20) → list of {chunk_id, text, metadata, rrf_score}`. Steps: (1) embed query → vector search top 20, (2) BM25 search top 20, (3) Reciprocal Rank Fusion: `score = Σ 1/(k+rank)` where k=60, (4) deduplicate by chunk_id, (5) sort by RRF score, return top 20. | 2.3, 2.4, 3.1 | 25 min |
| 3.3 | **Re-ranker service** | Create `backend/app/services/reranker.py`. Load `cross-encoder/ms-marco-MiniLM-L-6-v2` once on startup (singleton). Function: `rerank(query, chunks, top_k=5) → list of {chunk, rerank_score}`. Input: query string + list of chunk texts. Score each (query, chunk) pair. Sort by score descending. Return top_k. | 1.1 | 15 min |
| 3.4 | **LLM client service** | Create `backend/app/services/llm_client.py`. Supports OpenAI and Anthropic. Function: `generate_stream(system_prompt, user_message) → AsyncGenerator[str]`. System prompt enforces citation format: "Answer ONLY from provided sources. Cite as [Source: filename, p.X]. If info not found, say: I don't have enough information." Reads `LLM_PROVIDER` from config. | 1.2 | 25 min |
| 3.5 | **Retrieval pipeline** | Create `backend/app/services/retrieval.py`. Orchestrator: `retrieve_and_answer(question, top_k=5, use_reranking=True)`. Steps: (1) hybrid_search → top 20, (2) rerank → top 5, (3) format chunks into context string with labels, (4) call LLM with streaming, (5) build response with sources list + retrieval metadata (timing, counts). Returns `ChatResponse` with streaming answer + source info. | 3.2, 3.3, 3.4 | 20 min |
| 3.6 | **Chat router** | Create `backend/app/routers/chat.py`. Endpoint: `POST /api/chat`. Accepts `ChatRequest` (question, top_k, use_reranking). Returns SSE stream: first event = sources JSON, then token-by-token answer events, final event = retrieval metadata. Register in main.py. | 3.5, 1.5 | 20 min |
| 3.7 | **Stats router** | Create `backend/app/routers/stats.py`. Endpoint: `GET /api/stats`. Returns: total_documents, total_chunks, avg_chunk_tokens, total_queries (in-memory counter), avg_confidence, avg_retrieval_time_ms, recent_queries (last 10, stored in-memory list), documents_by_type. Register in main.py. | 2.4 | 15 min |
| 3.8 | **BM25 rebuild on startup** | In FastAPI lifespan handler (`main.py`): on startup, call `bm25_index.build_index()` to load all existing chunks from ChromaDB. Also pre-load embedding model and reranker model here. | 3.1, 2.3, 3.3 | 10 min |
| 3.9 | **Test retrieval end-to-end** | Upload 2-3 demo docs via Swagger. Hit `/api/chat` with a question. Verify: streaming works, citations are correct, sources contain doc names and page numbers, confidence score is reasonable. Test out-of-scope question — verify refusal. | 3.6 | 10 min |

**Phase 3 total: ~2 hr 45 min**

---

### Phase 4: Frontend — Shell & Dashboard
> Get Next.js running with layout, navigation, API client, and the dashboard page.

| # | Ticket | What exactly to do | Depends on | Est. |
|---|--------|--------------------|------------|------|
| 4.1 | **Next.js scaffolding** | `npx create-next-app@latest frontend` with App Router, TypeScript, Tailwind. Install shadcn/ui (`npx shadcn-ui@latest init`). Add components: Button, Card, Table, Dialog, Badge, Input, ScrollArea. | 0.2 | 15 min |
| 4.2 | **Frontend Dockerfile** | Node 20 alpine. Copy package.json, install. Copy app. Build. CMD `next start`. | 4.1 | 10 min |
| 4.3 | **API client** | Create `frontend/lib/api.ts`. Base URL from `NEXT_PUBLIC_API_URL`. Functions: `fetchDocuments()`, `uploadDocuments(files)`, `deleteDocument(id)`, `fetchChunks(docId, page)`, `fetchStats()`, `chatStream(question, topK, useReranking) → ReadableStream`. All typed with interfaces matching backend schemas. | 4.1 | 15 min |
| 4.4 | **Root layout + Sidebar** | Create `app/layout.tsx` with dark/neutral theme. Sidebar with 3 nav links: Dashboard (home icon), Documents (folder icon), Chat (message icon). Active link highlight. Logo "AskDocs" at top of sidebar. Use Lucide icons. | 4.1 | 20 min |
| 4.5 | **StatsCards component** | Create `components/dashboard/StatsCards.tsx`. 4 cards in a row: Documents (file icon), Chunks (layers icon), Queries (search icon), Avg Confidence (shield icon). Each card: big number + label + subtle icon. Color-coded. | 4.1 | 15 min |
| 4.6 | **RecentQueries component** | Create `components/dashboard/RecentQueries.tsx`. List of last 10 queries. Each row: question text (truncated), confidence badge (green/yellow/red), timestamp. Empty state: "No queries yet — try the chat." | 4.1 | 15 min |
| 4.7 | **DocTypeChart component** | Create `components/dashboard/DocTypeChart.tsx`. Simple bar or pie chart showing document count by file type (PDF, DOCX, TXT). Use a lightweight chart lib (recharts) or just colored bars with CSS. | 4.1 | 15 min |
| 4.8 | **Dashboard page** | Create `app/page.tsx`. Fetch stats from `/api/stats` on mount. Render: StatsCards on top, RecentQueries on bottom-left, DocTypeChart on bottom-right. Loading skeleton while fetching. | 4.3-4.7 | 15 min |
| 4.9 | **Verify dashboard** | Run frontend + backend. Open `localhost:3000`. Confirm dashboard loads, sidebar navigates, stats show real data from backend. | 4.8 | 5 min |

**Phase 4 total: ~2 hr 5 min**

---

### Phase 5: Frontend — Documents & Chat Pages
> The two main pages: document management and the chat interface.

| # | Ticket | What exactly to do | Depends on | Est. |
|---|--------|--------------------|------------|------|
| 5.1 | **UploadZone component** | Create `components/documents/UploadZone.tsx`. Drag-and-drop area + click-to-browse. Accept PDF, DOCX, TXT. Max 20MB. Show file names after selection. Upload button calls `api.uploadDocuments()`. Progress state: idle → uploading (spinner) → done (chunk count). Error state for rejected files. | 4.3 | 25 min |
| 5.2 | **DocumentTable component** | Create `components/documents/DocumentTable.tsx`. Table with columns: Filename, Type (badge), Chunks, Size, Uploaded. Actions column: View chunks button, Delete button. Sortable by filename. Empty state: "No documents uploaded yet." | 4.3 | 20 min |
| 5.3 | **ChunkViewer modal** | Create `components/documents/ChunkViewer.tsx`. shadcn Dialog. Fetches chunks for a doc_id with pagination. Shows each chunk: index number, page number, token count, full text in a scrollable card. Page navigation at bottom. | 4.3 | 20 min |
| 5.4 | **DeleteDialog component** | Create `components/documents/DeleteDialog.tsx`. Confirmation dialog: "Delete {filename}? This will remove all {N} chunks." Confirm → calls `api.deleteDocument(id)` → refreshes document list. | 4.3 | 10 min |
| 5.5 | **Documents page** | Create `app/documents/page.tsx`. Top: UploadZone. Bottom: DocumentTable. After upload completes, refresh table. Wire up ChunkViewer and DeleteDialog from table actions. | 5.1-5.4 | 15 min |
| 5.6 | **Chat page layout** | Create `app/chat/page.tsx`. Split pane: left 60% for chat, right 40% for sources panel. Resizable divider (or fixed). Sources panel header: "Sources" with count badge. | 4.4 | 15 min |
| 5.7 | **ChatInput component** | Create `components/chat/ChatInput.tsx`. Text input + Send button. Enter key sends. Disabled while AI is responding. Auto-focus on mount. | — | 10 min |
| 5.8 | **ChatMessages component** | Create `components/chat/ChatMessages.tsx`. Message list with user (right-aligned, blue) and AI (left-aligned, gray) bubbles. AI messages support markdown rendering. Auto-scroll to bottom on new message. | — | 15 min |
| 5.9 | **SSE streaming hook** | Create `frontend/lib/useChat.ts`. Custom hook: manages messages state, sends question to `api.chatStream()`, reads SSE events, appends tokens to current AI message in real-time, stores sources and metadata when stream ends. | 4.3 | 25 min |
| 5.10 | **SourcePanel + SourceCard** | Create `components/chat/SourcePanel.tsx` and `SourceCard.tsx`. Panel shows source cards after AI responds. Each card: document name, page number, relevance score bar (colored 0-1), expandable chunk text preview. Empty state: "Ask a question to see sources." | — | 20 min |
| 5.11 | **ConfidenceBadge component** | Create `components/chat/ConfidenceBadge.tsx`. Shows confidence percentage below AI message. Green (>80%), yellow (50-80%), red (<50%). Tooltip: "Based on cross-encoder relevance scores." | — | 5 min |
| 5.12 | **Citation highlighting** | In ChatMessages: parse `[Source: filename, p.X]` in AI text. Render as clickable links. On click: scroll to matching SourceCard in the right panel and highlight it briefly (pulse animation). | 5.8, 5.10 | 15 min |
| 5.13 | **Wire chat page together** | Connect: ChatInput → useChat hook → ChatMessages (streaming) + SourcePanel (after stream) + ConfidenceBadge. Test full flow. | 5.6-5.12 | 10 min |
| 5.14 | **Test documents + chat pages** | Upload docs on documents page. Ask questions on chat page. Verify: streaming, citations, sources, confidence, chunk viewer all work. | 5.5, 5.13 | 10 min |

**Phase 5 total: ~3 hr 35 min**

---

### Phase 6: Demo Data & Auto-Load
> Write the demo documents and make them load automatically on first startup.

| # | Ticket | What exactly to do | Depends on | Est. |
|---|--------|--------------------|------------|------|
| 6.1 | **Browse source links** | Visit SBA.gov, IRS.gov, SCORE.org links from Section 6. Save useful sections/facts to `demo_docs_sources/` as reference. Note which content chunks well (clear headings, lists, state-specific info). | — | 20 min |
| 6.2 | **Write demo docs 1-3** | Write `llc-formation-guide.txt` (LLC formation by state, ~3 pages), `ein-application-guide.txt` (EIN process, ~2 pages), `registered-agent-faq.txt` (RA requirements, ~2 pages). Use clear `##` headings, bullet lists, state-specific details. | 6.1 | 20 min |
| 6.3 | **Write demo docs 4-6** | Write `annual-report-requirements.txt`, `business-compliance-checklist.txt`, `corporate-vs-llc.txt`. Same format: headings, structured content. | 6.1 | 20 min |
| 6.4 | **Write demo docs 7-10** | Write `state-filing-fees.txt`, `operating-agreement-guide.txt`, `dissolution-process.txt`, `foreign-qualification.txt`. | 6.1 | 20 min |
| 6.5 | **Auto-load on startup** | In FastAPI lifespan: check if ChromaDB collection is empty. If yes, iterate over `backend/app/data/demo_docs/*.txt`, call ingestion pipeline for each. Log: "Loaded {N} demo documents ({M} chunks)". | 2.5 | 15 min |
| 6.6 | **Write demo questions** | Create `demo_docs/DEMO_QUESTIONS.md` with 6 prepared questions: 2 single-doc (easy), 2 multi-doc (medium), 2 out-of-scope (guardrail test). Include expected answers. | 6.2-6.4 | 10 min |
| 6.7 | **Test fresh startup** | Delete chroma_data volume. Run `docker-compose up`. Verify: demo docs auto-load, dashboard shows 10 docs, chat answers demo questions correctly with citations. | 6.5, 6.6 | 10 min |

**Phase 6 total: ~1 hr 55 min**

---

### Phase 7: Polish, README & Demo Prep
> Make it look professional, document it, prepare for the Loom recording.

| # | Ticket | What exactly to do | Depends on | Est. |
|---|--------|--------------------|------------|------|
| 7.1 | **UI polish pass** | Review all 3 pages. Fix spacing, alignment, colors. Ensure dark mode looks good. Add loading skeletons everywhere. Add error toast notifications. Empty states for all lists. | 5.14 | 30 min |
| 7.2 | **README.md** | Write professional README: project description, screenshot/GIF, features list, architecture diagram (Mermaid), tech stack, quickstart (`docker-compose up`), environment variables, API reference summary, license. | All | 30 min |
| 7.3 | **Architecture diagram** | Create Mermaid diagram for README showing: User → Frontend → Backend → [ChromaDB, BM25, Embedder, Re-ranker, LLM]. Show ingestion flow and retrieval flow. | — | 15 min |
| 7.4 | **Docker Compose integration test** | Full clean test: `docker-compose down -v && docker-compose up --build`. Time it. Verify all 3 services start. Verify demo data loads. Run through all demo questions. Fix any issues. | All | 20 min |
| 7.5 | **Loom demo script** | Write detailed 2-min script with exact clicks, exact questions to ask, and talking points. Include: what to say about hybrid search, re-ranking, hallucination guardrails. Practice once. | 6.6 | 10 min |
| 7.6 | **Take screenshots** | Screenshot: dashboard with data, documents page with files, chat with cited answer + sources panel. Save to `screenshots/` for README. | 7.1 | 10 min |
| 7.7 | **Final commit + push** | Clean git history. Final commit. Push to GitHub. Verify README renders correctly on GitHub. | 7.1-7.6 | 5 min |

**Phase 7 total: ~2 hr**

---

### Summary

| Phase | What | Tickets | Time |
|-------|------|---------|------|
| 0 | Project Setup & Infrastructure | 5 | 30 min |
| 1 | Backend — App Shell & Config | 6 | 55 min |
| 2 | Backend — Ingestion Pipeline | 7 | 2 hr 10 min |
| 3 | Backend — Retrieval Pipeline | 9 | 2 hr 45 min |
| 4 | Frontend — Shell & Dashboard | 9 | 2 hr 5 min |
| 5 | Frontend — Documents & Chat Pages | 14 | 3 hr 35 min |
| 6 | Demo Data & Auto-Load | 7 | 1 hr 55 min |
| 7 | Polish, README & Demo Prep | 7 | 2 hr |
| **Total** | | **64 tickets** | **~16 hr** |

**Day 1 plan:** Phase 0 + 1 + 2 + 3 (backend complete) = ~6.5 hrs
**Day 2 plan:** Phase 4 + 5 + 6 + 7 (frontend + polish) = ~9.5 hrs

Critical path: Phase 2 (ingestion) blocks Phase 3 (retrieval) blocks Phase 5 (chat UI) blocks Phase 6 (demo data test)

---

## 8. Demo Script (2-min Loom Video)

1. **0:00-0:15** — "This is AskDocs, an enterprise RAG knowledge base I built." Show dashboard with pre-loaded docs.
2. **0:15-0:30** — Upload a new document. Show chunk count appearing. Switch to documents page to show it in the list.
3. **0:30-1:00** — Switch to chat. Ask: "What documents are needed to form an LLC in Texas?" Show the answer streaming in with citations. Point out the source cards appearing on the right.
4. **1:00-1:20** — Ask a harder question that spans multiple documents. Show how sources from different files appear.
5. **1:20-1:40** — Ask a question the docs DON'T cover: "What is the capital gains tax rate?" Show the hallucination guardrail responding with "I don't have enough information."
6. **1:40-2:00** — Show dashboard updated with new queries. Mention: hybrid search, cross-encoder re-ranking, Docker one-command deploy. "Built in 2 days. Let's build something like this for your business."

---

## 9. Success Criteria

- [ ] `docker-compose up` starts all 3 services and loads demo data automatically
- [ ] Upload a PDF → see chunks in document viewer within 5 seconds
- [ ] Ask a question → get streamed answer with correct citations within 3 seconds
- [ ] Sources panel shows relevant chunks with scores
- [ ] Ask an out-of-scope question → system refuses to hallucinate
- [ ] Dashboard shows accurate stats
- [ ] Works with both OpenAI and Claude (env var switch)
- [ ] Clean GitHub repo with README, architecture diagram, and demo video link
