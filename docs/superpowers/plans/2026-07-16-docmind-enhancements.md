# DocMind RAG Enhancements — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform AskDocs from a functional demo into a production-grade, visually stunning Gradient Dark portfolio project.

**Architecture:** 10 features implemented sequentially. Each feature is fully complete and tested before moving to the next. UI features first (1-6), then functionality (7-8), then backend (9-10).

**Tech Stack:** Next.js 16 + React 19 + Tailwind v4 + shadcn/ui + Recharts (frontend), FastAPI + SQLite + ChromaDB (backend)

---

## Task 1: Global Design System — CSS Tokens & Animations

**Files:**
- Modify: `frontend/app/globals.css`

- [ ] **Step 1.1: Add gradient-dark design tokens to globals.css**

Add these new CSS custom properties and classes AFTER the existing `:root` block (keep all existing vars, add new ones):

```css
/* ── Gradient Dark Design System ─────────────────────── */
:root {
  --glow-emerald: rgba(16,185,129,0.15);
  --glow-cyan: rgba(6,182,212,0.15);
  --glow-violet: rgba(139,92,246,0.15);
  --glow-amber: rgba(245,158,11,0.15);
  --glow-rose: rgba(244,63,94,0.15);
}
```

- [ ] **Step 1.2: Add gradient card classes**

Append to `globals.css`:

```css
/* ── Gradient cards ──────────────────────────────────── */
.gradient-card {
  background: rgba(255,255,255,0.03);
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 16px;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}
.gradient-card:hover {
  background: rgba(255,255,255,0.06);
  border-color: rgba(255,255,255,0.15);
  transform: translateY(-2px);
  box-shadow: 0 8px 32px rgba(0,0,0,0.4);
}

.gradient-card-emerald {
  background: linear-gradient(135deg, rgba(16,185,129,0.12), rgba(255,255,255,0.02));
  border-top: 2px solid #10b981;
}
.gradient-card-emerald:hover { box-shadow: 0 0 30px var(--glow-emerald); }

.gradient-card-cyan {
  background: linear-gradient(135deg, rgba(6,182,212,0.12), rgba(255,255,255,0.02));
  border-top: 2px solid #06b6d4;
}
.gradient-card-cyan:hover { box-shadow: 0 0 30px var(--glow-cyan); }

.gradient-card-violet {
  background: linear-gradient(135deg, rgba(139,92,246,0.12), rgba(255,255,255,0.02));
  border-top: 2px solid #8b5cf6;
}
.gradient-card-violet:hover { box-shadow: 0 0 30px var(--glow-violet); }

.gradient-card-amber {
  background: linear-gradient(135deg, rgba(245,158,11,0.12), rgba(255,255,255,0.02));
  border-top: 2px solid #f59e0b;
}
.gradient-card-amber:hover { box-shadow: 0 0 30px var(--glow-amber); }
```

- [ ] **Step 1.3: Add new animations**

Append to `globals.css` animations section:

```css
@keyframes ad-fadeInUp {
  from { opacity: 0; transform: translateY(12px); }
  to { opacity: 1; transform: translateY(0); }
}
@keyframes ad-shimmer {
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}
@keyframes ad-glowPulse {
  0%, 100% { box-shadow: 0 0 15px rgba(16,185,129,0.1); }
  50% { box-shadow: 0 0 25px rgba(16,185,129,0.25); }
}
@keyframes ad-slideInRight {
  from { opacity: 0; transform: translateX(16px); }
  to { opacity: 1; transform: translateX(0); }
}
@keyframes ad-scaleIn {
  from { opacity: 0; transform: scale(0.95); }
  to { opacity: 1; transform: scale(1); }
}

/* ── Staggered animation utilities ───────────────────── */
.animate-in {
  animation: ad-fadeInUp 0.5s cubic-bezier(0.4, 0, 0.2, 1) both;
}
.delay-1 { animation-delay: 0.05s; }
.delay-2 { animation-delay: 0.1s; }
.delay-3 { animation-delay: 0.15s; }
.delay-4 { animation-delay: 0.2s; }
.delay-5 { animation-delay: 0.25s; }
.delay-6 { animation-delay: 0.3s; }

/* ── Shimmer skeleton ────────────────────────────────── */
.skeleton {
  background: linear-gradient(90deg,
    rgba(255,255,255,0.03) 25%,
    rgba(255,255,255,0.08) 50%,
    rgba(255,255,255,0.03) 75%
  );
  background-size: 200% 100%;
  animation: ad-shimmer 1.5s ease-in-out infinite;
  border-radius: 8px;
}

/* ── Toast notifications ─────────────────────────────── */
@keyframes ad-slideInFromRight {
  from { opacity: 0; transform: translateX(100%); }
  to { opacity: 1; transform: translateX(0); }
}
@keyframes ad-slideOutToRight {
  from { opacity: 1; transform: translateX(0); }
  to { opacity: 0; transform: translateX(100%); }
}
```

- [ ] **Step 1.4: Verify — run dev server**

```bash
cd "C:/Users/Iqra Muzaffar/Desktop/MS-Thesis/Primepal/Resume/Hasnain/upwork/docmind-rag/frontend"
npm run dev
```

Open http://localhost:3000 — no CSS errors in console, background is `#06080d`.

- [ ] **Step 1.5: Commit**

```bash
git add frontend/app/globals.css
git commit -m "feat(ui): add gradient dark design system tokens and animations"
```

---

## Task 2: Sidebar Redesign

**Files:**
- Modify: `frontend/components/layout/Sidebar.tsx`
- Modify: `frontend/app/layout.tsx`

- [ ] **Step 2.1: Rewrite Sidebar.tsx**

Complete rewrite of Sidebar component with branding, active indicators, collapse toggle, and index status footer. Uses localStorage to persist collapsed state.

- [ ] **Step 2.2: Update layout.tsx for sidebar width**

Update the layout to use dynamic sidebar width (240px expanded, 64px collapsed) and pass collapsed state down.

- [ ] **Step 2.3: Verify — test all 3 routes**

Navigate to /, /documents, /chat — verify active indicator highlights correctly, collapse toggle works, state persists on refresh.

- [ ] **Step 2.4: Commit**

```bash
git add frontend/components/layout/Sidebar.tsx frontend/app/layout.tsx
git commit -m "feat(ui): redesign sidebar with branding, active indicators, and collapse"
```

---

## Task 3: Dashboard Page Redesign

**Files:**
- Modify: `frontend/app/page.tsx`
- Modify: `frontend/components/dashboard/StatsCards.tsx`
- Modify: `frontend/components/dashboard/RecentQueries.tsx`
- Modify: `frontend/components/dashboard/DocTypeChart.tsx`

- [ ] **Step 3.1: Rewrite StatsCards.tsx**

4 gradient cards (emerald/cyan/violet/amber) with icons, big numbers, labels, descriptions. Staggered fade-in. Shimmer skeletons during loading.

- [ ] **Step 3.2: Rewrite RecentQueries.tsx**

Glass card list with confidence dots, relative timestamps, empty state with brain icon and link to /chat.

- [ ] **Step 3.3: Rewrite DocTypeChart.tsx**

Cleaner donut chart with emerald/cyan/violet colors, legend items with dots + counts + percentages, empty state.

- [ ] **Step 3.4: Rewrite page.tsx (dashboard)**

New header (title + subtitle, no misleading "last synced" badge). Quick action cards linking to /documents and /chat. Updated grid layout.

- [ ] **Step 3.5: Verify dashboard**

All 4 stat cards with correct data, shimmer during load, chart with correct colors, recent queries with confidence, quick actions link correctly.

- [ ] **Step 3.6: Commit**

```bash
git add frontend/app/page.tsx frontend/components/dashboard/
git commit -m "feat(ui): redesign dashboard with gradient cards, polished chart, quick actions"
```

---

## Task 4: Documents Page Redesign

**Files:**
- Modify: `frontend/app/documents/page.tsx`
- Modify: `frontend/components/documents/UploadZone.tsx`
- Modify: `frontend/components/documents/DocumentTable.tsx`
- Modify: `frontend/components/documents/ChunkViewer.tsx`
- Modify: `frontend/components/documents/DeleteDialog.tsx`
- Create: `frontend/components/ui/Toast.tsx`

- [ ] **Step 4.1: Create Toast component**

Simple toast notification system — success (emerald) and error (rose) variants. Slide-in from right, auto-dismiss after 4s. Uses a context provider so any component can trigger toasts.

- [ ] **Step 4.2: Rewrite UploadZone.tsx**

Glass card, dashed emerald border on drag, cloud upload icon, progress bars during upload, success/error toast triggers.

- [ ] **Step 4.3: Rewrite DocumentTable.tsx with search/filter**

Search input + filter buttons (ALL/PDF/DOCX/TXT). File type icons (colored), chunk count pills, relative dates, action buttons. Empty state.

- [ ] **Step 4.4: Rewrite ChunkViewer.tsx**

Dark glass modal, pagination header, chunk cards with index/page/token badges, monospace text, close button.

- [ ] **Step 4.5: Rewrite DeleteDialog.tsx**

Glass overlay, amber warning icon, clear text, cancel + red delete buttons.

- [ ] **Step 4.6: Update documents/page.tsx**

New header with title + subtitle + document count badge. Wrap with ToastProvider. Wire search/filter state.

- [ ] **Step 4.7: Verify documents page**

Upload via drag-drop, search filters, type filter buttons, chunk viewer pagination, delete with toast, empty states.

- [ ] **Step 4.8: Commit**

```bash
git add frontend/components/ui/Toast.tsx frontend/app/documents/ frontend/components/documents/
git commit -m "feat(ui): redesign documents page with search, filters, toasts"
```

---

## Task 5: Chat Page Redesign

**Files:**
- Create: `frontend/components/chat/WelcomeState.tsx`
- Create: `frontend/components/chat/CopyButton.tsx`
- Modify: `frontend/app/chat/page.tsx`
- Modify: `frontend/components/chat/ChatInput.tsx`
- Modify: `frontend/components/chat/ChatMessages.tsx`
- Modify: `frontend/components/chat/SourcePanel.tsx`
- Modify: `frontend/components/chat/SourceCard.tsx`
- Modify: `frontend/components/chat/ConfidenceBadge.tsx`

- [ ] **Step 5.1: Create WelcomeState.tsx**

Centered layout with AskDocs icon, title, subtitle, 6 example question chips in 2x3 grid. Each chip is a glass card that calls `onSelect(question)` on click. Staggered fade-in.

- [ ] **Step 5.2: Create CopyButton.tsx**

Small icon button, appears on hover. Copies text to clipboard. Shows checkmark for 2s after copy.

- [ ] **Step 5.3: Rewrite ChatInput.tsx**

Larger input (48px), glass background, emerald gradient send button (circle with ArrowUp), "Press Enter to send" hint, disabled state during streaming.

- [ ] **Step 5.4: Rewrite ChatMessages.tsx with clickable citations**

User messages (right-aligned emerald gradient), AI messages (left-aligned glass with AskDocs icon). Streaming dots animation. Parse `[Source: X, p.Y]` citations as clickable cyan spans that call `onCitationClick(documentName, pageNumber)`. CopyButton on AI messages.

- [ ] **Step 5.5: Rewrite SourcePanel.tsx**

Header with "Sources" + count badge, collapsible, source cards stack. Empty state message.

- [ ] **Step 5.6: Rewrite SourceCard.tsx**

Glass card with left emerald→cyan border. File icon + doc name + page pill. Relevance bar (gradient fill). Expandable text preview. Highlight flash animation when citation clicked (via ref).

- [ ] **Step 5.7: Rewrite ConfidenceBadge.tsx as ring/meter**

SVG circle with arc fill showing percentage. Green >80%, yellow 50-80%, red <50%. Number in center.

- [ ] **Step 5.8: Rewrite chat/page.tsx**

Welcome state shown when no messages. Segmented layout toggle (Split/Focus). Wire citation click to scroll-to-source. New Chat button in header.

- [ ] **Step 5.9: Verify chat page**

Welcome state → click example question → auto-sends → streaming with dots → answer with clickable citations → click citation scrolls to source → copy button works → New Chat resets → layout toggle works.

- [ ] **Step 5.10: Commit**

```bash
git add frontend/components/chat/ frontend/app/chat/
git commit -m "feat(ui): redesign chat with welcome state, clickable citations, confidence ring"
```

---

## Task 6: Responsive Design

**Files:**
- Modify: `frontend/components/layout/Sidebar.tsx`
- Modify: `frontend/app/layout.tsx`
- Modify: `frontend/app/page.tsx`
- Modify: `frontend/app/documents/page.tsx`
- Modify: `frontend/app/chat/page.tsx`

- [ ] **Step 6.1: Add responsive sidebar (hamburger on mobile)**

`>=1024px`: full sidebar. `768-1023px`: collapsed icons-only. `<768px`: hidden + hamburger button in top bar + slide-out overlay on click.

- [ ] **Step 6.2: Dashboard responsive grids**

Stat cards: 4→2→1 columns. Bottom panels: side-by-side → stacked. Quick actions: 2→1.

- [ ] **Step 6.3: Documents responsive**

Table wraps in horizontal scroll on small screens. Upload zone reduced padding. Chunk viewer modal full-screen on mobile.

- [ ] **Step 6.4: Chat responsive**

Split layout stacks vertically on <1024px. Sources panel becomes collapsible bottom drawer. Messages max-width 90% on mobile.

- [ ] **Step 6.5: Verify at 1440px, 1024px, 768px, 375px**

All 3 pages render correctly at each breakpoint. No horizontal overflow. Sidebar behavior correct.

- [ ] **Step 6.6: Commit**

```bash
git add frontend/
git commit -m "feat(ui): add responsive design for tablet and mobile"
```

---

## Task 7: Multi-Turn Conversations

**Files:**
- Modify: `backend/app/models/schemas.py`
- Modify: `backend/app/routers/chat.py`
- Modify: `backend/app/services/retrieval.py`
- Modify: `backend/app/services/llm_client.py`
- Modify: `frontend/lib/api.ts`
- Modify: `frontend/lib/useChat.ts`

- [ ] **Step 7.1: Update ChatRequest schema — add conversation_history**

Add optional field `conversation_history: list[dict] = Field(default_factory=list)` to ChatRequest. Each dict has `role` (str) and `content` (str).

- [ ] **Step 7.2: Update llm_client — accept messages array**

Change `generate_stream()` to accept `messages: list[dict]` instead of single `user_message` string. Build the messages array with system prompt + history + current message. Update both OpenAI and Anthropic providers.

- [ ] **Step 7.3: Update retrieval.py — pass history through**

`retrieve_and_answer()` accepts `conversation_history` parameter. Builds messages array: history messages + current question with context. Passes to `generate_stream()`.

- [ ] **Step 7.4: Update chat router — extract and pass history**

Pass `request.conversation_history` to `retrieve_and_answer()`.

- [ ] **Step 7.5: Update frontend api.ts — send conversation_history**

Update `chatStream()` to accept and send `conversation_history` array.

- [ ] **Step 7.6: Update useChat hook — maintain and send history**

On each send, include last 5 user/assistant message pairs as conversation_history. Add `resetChat()` function to clear messages.

- [ ] **Step 7.7: Verify multi-turn**

Ask "What is an LLC?" → follow up "What are the tax benefits?" → context maintained. Click "New Chat" → resets.

- [ ] **Step 7.8: Commit**

```bash
git add backend/app/models/schemas.py backend/app/routers/chat.py backend/app/services/retrieval.py backend/app/services/llm_client.py frontend/lib/api.ts frontend/lib/useChat.ts
git commit -m "feat: add multi-turn conversation support with context memory"
```

---

## Task 8: Conversation History (localStorage)

**Files:**
- Create: `frontend/lib/conversationStore.ts`
- Modify: `frontend/components/layout/Sidebar.tsx`
- Modify: `frontend/app/chat/page.tsx`
- Modify: `frontend/lib/useChat.ts`

- [ ] **Step 8.1: Create conversationStore.ts**

localStorage-based store. Functions: `saveConversation(id, title, messages, sources)`, `loadConversation(id)`, `listConversations()`, `deleteConversation(id)`. Auto-title from first user message (first 50 chars). Max 30 conversations.

- [ ] **Step 8.2: Update useChat to auto-save**

On each new message, save to conversationStore. Expose `conversationId`, `loadConversation(id)`, `resetChat()`.

- [ ] **Step 8.3: Add conversation list to Sidebar**

"Recent Chats" section below nav items. List of conversation titles (truncated), most recent first. Click → navigate to /chat and load. Delete button (X) on hover. Max 8 shown.

- [ ] **Step 8.4: Wire chat page to load conversations**

URL param or state-based loading. When conversation clicked in sidebar, chat page loads messages and sources from store.

- [ ] **Step 8.5: Verify conversation history**

Send messages → refresh page → conversation in sidebar → click → loads correctly → delete → removed.

- [ ] **Step 8.6: Commit**

```bash
git add frontend/lib/conversationStore.ts frontend/components/layout/Sidebar.tsx frontend/app/chat/page.tsx frontend/lib/useChat.ts
git commit -m "feat: add conversation history with localStorage persistence"
```

---

## Task 9: Persistent Stats (SQLite)

**Files:**
- Create: `backend/app/services/stats_db.py`
- Modify: `backend/app/routers/stats.py`
- Modify: `backend/app/routers/chat.py`
- Modify: `backend/requirements.txt`

- [ ] **Step 9.1: Add aiosqlite to requirements.txt**

Append `aiosqlite>=0.20.0` to requirements.txt.

- [ ] **Step 9.2: Create stats_db.py**

SQLite file at `backend/data/stats.db`. Table: `queries(id INTEGER PRIMARY KEY AUTOINCREMENT, question TEXT, confidence REAL, retrieval_time_ms REAL, sources_count INTEGER, created_at TEXT DEFAULT (datetime('now')))`. Functions: `async init_db()`, `async log_query(question, confidence, retrieval_time_ms, sources_count)`, `async get_recent_queries(limit=10)`, `async get_stats_summary()`.

- [ ] **Step 9.3: Update chat router to log to SQLite**

After streaming completes (in metadata event), call `await stats_db.log_query()`. Keep in-memory `record_query()` as fallback.

- [ ] **Step 9.4: Update stats router to read from SQLite**

`get_stats()` reads query metrics from SQLite instead of in-memory lists. Document/chunk counts still from ChromaDB.

- [ ] **Step 9.5: Initialize DB on startup**

Call `await stats_db.init_db()` in `main.py` lifespan startup.

- [ ] **Step 9.6: Verify persistent stats**

Send 3 queries → restart backend → GET /api/stats → queries still counted. Check `backend/data/stats.db` exists.

- [ ] **Step 9.7: Commit**

```bash
git add backend/app/services/stats_db.py backend/app/routers/stats.py backend/app/routers/chat.py backend/requirements.txt backend/app/main.py
git commit -m "feat: add persistent query stats with SQLite"
```

---

## Task 10: Input Validation & Error Handling

**Files:**
- Modify: `backend/app/models/schemas.py`
- Modify: `backend/app/routers/documents.py`
- Modify: `backend/app/services/llm_client.py`
- Modify: `backend/app/main.py`
- Modify: `frontend/components/chat/ChatMessages.tsx`

- [ ] **Step 10.1: Tighten ChatRequest validation**

Add `max_length=2000` to `question` field. Add `min_length=2`. Strip whitespace with a validator.

- [ ] **Step 10.2: Add document upload limits**

Max 10 files per request — return 400 if exceeded. Check for 0-byte files. Validate content-type header matches extension.

- [ ] **Step 10.3: Add LLM timeout handling**

Wrap LLM API calls in `asyncio.wait_for(timeout=30)`. On timeout, retry once with 45s timeout. On second failure, yield error event: `{"type": "error", "data": "AI service temporarily unavailable"}`.

- [ ] **Step 10.4: Add global exception handler**

FastAPI `@app.exception_handler(Exception)` returning structured JSON: `{"detail": "Internal server error", "request_id": uuid4()}`. Log full traceback.

- [ ] **Step 10.5: Handle error events in frontend**

In ChatMessages, if AI message starts with "Error:", render with red border + rose background + "Try again" text.

- [ ] **Step 10.6: Verify error handling**

Send >2000 char question → 400. Upload 11 files → 400. Upload 0-byte file → error message.

- [ ] **Step 10.7: Commit**

```bash
git add backend/ frontend/components/chat/ChatMessages.tsx
git commit -m "feat: add input validation, LLM timeout handling, global error handler"
```

---

## Final: Full Integration Verification

- [ ] **Fresh Docker start → demo docs auto-load**
- [ ] **Dashboard: gradient cards, chart, recent queries, quick actions**
- [ ] **Documents: upload, search, filter, chunk viewer, delete with toast**
- [ ] **Chat: welcome state → example question → streaming → clickable citations → copy**
- [ ] **Multi-turn: follow-up questions maintain context**
- [ ] **Conversation history: saved, loaded from sidebar, deletable**
- [ ] **Responsive: works at 1440/1024/768/375px**
- [ ] **Stats persist across backend restart**
- [ ] **Error handling: validation errors show clearly**
