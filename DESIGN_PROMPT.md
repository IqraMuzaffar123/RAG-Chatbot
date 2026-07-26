# Claude Design Prompt for AskDocs Redesign

Copy everything below this line and paste into Claude:

---

I have an enterprise RAG (Retrieval-Augmented Generation) document Q&A app called "AskDocs". It's built with Next.js 14, Tailwind CSS 4, and shadcn/ui components. Dark theme only.

The app has 3 pages:

1. Dashboard — stats cards (total docs, chunks, queries, avg confidence), quick action buttons, recent queries table, document type pie chart
2. Documents — file upload zone (drag & drop PDF/DOCX/TXT), document table with columns (filename, type, chunks, size, uploaded date, actions), search bar, type filter buttons (ALL/PDF/DOCX/TXT), chunk viewer modal
3. Chat — split layout with conversation on left (60%) and source panel on right (40%), streaming AI answers with inline citations [1][2], confidence badges (green/yellow/red), source cards showing document passages with highlighted keywords

Sidebar navigation: Dashboard, Documents, Chat. Shows app logo "AskDocs", "Enterprise RAG" badge, recent chat history, index status indicator (live/offline).

CURRENT PROBLEMS:

- Text is too small on high-DPI screens
- Too much empty/wasted space
- Upload zone takes too much vertical space
- The dark theme feels flat and lifeless — no visual hierarchy
- Tables look plain and boring
- No visual differentiation between sections
- Mobile/narrow screen layout breaks (table columns get cut off)

DESIGN REQUIREMENTS:

- Modern, premium SaaS dark theme (think Linear, Vercel, Raycast aesthetic)
- Minimum body font size 16px, table text 15-16px, headings 24-32px
- Glass morphism cards with subtle borders and glow effects
- Compact but readable — no wasted space
- Upload zone should be compact (max 80px height when idle)
- Document table should feel dense but scannable — like a proper data table
- Chat interface should feel like a premium AI chat (think ChatGPT Pro or Perplexity)
- Source cards should have visual hierarchy — document name bold, passage text readable, confidence badge prominent
- Responsive — works on 768px+ screens. On narrow screens, table becomes card layout
- Smooth micro-animations (fade in, slide up) but not overdone
- Color palette: emerald/teal primary (#10b981), dark navy background (#06080d to #0a0f1a), slate grays for text
- Accent colors: emerald for success/primary, cyan for info, amber for warnings, red for errors
- Monospace font for filenames, numbers, code. Sans-serif for everything else

PAGES TO DESIGN:

1. DASHBOARD PAGE

- 4 stat cards in a row (icon + label + big number) with gradient top borders (emerald, cyan, violet, amber)
- 2 quick action cards (Upload Documents, Ask a Question) with hover glow
- Bottom row: Recent Queries table (left 60%) + Document Type donut chart (right 40%)
- Everything should feel full and purposeful — no big empty gaps

2. DOCUMENTS PAGE

- Compact header: "Documents" title + "X documents" badge on right
- Compact upload zone: icon + "Drag & drop or click to browse" + file type hint — all in ONE line, max 70-80px tall
- Search bar with filter buttons (ALL/PDF/DOCX/TXT) on same row
- Dense data table with: filename (with file icon colored by type), type badge, chunk count, file size, relative upload time, action buttons (view chunks, delete)
- Hover states on rows, sortable columns
- On narrow screens (<1024px): switch to card layout showing filename + type badge + chunks + actions per card

3. CHAT PAGE

- Top bar: "Chat" title + "New Chat" button + layout toggle (Split/Focus)
- Split view: conversation (left 60%) + source panel (right 40%)
- Empty state: centered prompt suggestions ("Try asking: What is a registered agent?")
- User messages: right-aligned, subtle background
- AI messages: left-aligned, with streaming cursor animation
- Inline citations [1] [2] as clickable emerald pills
- Source panel: "Sources" header with confidence badge, source cards with document name, page number, passage text with keyword highlighting
- Chat input: bottom-fixed, textarea with send button, "Press Enter to send" hint

4. SIDEBAR

- Logo + app name "AskDocs" + tagline
- "Enterprise RAG" badge
- Nav items: Dashboard, Documents, Chat — with active indicator (left border + teal highlight)
- Recent chats section with chat titles
- Bottom: Index status card (live indicator + search method info) + collapse button + version

Give me the complete code for each component. Use Tailwind CSS classes. Make the text sizes readable (16px+ for body, 14px+ for meta text, never below 12px for anything). The design should look premium enough for an Upwork portfolio demo video.
