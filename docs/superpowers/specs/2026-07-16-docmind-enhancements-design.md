# DocMind RAG — Full Enhancement Design Spec

> **Goal:** Transform AskDocs from functional demo into a production-grade, visually stunning portfolio project that wins Upwork contracts.
> **Design Direction:** Gradient Dark — bold gradients, glow shadows, vibrant emerald/cyan/violet palette.
> **Priority:** UI polish (70%) > Feature additions (20%) > Backend hardening (10%)
> **Date:** 2026-07-16

---

## Table of Contents

1. [Feature 1: Global Design System](#feature-1-global-design-system)
2. [Feature 2: Sidebar Redesign](#feature-2-sidebar-redesign)
3. [Feature 3: Dashboard Page Redesign](#feature-3-dashboard-page-redesign)
4. [Feature 4: Documents Page Redesign](#feature-4-documents-page-redesign)
5. [Feature 5: Chat Page Redesign](#feature-5-chat-page-redesign)
6. [Feature 6: Responsive Design](#feature-6-responsive-design)
7. [Feature 7: Multi-Turn Conversations](#feature-7-multi-turn-conversations)
8. [Feature 8: Conversation History](#feature-8-conversation-history)
9. [Feature 9: Persistent Stats (SQLite)](#feature-9-persistent-stats-sqlite)
10. [Feature 10: Input Validation & Error Handling](#feature-10-input-validation--error-handling)
11. [Feature 11: Ollama Local LLM Support](#feature-11-ollama-local-llm-support)
12. [Implementation Order](#implementation-order)
13. [Testing Strategy](#testing-strategy)

---

## Feature 1: Global Design System

**Purpose:** Establish the gradient dark design tokens, reusable CSS classes, and animation library that every component will use.

**Files to modify:**
- `frontend/app/globals.css` — design tokens, utility classes, animations
- `frontend/tailwind.config.ts` — create if missing, extend theme

### Step 1.1: Define CSS custom properties (color palette)
Add to `globals.css` `:root` block:
```
--bg-primary: #0f0f23       (page background)
--bg-card: rgba(255,255,255,0.03)
--bg-card-hover: rgba(255,255,255,0.06)
--border-subtle: rgba(255,255,255,0.06)
--border-card: rgba(255,255,255,0.1)
--border-hover: rgba(255,255,255,0.15)
--text-primary: #f1f5f9     (slate-100)
--text-secondary: #94a3b8   (slate-400)
--text-muted: #64748b       (slate-500)
--accent-emerald: #10b981
--accent-cyan: #06b6d4
--accent-violet: #8b5cf6
--accent-amber: #f59e0b
--accent-rose: #f43f5e
--glow-emerald: rgba(16,185,129,0.15)
--glow-cyan: rgba(6,182,212,0.15)
--glow-violet: rgba(139,92,246,0.15)
--glow-amber: rgba(245,158,11,0.15)
--radius-sm: 8px
--radius-md: 12px
--radius-lg: 16px
```

### Step 1.2: Create gradient card base classes
Add `.glass-card` class:
- `background: var(--bg-card)`
- `border: 1px solid var(--border-card)`
- `border-radius: var(--radius-md)`
- `transition: all 0.3s ease`
- On hover: `background: var(--bg-card-hover)`, `border-color: var(--border-hover)`, `transform: translateY(-2px)`, `box-shadow: 0 8px 32px rgba(0,0,0,0.3)`

Add `.gradient-card-emerald`, `.gradient-card-cyan`, `.gradient-card-violet`, `.gradient-card-amber`:
- Each applies `background: linear-gradient(135deg, <glow-color>, var(--bg-card))`
- Each applies matching `border-top: 2px solid <accent-color>`
- Each applies `box-shadow: 0 0 20px <glow-color>` on hover

### Step 1.3: Create animation keyframes
- `@keyframes fadeInUp`: opacity 0→1, translateY(10px→0), duration 0.5s
- `@keyframes shimmer`: background-position slide for skeleton loaders
- `@keyframes glow-pulse`: box-shadow opacity 0.1→0.3→0.1, for active elements
- `@keyframes slideInRight`: translateX(20px→0), opacity 0→1
- `@keyframes scaleIn`: scale(0.95→1), opacity 0→1

### Step 1.4: Create staggered animation utility
- `.animate-in` class: applies `fadeInUp` with `animation-fill-mode: both`
- `.delay-1` through `.delay-6`: `animation-delay: 0.05s, 0.1s, 0.15s, 0.2s, 0.25s, 0.3s`

### Step 1.5: Create shimmer skeleton component
- `.skeleton` class: gray gradient background with `shimmer` animation
- `.skeleton-text`: height 16px, border-radius 4px, width variations (100%, 80%, 60%)
- `.skeleton-card`: full card placeholder with skeleton children

### Step 1.6: Create tailwind.config.ts
- Extend colors with emerald, cyan, violet, amber accent shades
- Extend animation with custom keyframes
- Extend boxShadow with glow variants
- Extend backgroundImage with gradient presets

### Step 1.7: Test — verify globals load
- Run `npm run dev`, check that no CSS errors in console
- Verify background color changed to `#0f0f23`
- Verify `.glass-card` hover effect works on any element

---

## Feature 2: Sidebar Redesign

**Purpose:** Premium sidebar with branding, active indicators, and collapse capability.

**Files to modify:**
- `frontend/components/layout/Sidebar.tsx`
- `frontend/app/layout.tsx` (sidebar width, responsive logic)

### Step 2.1: Add AskDocs branding header
- Logo area: gradient text "AskDocs" + sparkle/brain icon from lucide-react
- Subtitle: "Enterprise RAG" badge in small emerald pill
- Bottom border: subtle gradient line (emerald → cyan)

### Step 2.2: Redesign nav items
- Each nav item: icon + label, padding 10px 16px, border-radius 8px
- Default: transparent bg, `--text-secondary` color
- Hover: `bg: rgba(255,255,255,0.05)`, text lightens
- Active: left 3px emerald bar, `bg: linear-gradient(90deg, rgba(16,185,129,0.1), transparent)`, `--text-primary` color, icon turns emerald

### Step 2.3: Add index status footer
- Show: "X documents indexed" with green dot indicator
- Fetch count from stats API on mount
- Subtle top border, muted text

### Step 2.4: Add sidebar collapse toggle
- Small chevron button at bottom of sidebar
- Collapsed state: sidebar width 60px, show only icons (no labels)
- Store collapsed state in localStorage
- Smooth width transition (0.3s ease)

### Step 2.5: Test sidebar
- Verify active route highlighting works on all 3 pages
- Verify collapse/expand toggles and persists on refresh
- Verify branding renders correctly

---

## Feature 3: Dashboard Page Redesign

**Purpose:** Impressive landing page with gradient stat cards, polished charts, and quick actions.

**Files to modify:**
- `frontend/app/page.tsx`
- `frontend/components/dashboard/StatsCards.tsx`
- `frontend/components/dashboard/RecentQueries.tsx`
- `frontend/components/dashboard/DocTypeChart.tsx`

### Step 3.1: Redesign StatsCards component
- 4 cards in a row, each with a different gradient:
  - Documents: emerald gradient, FileText icon
  - Total Chunks: cyan gradient, Layers icon
  - Queries: violet gradient, MessageSquare icon
  - Avg Confidence: amber gradient, TrendingUp icon
- Each card: gradient background, colored top border, glow shadow on hover
- Big number: font-size 36px, font-weight 700, white
- Label: uppercase, 11px, colored to match accent
- Description line: muted text, small
- Apply staggered fade-in animation (delay-1 through delay-4)

### Step 3.2: Add shimmer skeleton loading state
- Replace current pulse skeleton with shimmer skeletons
- 4 skeleton cards matching exact card dimensions
- Skeleton for chart area
- Skeleton for recent queries list

### Step 3.3: Redesign RecentQueries component
- Section header: "Recent Queries" with count badge
- Each query row: glass card style, question text, confidence badge, timestamp
- Confidence badge: colored dot (green/yellow/red) + percentage
- Hover: subtle background shift + left emerald border appears
- Empty state: brain icon + "No queries yet. Try asking a question!" + link to /chat
- Max 10 items shown

### Step 3.4: Redesign DocTypeChart component
- Glass card container with "Document Types" header
- Replace current donut with cleaner implementation
- Legend items: colored dot + type name + count + percentage
- Use emerald (PDF), cyan (DOCX), violet (TXT) colors
- Empty state: folder icon + "No documents uploaded yet"

### Step 3.5: Add Quick Actions section
- Row of 2 action cards below stats:
  - "Upload Documents" — Upload icon, emerald gradient border, links to /documents
  - "Ask a Question" — MessageSquare icon, cyan gradient border, links to /chat
- Each card: glass background, icon + title + subtitle, hover glow effect

### Step 3.6: Redesign page header
- "Dashboard" title: large, bold, white
- Subtitle: "Your knowledge base at a glance"
- Remove the "Last synced 2 min ago" badge (misleading since not real-time)

### Step 3.7: Test dashboard
- Verify all 4 stat cards render with correct data
- Verify shimmer skeletons show during load
- Verify chart renders with correct colors
- Verify recent queries display and link to chat
- Verify quick action cards link to correct pages
- Verify staggered animation plays on page load

---

## Feature 4: Documents Page Redesign

**Purpose:** Professional document management with search, file type icons, and polished upload experience.

**Files to modify:**
- `frontend/app/documents/page.tsx`
- `frontend/components/documents/UploadZone.tsx`
- `frontend/components/documents/DocumentTable.tsx`
- `frontend/components/documents/ChunkViewer.tsx`
- `frontend/components/documents/DeleteDialog.tsx`

### Step 4.1: Redesign page header
- "Documents" title + "Manage your knowledge base" subtitle
- Upload button in header (secondary to the upload zone)
- Document count badge

### Step 4.2: Redesign UploadZone
- Glass card with dashed border (emerald dashed on drag-over)
- Center: Upload cloud icon (48px), "Drop files here or click to browse"
- Supported formats badge: "PDF, DOCX, TXT up to 20MB"
- On drag-over: border goes solid emerald, background gets emerald glow, icon animates up
- Upload progress: file name + animated progress bar (emerald gradient fill)
- Success state: green check + "X files uploaded successfully" + fade out after 3s
- Error state: red border + error message

### Step 4.3: Add search/filter bar
- Search input: glass background, search icon, placeholder "Search documents..."
- Filter toggle buttons: ALL | PDF | DOCX | TXT
- Active filter: emerald background pill
- Place between upload zone and table

### Step 4.4: Redesign DocumentTable
- Glass card container
- Table header: muted uppercase labels, sticky
- Each row: glass hover effect
- File type badges: PDF (rose gradient), DOCX (blue gradient), TXT (slate gradient)
- File icon: colored to match type
- Chunk count: pill badge
- File size: formatted (KB/MB)
- Upload date: relative time ("2 hours ago")
- Actions: "View Chunks" button (ghost) + "Delete" button (ghost red)
- Empty state: folder icon + "No documents yet. Upload your first document above."

### Step 4.5: Redesign ChunkViewer modal
- Dark overlay with glass modal
- Header: document name + type badge + total chunks count
- Pagination: "Chunk 1-20 of 156" + prev/next buttons
- Each chunk card: glass background, chunk index badge (emerald), page number badge (cyan), token count (muted)
- Chunk text: monospace font, good line-height, max-height with scroll
- Close button: X in top right

### Step 4.6: Redesign DeleteDialog
- Glass overlay + centered card
- Warning icon (amber)
- "Delete Document?" title
- "This will permanently remove X and all Y chunks."
- Cancel (ghost) + Delete (red gradient) buttons

### Step 4.7: Add toast notifications
- Create a simple toast component (no external library)
- Show on: upload success (green), upload error (red), delete success (green)
- Position: bottom-right, slide-in from right
- Auto-dismiss after 4 seconds
- Emerald border for success, rose border for error

### Step 4.8: Test documents page
- Verify search filters documents in real-time
- Verify type filter buttons work
- Verify upload with drag-drop and click-to-browse
- Verify progress bar animates during upload
- Verify chunk viewer shows correct paginated data
- Verify delete dialog and toast notifications work
- Verify empty states render correctly

---

## Feature 5: Chat Page Redesign

**Purpose:** The most important page — where the AI magic happens. Must be stunning.

**Files to modify:**
- `frontend/app/chat/page.tsx`
- `frontend/components/chat/ChatInput.tsx`
- `frontend/components/chat/ChatMessages.tsx`
- `frontend/components/chat/SourcePanel.tsx`
- `frontend/components/chat/SourceCard.tsx`
- `frontend/components/chat/ConfidenceBadge.tsx`
- `frontend/lib/useChat.ts` (for multi-turn, done in Feature 7)
- New: `frontend/components/chat/WelcomeState.tsx`
- New: `frontend/components/chat/CopyButton.tsx`

### Step 5.1: Create WelcomeState component
- Centered layout: AskDocs icon (large, gradient), "Ask anything about your documents" title
- Subtitle: "AI-powered answers with citations and confidence scores"
- 6 example question chips in a 2x3 grid:
  - "What are the steps to form an LLC?"
  - "How do I get an EIN from the IRS?"
  - "What is a registered agent?"
  - "Compare sole proprietorship vs LLC"
  - "What licenses do I need for a business?"
  - "Explain business compliance requirements"
- Each chip: glass card, cursor pointer, on click → fills input and auto-sends
- Staggered fade-in animation on chips

### Step 5.2: Redesign ChatInput
- Sticky bottom bar: glass background, 1px top border
- Input: larger (48px height), glass background, rounded-xl
- Send button: emerald gradient circle, arrow-up icon, disabled state (gray)
- Keyboard hint: small muted "Press Enter to send" below input
- When streaming: show "Thinking..." with animated dots, input disabled

### Step 5.3: Redesign ChatMessages — user messages
- Right-aligned, emerald gradient background
- Rounded corners: top-left + bottom-left + top-right rounded, bottom-right sharp
- White text, max-width 70%
- Subtle slide-in-from-right animation

### Step 5.4: Redesign ChatMessages — AI messages
- Left-aligned, glass card background
- AskDocs mini icon on left
- Rounded corners: top-right + bottom-right + bottom-left rounded, top-left sharp
- Rendered markdown (bold, code blocks, lists)
- Max-width 80%
- Confidence badge inline at top-right of message
- Slide-in-from-left animation

### Step 5.5: Streaming indicator
- While streaming: show animated gradient bar below AI message area
- Three animated dots (emerald → cyan → violet, cycling)
- Text: "Analyzing sources..." → "Generating answer..."

### Step 5.6: Make citations clickable
- Parse `[Source: filename, p.X]` in AI response text
- Render as cyan underlined clickable spans
- On click: find matching source card in SourcePanel, scroll to it, flash highlight (emerald border pulse 2x)
- If source panel is hidden (focus mode): open it and scroll

### Step 5.7: Create CopyButton component
- Small copy icon button, appears on hover over AI messages
- On click: copy message text to clipboard
- Show checkmark icon for 2 seconds after copy
- Position: top-right corner of AI message bubble

### Step 5.8: Redesign SourcePanel
- Header: "Sources" + count badge (emerald pill)
- Toggle button to collapse panel (chevron)
- Source cards in vertical stack with gap
- Empty state: "Sources will appear here after you ask a question"

### Step 5.9: Redesign SourceCard
- Glass card with left colored border (gradient: emerald → cyan)
- Header: file icon + document name + page badge ("p.3" in cyan pill)
- Relevance score: horizontal bar with gradient fill (red→yellow→green based on score)
- Text preview: 3 lines clamped, expandable on click
- Expanded: full text with monospace style, "Show less" toggle
- Hover: subtle glow effect

### Step 5.10: Redesign ConfidenceBadge
- Ring/meter style instead of plain pill:
  - Small circle with arc fill (SVG) showing percentage
  - Green (>80%), yellow (50-80%), red (<50%)
  - Percentage number in center
- Tooltip on hover showing "Confidence: X%"

### Step 5.11: Redesign layout toggle
- Replace current toggle buttons with segmented control
- Two segments: "Split View" (icon) | "Focus" (icon)
- Active segment: emerald background
- Glass container

### Step 5.12: Test chat page
- Verify welcome state shows on first visit
- Verify example questions auto-fill and send on click
- Verify welcome state disappears after first message
- Verify user/AI message styling
- Verify streaming dots animation during generation
- Verify citations are clickable and scroll to source
- Verify copy button works
- Verify source cards expand/collapse
- Verify confidence ring renders correctly
- Verify layout toggle switches views
- Verify responsive behavior

---

## Feature 6: Responsive Design

**Purpose:** Make every page work on tablet and mobile.

**Files to modify:**
- `frontend/components/layout/Sidebar.tsx`
- `frontend/app/layout.tsx`
- All page files and components (media query adjustments)

### Step 6.1: Responsive sidebar
- `>1024px`: full sidebar (240px)
- `768-1024px`: collapsed sidebar (icons only, 60px)
- `<768px`: hidden sidebar, hamburger menu button in top-left, slide-out overlay

### Step 6.2: Mobile hamburger menu
- Create hamburger icon button (3 lines)
- On click: slide sidebar from left over content (overlay)
- Click outside or X button to close
- Backdrop: dark overlay

### Step 6.3: Dashboard responsive
- Stat cards: 4-col → 2-col (`<1024px`) → 1-col (`<640px`)
- Bottom panels: side-by-side → stacked (`<1024px`)
- Quick action cards: 2-col → 1-col (`<640px`)

### Step 6.4: Documents responsive
- Search/filter: stack vertically on mobile
- Table: horizontal scroll wrapper on `<768px`
- Upload zone: reduce padding on mobile
- Chunk viewer modal: full-screen on mobile

### Step 6.5: Chat responsive
- Split layout → stacked on `<1024px`
- Sources panel: collapsible drawer from bottom on mobile
- Input bar: full width, reduced padding
- Messages: max-width 90% on mobile (instead of 70/80%)

### Step 6.6: Test responsive
- Test all 3 pages at: 1440px, 1024px, 768px, 375px
- Verify sidebar behavior at each breakpoint
- Verify no horizontal overflow
- Verify touch targets are minimum 44px on mobile

---

## Feature 7: Multi-Turn Conversations

**Purpose:** Allow follow-up questions that reference previous context.

**Files to modify:**
- `frontend/lib/useChat.ts` — send conversation history
- `frontend/lib/api.ts` — update ChatRequest type
- `backend/app/models/schemas.py` — add conversation_history field
- `backend/app/routers/chat.py` — pass history to retrieval
- `backend/app/services/retrieval.py` — include history in LLM prompt
- `backend/app/services/llm_client.py` — accept messages array

### Step 7.1: Update backend schema
- Add `conversation_history` field to `ChatRequest`: `list[dict]` with `role` and `content`
- Optional field, defaults to empty list
- Max 10 messages in history (truncate oldest)

### Step 7.2: Update LLM client
- Change `generate_stream()` to accept `messages: list[dict]` instead of single prompt
- Build messages array: system prompt + conversation_history + current question with context
- Support for both OpenAI and Anthropic message formats

### Step 7.3: Update retrieval service
- `retrieve_and_answer()` accepts `conversation_history` parameter
- Passes history to `generate_stream()`
- Context (retrieved chunks) is still added to the latest user message only

### Step 7.4: Update chat router
- Extract `conversation_history` from request body
- Pass to `retrieve_and_answer()`

### Step 7.5: Update frontend useChat hook
- Maintain `messages` array in state (already exists)
- On each send: include last 5 user/assistant message pairs as `conversation_history`
- Format: `[{role: "user", content: "..."}, {role: "assistant", content: "..."}]`

### Step 7.6: Add "New Conversation" button
- Button in chat header: refresh icon + "New Chat"
- Clears messages array, resets to welcome state
- Glass button style with emerald border

### Step 7.7: Test multi-turn
- Ask "What is an LLC?" → get answer
- Follow up "What are the tax benefits?" → should reference LLC context
- Follow up "Compare it to sole proprietorship" → should maintain thread
- Click "New Chat" → should reset to welcome state
- Verify max 10 messages truncation works

---

## Feature 8: Conversation History

**Purpose:** Save and resume previous conversations from localStorage.

**Files to modify:**
- New: `frontend/lib/conversationStore.ts`
- `frontend/components/layout/Sidebar.tsx` — conversation list
- `frontend/app/chat/page.tsx` — load/save conversations
- `frontend/lib/useChat.ts` — persist on each message

### Step 8.1: Create conversationStore utility
- `localStorage` key: `askdocs_conversations`
- Data structure: `{id, title, messages[], sources[], createdAt, updatedAt}`
- Functions: `saveConversation()`, `loadConversation(id)`, `listConversations()`, `deleteConversation(id)`, `clearAll()`
- Auto-generate title from first user message (first 50 chars)
- Max 50 conversations stored (delete oldest)

### Step 8.2: Add conversation list to sidebar
- New section in sidebar below nav items: "Recent Chats"
- List of conversation titles (truncated), most recent first
- Each item: message icon + title + relative time
- Click → loads conversation in chat page
- Delete button (X) on hover
- Max 10 shown, "View all" link if more

### Step 8.3: Auto-save conversations
- On each new message (user or AI), save to localStorage
- Generate/update title from first user message
- Update `updatedAt` timestamp

### Step 8.4: Load conversation on click
- When user clicks a conversation in sidebar:
  - Navigate to /chat if not already there
  - Load messages and sources from store
  - Display in chat interface
  - Continue from where left off (multi-turn still works)

### Step 8.5: Test conversation history
- Send a few messages → verify saved to localStorage
- Refresh page → verify conversation list in sidebar
- Click conversation → verify loads correctly
- Delete conversation → verify removed
- Verify max 50 limit works

---

## Feature 9: Persistent Stats (SQLite)

**Purpose:** Query analytics that survive backend restarts.

**Files to modify:**
- New: `backend/app/services/stats_db.py`
- `backend/app/routers/stats.py` — use SQLite instead of in-memory
- `backend/app/routers/chat.py` — log queries to SQLite
- `backend/requirements.txt` — add aiosqlite

### Step 9.1: Create stats_db service
- SQLite file: `backend/data/stats.db`
- Table: `queries(id INTEGER PRIMARY KEY, question TEXT, confidence REAL, retrieval_time_ms INTEGER, sources_count INTEGER, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`
- Functions: `log_query()`, `get_recent_queries(limit)`, `get_stats_summary()`, `get_confidence_trend(days)`
- Use `aiosqlite` for async SQLite access
- Auto-create table on first use

### Step 9.2: Log queries from chat router
- After streaming completes, call `log_query()` with question, confidence, retrieval_time, sources_count
- Fire-and-forget (don't block response)

### Step 9.3: Update stats router
- `/api/stats` now queries SQLite for: total_queries, avg_confidence, avg_retrieval_time, recent_queries
- Document/chunk counts still come from ChromaDB (no change)
- Add new endpoint: `GET /api/stats/trend` → confidence + query count per day (last 30 days)

### Step 9.4: Test persistent stats
- Send 5 queries → verify stats.db file created
- Restart backend → verify stats survive
- Check `/api/stats` returns correct counts
- Check `/api/stats/trend` returns daily data

---

## Feature 10: Input Validation & Error Handling

**Purpose:** Production-grade request validation and error recovery.

**Files to modify:**
- `backend/app/routers/chat.py` — input validation
- `backend/app/routers/documents.py` — validation improvements
- `backend/app/services/llm_client.py` — timeout + retry
- `backend/app/main.py` — global exception handler

### Step 10.1: Chat input validation
- Max question length: 2000 characters (return 400 if exceeded)
- Min question length: 2 characters
- Strip whitespace before validation
- Return clear error message: `{"detail": "Question must be between 2 and 2000 characters"}`

### Step 10.2: Document upload validation improvements
- Check file extension AND content-type header
- Check for empty file content (0 bytes)
- Max 10 files per upload request
- Return specific error per file (not generic)

### Step 10.3: LLM timeout and retry
- Add 30-second timeout on LLM API calls
- On timeout: retry once with 45-second timeout
- On second failure: yield error event in SSE stream: `event: error\ndata: {"message": "AI service temporarily unavailable"}`
- Frontend: show error message in chat instead of hanging

### Step 10.4: Global exception handler
- Add FastAPI exception handler for unhandled errors
- Return structured JSON: `{"detail": "Internal server error", "request_id": "<uuid>"}`
- Log full traceback with request_id for debugging

### Step 10.5: Frontend error display
- Chat errors: show red-bordered glass card with error message + "Try again" button
- Upload errors: show per-file error in upload zone
- Network errors: show banner at top of page with retry option

### Step 10.6: Test error handling
- Send question >2000 chars → verify 400 response
- Send empty question → verify 400 response
- Upload empty file → verify error message
- Upload 11 files → verify limit error
- Simulate LLM timeout → verify error event in chat

---

## Feature 11: Ollama Local LLM Support

**Purpose:** Zero-cost, fully offline RAG — powerful differentiator.

**Files to modify:**
- `backend/app/config.py` — add Ollama settings
- `backend/app/services/llm_client.py` — add Ollama provider
- `frontend/app/page.tsx` — show LLM provider in dashboard
- `docker-compose.yml` — optional Ollama service

### Step 11.1: Add Ollama config
- New env vars: `OLLAMA_BASE_URL` (default: http://localhost:11434), `OLLAMA_MODEL` (default: llama3.2)
- `LLM_PROVIDER=ollama` to activate
- Add to `.env.example`

### Step 11.2: Add Ollama streaming client
- Use Ollama's OpenAI-compatible API: `POST /v1/chat/completions`
- Same message format as OpenAI (system + user messages)
- Stream response with `stream: true`
- Parse SSE chunks same as OpenAI format
- Fallback: if Ollama not running, return clear error

### Step 11.3: Add Ollama to docker-compose (optional)
- New service `ollama` with `ollama/ollama` image
- Volume for model storage
- Commented out by default (user opts in)
- Init script to pull default model

### Step 11.4: Show LLM provider in dashboard
- Add a small "Powered by" indicator in dashboard header
- Shows: "OpenAI GPT-4o-mini" or "Anthropic Claude" or "Ollama Llama 3.2 (Local)"
- Green dot = connected, red dot = error

### Step 11.5: Test Ollama
- Set `LLM_PROVIDER=ollama` in .env
- Start Ollama locally with llama3.2
- Ask a question → verify streaming works
- Verify citations still work with local model
- Test with Ollama not running → verify error message

---

## Implementation Order

Execute features in this exact order. Each feature is fully completed and tested before moving to the next.

```
Feature 1  → Global Design System (foundation for everything)
Feature 2  → Sidebar Redesign
Feature 3  → Dashboard Page Redesign
Feature 4  → Documents Page Redesign
Feature 5  → Chat Page Redesign (biggest feature)
Feature 6  → Responsive Design
Feature 7  → Multi-Turn Conversations
Feature 8  → Conversation History
Feature 9  → Persistent Stats
Feature 10 → Input Validation & Error Handling
Feature 11 → Ollama Local LLM Support
```

**Total estimated steps:** 65 micro-steps across 11 features.

---

## Testing Strategy

### Per-Feature Testing
After each feature is implemented:
1. Visual check — does it look right?
2. Functional check — does it work as specified?
3. Edge cases — empty states, errors, loading states
4. No regressions — did existing features break?

### Full Integration Test (After All Features)
1. Fresh Docker start → demo docs auto-load
2. Dashboard shows correct stats with gradient cards
3. Upload 3 new documents (1 PDF, 1 DOCX, 1 TXT) → toasts appear
4. Search/filter documents → works correctly
5. View chunks → paginated modal works
6. Delete a document → toast + stats update
7. Go to chat → welcome state with example questions
8. Click example question → auto-sends, streaming answer
9. Ask follow-up question → multi-turn context works
10. Click citation → source card highlights
11. Copy AI response → clipboard works
12. Check sidebar → conversation saved
13. Click "New Chat" → resets to welcome
14. Load previous conversation from sidebar → works
15. Restart backend → stats persist
16. Test on mobile viewport (375px) → responsive layout works
17. Switch to Ollama → local LLM works

### Demo Video Readiness
- [ ] All pages render without errors
- [ ] Animations are smooth (60fps)
- [ ] No console errors
- [ ] Docker compose starts cleanly
- [ ] Demo data loads automatically
