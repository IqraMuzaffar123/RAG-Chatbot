# DocMind RAG (AskDocs) — Enhancement Plan

> **Project Status:** Core backend + frontend fully working. UI needs polish. No demo video yet.
> **Goal:** Make it Upwork portfolio-ready with premium UI and a few killer features.
> **Last Updated:** 2026-07-16

---

## CURRENT STATE SUMMARY

### What's Done (Working)

| Area | Status | Details |
|------|--------|---------|
| Backend API | ✅ Complete | 8 endpoints — upload, list, delete, chunks, chat (SSE), stats, health |
| Ingestion Pipeline | ✅ Complete | PDF/DOCX/TXT extraction, semantic chunking (500 tokens, 50 overlap) |
| Hybrid Search | ✅ Complete | BM25 + vector (all-MiniLM-L6-v2) + RRF fusion (k=60) |
| Cross-Encoder Re-Ranking | ✅ Complete | ms-marco-MiniLM-L-6-v2, top-5 re-ranked results |
| LLM Streaming | ✅ Complete | SSE token-by-token, OpenAI or Anthropic (configurable) |
| Citation System | ✅ Complete | Forced `[Source: filename, p.X]` format + hallucination guardrail |
| Frontend — Dashboard | ✅ Complete | 4 stat cards, recent queries, doc type chart |
| Frontend — Documents | ✅ Complete | Drag-drop upload, table, chunk viewer modal, delete |
| Frontend — Chat | ✅ Complete | Split layout (60% chat / 40% sources), streaming, citations |
| Docker Setup | ✅ Complete | 3-service compose, auto-loads 10 demo docs on first startup |
| Demo Data | ✅ Complete | 10 compliance docs (~60KB), 6 prepared test questions |
| Documentation | ✅ Complete | README, DESIGN, TECHNICALITIES, TESTING-GUIDE, DEMO-SCRIPT |

### What's Missing

| Area | Status | Impact |
|------|--------|--------|
| UI polish / redesign | ❌ Not started | Looks basic — "tutorial project" not "product" |
| Mobile responsiveness | ❌ Not done | Desktop-only layout |
| Chat welcome state | ❌ Missing | Blank chat on first visit |
| Clickable citations | ❌ Missing | Citations visible but can't scroll to source |
| Multi-turn conversations | ❌ Missing | Each query is independent |
| Conversation history | ❌ Missing | No persistence between sessions |
| Persistent stats | ❌ Missing | Stats reset on process restart |
| Demo video | ❌ Not recorded | Critical for Upwork profile |

---

## ENHANCEMENT PLAN

### Phase 1: UI Redesign (Priority: HIGH)

> Transform from functional-but-basic to "Linear/Raycast quality" premium dark UI.
> Redesign spec already exists in `UI-REDESIGN-PROMPT.md`.

#### 1.1 Global Design System
- [ ] Add glassmorphism card style: `bg-white/5 backdrop-blur-xl border border-white/10`
- [ ] Add colored top accent lines on all cards (emerald, cyan, amber, violet)
- [ ] Implement shimmer skeleton loaders (replace pulse animation)
- [ ] Add staggered fade-in animations on page load
- [ ] Improve typography: larger headings, better spacing, font weights
- [ ] Add hover effects on all interactive elements (scale, glow, border-color shift)

#### 1.2 Sidebar Redesign
- [ ] Add AskDocs logo/branding in header
- [ ] Active route indicator (left emerald bar + background highlight)
- [ ] Collapsible sidebar (icons-only mode on small screens)
- [ ] Subtle hover states on nav items
- [ ] Footer with version number

#### 1.3 Dashboard Page
- [ ] Stat cards with gradient accent tops and hover lift effect
- [ ] Icons inside stat cards (FileText, Layers, MessageSquare, TrendingUp)
- [ ] Recent queries section with colored confidence dots
- [ ] Improved chart styling (better colors, labels, legend)
- [ ] "Quick Actions" section (Upload, Ask a Question shortcuts)

#### 1.4 Documents Page
- [ ] Upload zone with dashed border animation on drag
- [ ] File type icons in document table (PDF red, DOCX blue, TXT gray)
- [ ] Search/filter bar above document table
- [ ] Sort by columns (name, type, chunks, date, size)
- [ ] Improved chunk viewer modal (syntax highlighting, better spacing)
- [ ] Toast notifications on upload success/delete

#### 1.5 Chat Page
- [ ] **Welcome state** with:
  - AskDocs logo + tagline
  - 4-6 clickable example question chips (auto-fill + send on click)
  - Subtle background pattern/gradient
- [ ] Improved message bubbles (user = right-aligned emerald, AI = left-aligned dark)
- [ ] Streaming indicator: animated dots or pulsing cursor
- [ ] Source panel: cards with expand/collapse, relevance score bar, page badge
- [ ] **Clickable citations**: click `[Source: X, p.Y]` -> highlight matching source card + scroll
- [ ] Copy button on AI responses
- [ ] Confidence badge redesign: ring/meter style instead of plain badge

#### 1.6 Responsive Design
- [ ] Sidebar collapses to icon-bar at `< 1024px`
- [ ] Sidebar becomes bottom sheet / hamburger at `< 768px`
- [ ] Chat: sources panel stacks below chat on mobile
- [ ] Dashboard: stat cards go from 4-col -> 2-col -> 1-col
- [ ] Document table: horizontal scroll on small screens

---

### Phase 2: Feature Enhancements (Priority: MEDIUM)

#### 2.1 Multi-Turn Conversations
- [ ] Add conversation context to LLM prompt (last 3-5 messages)
- [ ] Store conversation state in React state (frontend)
- [ ] Backend: accept `conversation_history` array in chat request body
- [ ] "New Conversation" button to reset context
- **Why:** Every RAG demo gets asked "can it do follow-up questions?" — this answers yes.

#### 2.2 Conversation History (Sidebar)
- [ ] Save conversations to localStorage (no backend needed)
- [ ] Show conversation list in sidebar or dedicated panel
- [ ] Title each conversation by first question
- [ ] Load/resume previous conversations
- [ ] Delete conversation option
- **Why:** Shows "product thinking" not just "demo project."

#### 2.3 Document Search & Filter
- [ ] Search bar on documents page (filter by filename)
- [ ] Filter by document type (PDF/DOCX/TXT toggle buttons)
- [ ] Sort by: name, date uploaded, chunk count, file size
- [ ] Bulk select + delete
- **Why:** Essential UX for any doc management system.

#### 2.4 Source Card Enhancements
- [ ] "Copy chunk text" button on each source card
- [ ] Highlight search terms / query keywords in source text
- [ ] Show relevance score as visual bar (not just number)
- [ ] Expand/collapse toggle for long chunks
- **Why:** Makes the retrieval pipeline feel transparent and professional.

#### 2.5 Query Analytics Dashboard
- [ ] Track queries over time (chart: queries per day/hour)
- [ ] Average confidence trend line
- [ ] Most-referenced documents (which docs get cited most)
- [ ] Low-confidence query log (questions the system struggled with)
- [ ] Store in localStorage or add lightweight SQLite stats DB
- **Why:** Clients love dashboards. Shows you think about observability.

---

### Phase 3: Backend Improvements (Priority: LOW)

#### 3.1 Persistent Stats
- [ ] Add SQLite database for query stats (separate from ChromaDB)
- [ ] Store: query text, confidence, retrieval time, sources used, timestamp
- [ ] Migrate `/api/stats` from in-memory dict to SQLite queries
- [ ] Stats survive process restarts

#### 3.2 Input Validation & Rate Limiting
- [ ] Max question length: 1000 characters
- [ ] Max file size: enforce at stream level (not just post-upload)
- [ ] Rate limit: 10 queries/minute per IP (simple in-memory counter)
- [ ] Max concurrent uploads: 3

#### 3.3 Better Error Handling
- [ ] LLM timeout handling (30s timeout, retry once)
- [ ] Graceful stream error recovery (send error event, don't hang)
- [ ] Structured JSON logging (for production debugging)
- [ ] Health endpoint: include ChromaDB status + doc count

#### 3.4 Performance
- [ ] Incremental BM25 index updates (avoid full rebuild on each doc add)
- [ ] Proper token counting with `tiktoken` library
- [ ] Cache frequently asked questions (TTL-based, in-memory)
- [ ] Pagination on `/api/documents` endpoint

#### 3.5 Local LLM Support (Bonus)
- [ ] Add Ollama as LLM provider option
- [ ] Configure via `LLM_PROVIDER=ollama` + `OLLAMA_MODEL=llama3`
- [ ] Zero-cost, fully offline RAG demo
- **Why:** "Works completely offline" is a powerful portfolio differentiator.

---

### Phase 4: Demo & Portfolio (Priority: CRITICAL)

#### 4.1 Record Demo Video
- [ ] Follow `DEMO-SCRIPT.md` (2-minute Loom video)
- [ ] Show: Dashboard stats -> Upload a doc -> Ask a question -> Streaming answer with citations -> Hallucination guardrail -> Source inspection
- [ ] Clean data: fresh Docker start with demo docs only

#### 4.2 Screenshots
- [ ] Dashboard with full data (all stats populated)
- [ ] Document table with multiple doc types
- [ ] Chat showing streaming answer with citations
- [ ] Source panel with relevance scores
- [ ] Chunk viewer modal
- [ ] Mobile view (after responsive redesign)

#### 4.3 Upwork Proposal Template
- [ ] Write 3 proposal templates targeting different job types:
  - RAG/knowledge base build
  - AI chatbot with document upload
  - Enterprise document Q&A system
- [ ] Include: project link, demo video link, key differentiators

---

## PRIORITY ORDER (What to Do First)

| Priority | Phase | What | Why |
|----------|-------|------|-----|
| 1 | 1.5 | Chat welcome state + example questions | Quick win, huge UX improvement |
| 2 | 1.1-1.3 | Global design system + dashboard polish | Visual transformation |
| 3 | 1.5 | Clickable citations | Killer demo feature |
| 4 | 1.6 | Responsive design | Professional standard |
| 5 | 1.4 | Documents page polish | Complete the redesign |
| 6 | 4.1 | Record demo video | Unlocks Upwork proposals |
| 7 | 2.1 | Multi-turn conversations | Answers the #1 client question |
| 8 | 2.5 | Query analytics | Dashboard candy |
| 9 | 3.5 | Ollama support | "Works offline" differentiator |
| 10 | 4.3 | Upwork proposal templates | Start bidding |

---

## ARCHITECTURE (Current)

```
User (Browser)
     |
     | HTTP / SSE
     v
Next.js Frontend (port 3000)
     |
     | REST API calls
     v
FastAPI Backend (port 8000)
     |
     +-- Ingestion:  extract text -> semantic chunk -> embed -> store
     |       |
     |       v
     |   ChromaDB (port 8001) -- stores vectors + text + metadata
     |
     +-- Retrieval:  BM25 + vector search -> RRF fusion -> cross-encoder rerank
     |       |
     |       v
     |   LLM (OpenAI / Anthropic) -- streaming answer generation
     |
     +-- Stats:  in-memory query tracking (resets on restart)
```

---

## FILES TO CREATE/MODIFY

### New Files
- `frontend/components/chat/WelcomeState.tsx` — Example question chips
- `frontend/components/chat/CopyButton.tsx` — Copy AI response
- `frontend/components/layout/MobileSidebar.tsx` — Responsive sidebar
- `frontend/lib/conversationStore.ts` — localStorage conversation history
- `backend/app/services/stats_db.py` — Persistent stats (if Phase 3.1)

### Files to Modify
- `frontend/app/layout.tsx` — Responsive sidebar logic
- `frontend/app/page.tsx` — Dashboard redesign
- `frontend/app/documents/page.tsx` — Search/filter, polish
- `frontend/app/chat/page.tsx` — Welcome state, multi-turn, citation click
- `frontend/components/dashboard/StatsCards.tsx` — Glassmorphism + icons
- `frontend/components/dashboard/RecentQueries.tsx` — Polish
- `frontend/components/documents/UploadZone.tsx` — Animation
- `frontend/components/documents/DocumentTable.tsx` — Icons, sort, search
- `frontend/components/chat/ChatMessages.tsx` — Clickable citations, copy
- `frontend/components/chat/SourcePanel.tsx` — Expand/collapse, score bars
- `frontend/components/chat/SourceCard.tsx` — Keyword highlight, copy
- `frontend/components/chat/ConfidenceBadge.tsx` — Ring/meter style
- `frontend/components/layout/Sidebar.tsx` — Branding, collapse, active indicator
- `frontend/lib/useChat.ts` — Multi-turn support
- `backend/app/routers/chat.py` — Accept conversation_history
- `backend/app/services/llm_client.py` — Ollama provider (Phase 3.5)
- `backend/app/config.py` — Ollama config vars (Phase 3.5)

---

## COST: $0

All enhancements use free tools/libraries:
- UI: Tailwind CSS + shadcn/ui (already installed)
- Animations: Tailwind + CSS transitions
- Conversation history: localStorage
- Local LLM: Ollama (free, open-source)
- Stats DB: SQLite (free, zero-config)
