# AskDocs — Testing Guide

Step-by-step manual testing guide with edge cases. Run through everything before recording the demo video.

---

## Prerequisites

1. Copy `.env.example` to `.env` and add your `OPENAI_API_KEY`
2. Docker and Docker Compose installed
3. Run: `docker-compose up --build`
4. Wait for logs to show: `AskDocs backend startup complete`
5. Open `http://localhost:3000` in Chrome (1920x1080, zoom 100%)

---

## Phase 1: Startup & Infrastructure

### 1.1 Docker Startup

| # | Test | Steps | Expected | Edge Case |
|---|------|-------|----------|-----------|
| 1 | Clean start | `docker-compose up --build` | All 3 services start, no errors | — |
| 2 | ChromaDB readiness | Watch backend logs | Backend waits and retries if ChromaDB is slow, then connects | Stop chromadb container, start backend — should retry 15 times |
| 3 | Demo data auto-load | Check logs after startup | "Loaded 10 demo documents (X total chunks)" | — |
| 4 | Model download | First run on fresh container | Embedding + reranker models download (~160MB), then "ready" logged | Slow network: should still complete (no timeout) |
| 5 | Restart persistence | `docker-compose restart backend` | Demo data still in ChromaDB (not re-loaded), BM25 rebuilt from existing data | — |

### 1.2 Health Check

| # | Test | Steps | Expected |
|---|------|-------|----------|
| 6 | Health endpoint | `curl http://localhost:8000/health` | `{"status": "healthy", "service": "askdocs-backend", "version": "0.1.0"}` |
| 7 | Swagger docs | Open `http://localhost:8000/docs` | Interactive API docs render correctly |

---

## Phase 2: Dashboard (`http://localhost:3000`)

| # | Test | Steps | Expected | Edge Case |
|---|------|-------|----------|-----------|
| 8 | Initial stats | Open dashboard after startup | 10 documents, correct chunk count, 0 queries, 0 avg confidence | — |
| 9 | Stats update after queries | Run 2-3 chat queries, return to dashboard | Query count, avg confidence, avg retrieval time update | — |
| 10 | Recent queries | After 3+ queries | Last queries listed with confidence badges (color-coded) | Run 12+ queries — only last 10 shown |
| 11 | Document type chart | After startup | Bar/pie showing "txt: 10" | Upload PDF/DOCX — chart updates |
| 12 | Empty state | Delete all documents, refresh dashboard | 0 documents, 0 chunks, empty chart | — |

---

## Phase 3: Document Management (`/documents`)

### 3.1 Upload — Happy Path

| # | Test | Steps | Expected |
|---|------|-------|----------|
| 13 | Upload TXT | Drag a `.txt` file onto upload zone | Processes, appears in table with type badge, chunk count > 0 |
| 14 | Upload PDF | Drag a `.pdf` file (text-based, not scanned) | Same as above, file_type = "pdf" |
| 15 | Upload DOCX | Drag a `.docx` file | Same as above, file_type = "docx" |
| 16 | Upload multiple | Drag 3 files at once | All 3 process, all appear in table |
| 17 | Click to browse | Click upload zone, select file | Same as drag-and-drop |

### 3.2 Upload — Edge Cases & Errors

| # | Test | Steps | Expected |
|---|------|-------|----------|
| 18 | Wrong file type | Upload a `.jpg` or `.mp3` | Error: "Unsupported file type '.jpg'. Allowed: {pdf, docx, txt}" |
| 19 | File > 20MB | Upload a large file | Error: "File 'X' exceeds 20 MB limit." |
| 20 | Empty file (0 bytes) | Upload an empty `.txt` | Error: "No text could be extracted from 'X'." |
| 21 | Scanned PDF (images only) | Upload a scanned PDF | Error: "No text could be extracted from 'X'." (PyPDF2 can't extract image text) |
| 22 | File with no extension | Upload a file named "README" (no dot) | Error: "Unsupported file type" |
| 23 | Duplicate filename | Upload same file twice | Both appear with different IDs (by design — no dedup) |
| 24 | Upload during upload | Drop files while previous upload is processing | Second drop should be ignored (upload zone is in "uploading" state) |

### 3.3 Document Table

| # | Test | Steps | Expected |
|---|------|-------|----------|
| 25 | View all docs | Navigate to /documents after startup | 10 demo docs listed with name, type badge, chunk count, size, date |
| 26 | View chunks | Click "View Chunks" on any document | Modal opens with paginated chunks showing index, page number, token count, text |
| 27 | Chunk pagination | In chunk viewer, click next/previous page | Pages change, content updates |
| 28 | Chunk viewer close | Click X or click outside modal | Modal closes cleanly |

### 3.4 Delete

| # | Test | Steps | Expected |
|---|------|-------|----------|
| 29 | Delete a document | Click delete, confirm in dialog | Document removed from table, chunk count drops on dashboard |
| 30 | Delete confirmation | Click delete, then cancel | Document NOT deleted |
| 31 | Chat after delete | Delete a doc, then ask a question about its content | Answer should NOT reference the deleted document |
| 32 | Delete all docs | Delete every document one by one | Empty table, dashboard shows 0, chat says "I don't have enough information" |

---

## Phase 4: Chat (`/chat`)

### 4.1 Single-Document Questions

| # | Test | Question | Expected |
|---|------|----------|----------|
| 33 | Simple factual | "What is a registered agent?" | Answer from `registered-agent-faq.txt` with citation `[Source: registered-agent-faq.txt, p.1]` |
| 34 | State-specific | "What are the filing fees in Texas?" | Answer from `state-filing-fees.txt` with citation |
| 35 | Process question | "How do I apply for an EIN?" | Answer from `ein-application-guide.txt` with step-by-step and citation |

### 4.2 Multi-Document Questions

| # | Test | Question | Expected |
|---|------|----------|----------|
| 36 | Two docs | "What are the steps to form an LLC and get an EIN?" | Citations from BOTH `llc-formation-guide.txt` AND `ein-application-guide.txt` |
| 37 | Comparison | "What's the difference between an LLC and a corporation?" | Answer from `corporate-vs-llc.txt`, possibly also `llc-formation-guide.txt` |
| 38 | Three docs | "Compare forming an LLC versus a corporation, and what tax IDs does each need?" | Citations from 3 different source files |

### 4.3 Hallucination Guardrail (CRITICAL)

| # | Test | Question | Expected |
|---|------|----------|----------|
| 39 | Out of scope | "What is the capital gains tax rate for 2025?" | "I don't have enough information in the uploaded documents to answer this." |
| 40 | Completely unrelated | "What's the weather today?" | Refusal — system says it can only answer from uploaded documents |
| 41 | Trick question | "According to the documents, what is the best restaurant in New York?" | Refusal — no restaurant info in compliance docs |
| 42 | Partial knowledge | "What are the LLC filing fees in Antarctica?" | Should say information not found (no Antarctic data in docs) |

### 4.4 Streaming & UI Behavior

| # | Test | Steps | Expected |
|---|------|-------|----------|
| 43 | Token streaming | Ask any question, watch the answer area | Text appears token-by-token (not all at once) |
| 44 | Sources appear first | Ask a question, watch the right panel | Source cards appear BEFORE answer starts streaming |
| 45 | Source cards | Check source panel after answer | Cards show document name, page number, relevance score bar, expandable text |
| 46 | Confidence badge | Check below the answer | Green (>80%), yellow (50-80%), or red (<50%) badge |
| 47 | Multiple questions | Ask 3 questions in a row | All messages shown in conversation, sources update to latest question |
| 48 | Long answer | Ask a complex comparison question | Answer streams completely, no truncation |

### 4.5 Chat — Edge Cases

| # | Test | Steps | Expected |
|---|------|-------|----------|
| 49 | Empty question | Try submitting with no text | Input should prevent submission (disabled send button) |
| 50 | Very long question | Paste a 500-word question | Should still work (embedding handles any length) |
| 51 | Special characters | Ask: "What about filing fees for an LLC — costs & requirements?" | Handles dashes, ampersands, quotes correctly |
| 52 | Rapid fire | Send 3 questions quickly while previous is still streaming | Each should complete (may queue up) |
| 53 | No documents loaded | Delete all docs, then ask a question | Should handle gracefully — either "no information" or error message |
| 54 | Chat with newly uploaded doc | Upload a new doc, immediately ask about its content | Should find and cite the new document |

---

## Phase 5: Cross-Feature Integration

| # | Test | Steps | Expected |
|---|------|-------|----------|
| 55 | Upload → Chat | Upload a new PDF, go to chat, ask about its content | New doc is searchable, cited in answer |
| 56 | Delete → Chat | Delete a doc, ask about its content | Answer should NOT cite deleted doc |
| 57 | Upload → Dashboard | Upload 2 files, check dashboard | Document count +2, chunk count increased, doc type chart updated |
| 58 | Chat → Dashboard | Run 5 queries, check dashboard | Query count = 5, recent queries listed, avg confidence shown |
| 59 | Full cycle | Upload → Chat → Delete → Chat again | First chat cites new doc, second chat does not |

---

## Phase 6: Responsive & Browser Testing

| # | Test | Steps | Expected |
|---|------|-------|----------|
| 60 | Desktop (1920x1080) | Full viewport | All sections render correctly, chat split layout works |
| 61 | Tablet (768px) | Resize browser to 768px width | Layout adjusts, sidebar collapses or overlays |
| 62 | Mobile (375px) | Resize to phone width | Single column, usable on small screen |
| 63 | Chrome | Test in Chrome | All features work |
| 64 | Firefox | Test in Firefox | All features work |
| 65 | Safari | Test in Safari (if available) | All features work |

---

## Phase 7: Error Recovery

| # | Test | Steps | Expected |
|---|------|-------|----------|
| 66 | Backend down | Stop backend container, interact with frontend | Error messages shown (not blank screen), e.g. "Cannot connect to server" |
| 67 | Backend restart | Stop and restart backend | Frontend recovers on next request, no permanent broken state |
| 68 | ChromaDB restart | Restart chromadb container | Backend reconnects automatically, data persists |
| 69 | Network interruption | Disconnect network mid-chat-stream | Error shown in chat, no infinite loading spinner |

---

## Quick Pre-Demo Checklist

Run through these 10 items right before hitting record:

- [ ] `docker-compose down -v && docker-compose up --build` (fresh start)
- [ ] Dashboard shows 10 documents, correct chunks, 0 queries
- [ ] Upload a PDF — processes without error
- [ ] View chunks — modal shows paginated content
- [ ] Delete the uploaded PDF — removes cleanly
- [ ] Chat: "What is a registered agent?" — cited answer streams
- [ ] Chat: "Compare LLC vs corporation and EIN requirements" — multi-doc answer
- [ ] Chat: "What's the capital gains tax rate?" — hallucination guardrail fires
- [ ] Source panel shows cards with relevance scores
- [ ] Confidence badge appears (green for good questions)
- [ ] Dashboard updated with query count and recent queries
- [ ] No console errors in browser DevTools
