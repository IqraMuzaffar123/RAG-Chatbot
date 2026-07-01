# AskDocs — UI Redesign Prompt

Copy and paste this entire prompt into Claude Code or Cursor, pointed at the `frontend/` directory.

---

## THE PROMPT

```
Redesign the AskDocs frontend UI to look premium, polished, and enterprise-grade — the kind of product that makes Upwork clients say "I need to hire this person." This is a portfolio showcase project. The UI must look stunning in a 2-minute demo video and screenshots.

## What AskDocs Does

AskDocs is an enterprise RAG (Retrieval-Augmented Generation) knowledge base. Users upload documents (PDF/DOCX/TXT), ask natural language questions, and get cited answers with confidence scores. It uses hybrid search (BM25 + vector), cross-encoder re-ranking, and streams answers token-by-token via SSE.

## Tech Stack (DO NOT change)
- Next.js 16 (App Router), React 19, TypeScript
- Tailwind CSS v4, shadcn/ui v4 (@base-ui/react)
- Recharts for charts
- Lucide React icons
- Dark theme only

## File Structure (DO NOT change locations or API logic)

Pages:
- app/page.tsx — Dashboard (stats, recent queries, doc type chart)
- app/documents/page.tsx — Document management (upload, table, chunk viewer)
- app/chat/page.tsx — Chat interface (messages left 60%, sources right 40%)

Components:
- components/layout/Sidebar.tsx — Left nav
- components/dashboard/StatsCards.tsx — 4 stat cards
- components/dashboard/RecentQueries.tsx — Recent queries table
- components/dashboard/DocTypeChart.tsx — Document type chart
- components/documents/UploadZone.tsx — Drag-and-drop upload
- components/documents/DocumentTable.tsx — Document list table
- components/documents/ChunkViewer.tsx — Paginated chunk modal
- components/documents/DeleteDialog.tsx — Confirm delete
- components/chat/ChatInput.tsx — Message input
- components/chat/ChatMessages.tsx — Message list
- components/chat/SourcePanel.tsx — Source cards panel
- components/chat/SourceCard.tsx — Individual source
- components/chat/ConfidenceBadge.tsx — Confidence indicator

API (DO NOT modify):
- lib/api.ts — All fetch functions
- lib/useChat.ts — SSE streaming hook

## Design Vision — "Enterprise AI That Looks Like It Costs $50K"

The goal is to make potential Upwork clients think: "This person built something that looks like a real product, not a tutorial project." Every pixel should feel intentional. Think Linear, Vercel Dashboard, or Raycast quality.

### Brand Identity
- **Name:** AskDocs
- **Tagline:** "Ask your documents anything."
- **Logo concept:** A chat bubble merged with a document icon, or a brain icon with document pages — use Lucide icons creatively
- **Personality:** Professional, intelligent, trustworthy, fast

### Color System

Primary palette (update globals.css):
| Token | Value | Usage |
|-------|-------|-------|
| Background | #06080d → #0a0f1a | Deep navy gradient, NOT plain black |
| Surface 1 | rgba(255,255,255,0.03) | Card backgrounds |
| Surface 2 | rgba(255,255,255,0.06) | Elevated cards, hover states |
| Surface 3 | rgba(255,255,255,0.09) | Active states, selected items |
| Primary | #10b981 (emerald-500) | CTAs, active nav, success states |
| Primary glow | #10b981 at 15% opacity | Subtle glow behind primary elements |
| Secondary | #06b6d4 (cyan-500) | Links, info badges, chart accents |
| Warning | #f59e0b (amber-500) | Medium confidence, warnings |
| Danger | #ef4444 (red-500) | Low confidence, delete, errors |
| Text primary | #f1f5f9 (slate-100) | Headings |
| Text secondary | #94a3b8 (slate-400) | Body text |
| Text muted | #64748b (slate-500) | Labels, timestamps |
| Border | rgba(255,255,255,0.06) | Subtle card borders |
| Border hover | rgba(255,255,255,0.12) | Border on hover |

### Typography
- Headings: font-semibold or font-bold, tracking-tight, text-slate-100
- Body: text-sm, text-slate-400
- Labels/caps: text-xs, uppercase, tracking-wider, text-slate-500
- Numbers/stats: text-3xl or text-4xl, font-bold, tabular-nums

### Glass-Morphism Cards
Every card should have:
```css
bg-white/[0.03] backdrop-blur-xl border border-white/[0.06] rounded-xl
```
On hover: `border-white/[0.12] bg-white/[0.05]` with smooth transition

## Page-by-Page Design Specs

### 1. SIDEBAR (components/layout/Sidebar.tsx)

Layout:
- Width: w-60, fixed left
- Background: slate-950 with subtle vertical gradient (darker at top)
- Border right: border-white/5

Top section:
- Logo: emerald rounded-lg icon (Brain or FileSearch from Lucide) + "AskDocs" text
- Below logo: small pill badge "Enterprise RAG" in slate-800 bg

Navigation:
- 3 items: Dashboard (LayoutDashboard), Documents (FolderOpen), Chat (MessageSquare)
- Default: text-slate-500, hover → text-slate-300 + bg-white/5
- Active: text-emerald-400 + bg-emerald-500/10 + left emerald border (3px)
- Smooth 150ms transition on all states

Bottom section:
- Horizontal separator
- "AskDocs v1.0" in text-xs text-slate-600
- Small "Hybrid RAG • Citation-Forced" subtitle

### 2. DASHBOARD (app/page.tsx)

Header:
- "Dashboard" h1 + "Knowledge base overview" subtitle
- Optional: small "Last updated: X ago" badge

Stats Cards (components/dashboard/StatsCards.tsx):
- 4 cards in a row (responsive: 2x2 on tablet, 1 column on mobile)
- Each card: glass-morphism + colored top accent line (2px)
- Layout per card:
  - Top-left: label (text-xs uppercase tracking-wider text-slate-500)
  - Center: large number (text-3xl font-bold)
  - Top-right: faded icon (24px, text-slate-700)
  - Bottom: subtle trend or description text
- Card colors:
  - Documents: emerald accent + FileText icon
  - Chunks: cyan accent + Layers icon
  - Queries: amber accent + MessageSquare icon
  - Confidence: green/yellow/red based on value + Shield icon

Recent Queries (components/dashboard/RecentQueries.tsx):
- Glass card with "Recent Queries" header + MessageSquare icon
- List items: question text (truncated), confidence badge (pill), relative time
- Hover: subtle bg-white/5
- Empty state: centered icon + "No queries yet. Ask your first question." with CTA button to /chat

Doc Type Chart (components/dashboard/DocTypeChart.tsx):
- Glass card with "Document Types" header + PieChart icon
- Use Recharts with custom dark theme colors (emerald, cyan, amber, slate)
- Responsive sizing
- Legend below chart with colored dots

### 3. DOCUMENTS PAGE (app/documents/page.tsx)

Header: "Documents" + "Upload and manage your knowledge base" + document count badge

Upload Zone (components/documents/UploadZone.tsx):
- Large dashed border area (border-white/10, rounded-xl)
- Center: Upload cloud icon (48px, text-slate-600) + "Drag & drop files here" + "or click to browse"
- Below: "Supports PDF, DOCX, TXT • Max 20MB" in text-xs text-slate-500
- Drag over: border becomes emerald, bg-emerald-500/5, icon turns emerald, subtle pulse animation
- Uploading state: progress bar (emerald gradient), filename, percentage
- Done state: green checkmark + "X files processed" + "Upload more" link
- Make it feel inviting, not just functional

Document Table (components/documents/DocumentTable.tsx):
- Glass card wrapping the table
- Header row: text-xs uppercase tracking-wider text-slate-500, bg-white/[0.02]
- Columns: Name (with file icon by type), Type (colored badge pill), Chunks (number), Size, Uploaded (relative time), Actions
- Type badges: PDF = red-500/10 bg + red-400 text, DOCX = blue-500/10 + blue-400, TXT = slate-500/10 + slate-400
- Row hover: bg-white/[0.03]
- Actions: "View Chunks" button (ghost, small) + trash icon (text-slate-600, hover → text-red-400)
- Empty state: folder icon + "No documents uploaded yet" + "Upload your first document" CTA

Chunk Viewer (components/documents/ChunkViewer.tsx):
- Wide modal (max-w-3xl)
- Header: document name + chunk count badge
- Chunks: numbered cards with page number pill, token count, full text
- Pagination: clean prev/next with page indicator
- Subtle card borders between chunks

### 4. CHAT PAGE — THE MONEY SHOT (app/chat/page.tsx)

This is the most important page. Clients will judge the entire project by this.

Layout:
- Full height (h-screen), no padding from parent
- Left 60%: chat area (messages + input)
- Right 40%: source panel
- Divider: subtle border-white/5 between panels

Chat Messages (components/chat/ChatMessages.tsx):
- Clean message list with generous spacing
- User messages: right-aligned, emerald-600 bg, white text, rounded-2xl (rounded-br-md for tail), max-w-[75%]
- AI messages: left-aligned, bg-white/[0.04], text-slate-200, rounded-2xl (rounded-bl-md for tail), max-w-[85%]
- AI message header: small "AskDocs" label + Brain icon (text-emerald-400) above message
- Markdown rendering: bold text, inline code (bg-white/10 rounded px-1.5), citation highlights ([Source: X] in cyan with underline)
- Streaming indicator: 3 animated dots (emerald) while AI is generating
- Welcome state (no messages): centered content:
  - Large Brain icon (emerald, 64px)
  - "Ask your documents anything"
  - 3 example question chips the user can click:
    - "What is a registered agent?"
    - "Compare LLC vs Corporation"
    - "What are the filing fees in Texas?"
  - These chips should be clickable and auto-send the question

Chat Input (components/chat/ChatInput.tsx):
- Sticky at bottom of chat area
- Glass bar: bg-white/[0.04] backdrop-blur, rounded-xl, border border-white/[0.08]
- Input: large text, placeholder "Ask a question about your documents..."
- Send button: emerald circle with ArrowUp icon, disabled state when empty (opacity-50)
- Subtle shadow-lg on the input bar

Source Panel (components/chat/SourcePanel.tsx):
- Header: "Sources" label + count badge + confidence badge
- Background: slightly darker than chat area (bg-slate-950/50)

Source Card (components/chat/SourceCard.tsx):
- Glass card with:
  - Top: document icon (colored by type) + document name + page number pill
  - Middle: text preview (text-sm text-slate-400, 3-4 lines, expandable on click)
  - Bottom: relevance score bar — horizontal bar with gradient (red → yellow → green based on score), percentage label
  - Rerank score shown as small badge
- Cards should have subtle hover lift (translate-y -1px + brighter border)

Confidence Badge (components/chat/ConfidenceBadge.tsx):
- Pill badge with icon:
  - >80%: emerald bg/10, emerald text, CheckCircle icon, "High Confidence"
  - 50-80%: amber bg/10, amber text, AlertCircle icon, "Medium Confidence"
  - <50%: red bg/10, red text, XCircle icon, "Low Confidence"
- Show percentage number

### 5. GLOBAL PATTERNS

Loading states:
- Use skeleton loaders (shimmer animation) matching card shapes
- Skeleton color: bg-white/[0.04] with animate-pulse

Error states:
- Red-tinted glass card with AlertTriangle icon
- Error message + "Try again" button

Empty states:
- Centered layout with large faded icon + message + CTA
- Should look designed, not forgotten

Transitions:
- All hover states: transition-all duration-150
- Page content: fade-in on mount (opacity 0→1 over 200ms)
- Cards: staggered fade-in (delay 50ms per card)
- Chat messages: slide up + fade in

Responsive:
- Sidebar collapses to icons-only on tablet (<1024px)
- Stats grid: 4 cols → 2 cols → 1 col
- Chat: source panel moves below chat on mobile (<768px)
- Tables: horizontal scroll on mobile

### DO NOT:
- Change any API calls, endpoints, or data flow in lib/api.ts
- Change useChat.ts hook logic or SSE parsing
- Change file/folder structure
- Add new npm dependencies without asking
- Break any existing functionality
- Remove any existing features

### DO:
- Redesign every component's visual appearance
- Update globals.css with the new color palette
- Add micro-animations and hover states
- Improve all loading/empty/error states
- Make everything responsive
- Use shadcn/ui components properly
- Add the welcome state with example questions to chat
- Keep all existing data flow intact
```

---

This prompt is ready to paste. Save it or copy it directly.
