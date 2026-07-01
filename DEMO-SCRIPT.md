# AskDocs — Demo Video Script & Testing Checklist

## Part 1: What to Test Before Recording

Run through every item. Fix anything broken before hitting record.

### Startup Tests
- [ ] `docker-compose up` starts all 3 services without errors
- [ ] Demo data auto-loads (10 compliance docs)
- [ ] Dashboard shows: 10 documents, correct chunk count, 0 queries
- [ ] No console errors in browser

### Upload Tests
- [ ] Upload a PDF → chunks appear, doc shows in table
- [ ] Upload a DOCX → same
- [ ] Upload a TXT → same
- [ ] Upload multiple files at once → all process correctly
- [ ] Reject a file > 20MB (if applicable)
- [ ] Reject unsupported file type (.jpg, .mp3)

### Document Management Tests
- [ ] Document table shows all docs with correct type badges
- [ ] Click "View Chunks" → modal shows chunks with page numbers and text
- [ ] Chunk pagination works (next/previous)
- [ ] Delete a document → removes from table → chunks gone from ChromaDB
- [ ] Dashboard stats update after upload/delete

### Chat Tests — Quality
- [ ] **Single-doc question:** "What is a registered agent?" → answer from registered-agent-faq.txt with citation
- [ ] **Multi-doc question:** "What are the steps to form an LLC and get an EIN?" → answer citing both llc-formation-guide.txt AND ein-application-guide.txt
- [ ] **State-specific question:** "What are the filing fees in Texas?" → pulls from state-filing-fees.txt
- [ ] **Comparison question:** "What's the difference between an LLC and a corporation?" → pulls from corporate-vs-llc.txt
- [ ] **Out-of-scope question:** "What is the capital gains tax rate for 2025?" → system refuses, says "I don't have enough information"
- [ ] **Completely unrelated question:** "What's the weather today?" → system refuses

### Chat Tests — Technical
- [ ] Answer streams token-by-token (not all at once)
- [ ] Source cards appear in right panel after streaming
- [ ] Citations in answer text match source cards
- [ ] Clicking a citation highlights the matching source card
- [ ] Confidence badge shows (green for good questions, lower for vague ones)
- [ ] Retrieval metadata is present

### Dashboard Tests
- [ ] Stats update after running queries
- [ ] Recent queries show with correct confidence
- [ ] Document type chart shows correct distribution

---

## Part 2: Demo Video Script (2 minutes)

### Setup Before Recording
- Fresh start: `docker-compose down -v && docker-compose up`
- Wait for demo data to load
- Open browser to `localhost:3000`
- Have an extra PDF ready to upload (any compliance-related document)
- Screen resolution: 1920x1080, browser zoom 100%
- Close all notifications, clean desktop

---

### Scene 1: Dashboard Introduction (0:00 - 0:20)

**Show:** Dashboard page with loaded demo data

**Say:**
> "This is AskDocs — an enterprise RAG knowledge base I built. It lets you upload any documents and ask questions with cited, verifiable answers."
>
> "The dashboard shows we have 10 compliance documents loaded with over 300 chunks, and it tracks query volume and average confidence scores."

**Action:** Briefly hover over the stats cards and the document type chart.

---

### Scene 2: Document Management (0:20 - 0:40)

**Show:** Navigate to Documents page

**Say:**
> "On the documents page, you can upload PDFs, Word docs, or text files. Let me upload a new document."

**Action:** Drag and drop the extra PDF. Wait for processing.

> "It automatically extracts the text, splits it into semantic chunks — not arbitrary character splits — and embeds everything for search. Let me show you the chunks."

**Action:** Click the "View Chunks" button on the newly uploaded doc. Show the chunk viewer modal briefly.

> "Each chunk preserves the page number and context. This is important for accurate citations."

---

### Scene 3: Chat — Single Document Query (0:40 - 1:10)

**Show:** Navigate to Chat page

**Say:**
> "Now the powerful part — let's ask a question."

**Action:** Type: "What documents are needed to form an LLC in Texas?"

> "Watch how the answer streams in real-time with inline citations — every claim links back to its source document and page number."

**Action:** Point cursor to the citations in the answer text.

> "On the right, you can see the actual source passages that were retrieved, each with a relevance score. This answer has a 91% confidence rating — meaning the sources were highly relevant."

**Action:** Point to source cards and confidence badge.

---

### Scene 4: Multi-Document + Hallucination Guard (1:10 - 1:40)

**Say:**
> "Let me ask something that requires information from multiple documents."

**Action:** Type: "Compare the steps to form an LLC versus a corporation, and what tax IDs does each need?"

> "Notice it pulls from three different source files — the LLC guide, the corporate comparison doc, and the EIN guide — and cites each one."

**Action:** Point to multiple source cards from different documents.

> "Now here's the critical part — what happens when I ask something the documents DON'T cover?"

**Action:** Type: "What is the current capital gains tax rate?"

> "The system says 'I don't have enough information in the uploaded documents to answer this.' No hallucination. No making things up. This is non-negotiable for compliance and legal use cases."

---

### Scene 5: Technical Differentiators (1:40 - 2:00)

**Show:** Dashboard page (navigate back to show updated query stats)

**Say:**
> "Under the hood, AskDocs uses a production-grade retrieval pipeline:"
>
> "Hybrid search combining semantic vectors and BM25 keyword matching..."
>
> "Cross-encoder re-ranking for precision — not just cosine similarity..."
>
> "And the entire stack deploys with a single Docker Compose command."
>
> "Embeddings and re-ranking run locally at zero cost — only the final answer uses GPT-4o-mini at less than a tenth of a cent per query."
>
> "If you need an enterprise RAG system, a knowledge base, or any document AI — let's talk."

---

## Part 3: Key Moments to Capture (for Screenshots)

Use these for the Upwork portfolio entry and README:

| # | Screenshot | What it shows |
|---|-----------|---------------|
| 1 | Dashboard with data | Professional admin view with stats |
| 2 | Document upload in progress | Multi-format support |
| 3 | Chunk viewer modal | Semantic chunking quality |
| 4 | Chat with cited answer + sources | The "money shot" — RAG working |
| 5 | Hallucination refusal | Safety/compliance readiness |
| 6 | Source cards with scores | Retrieval transparency |

---

## Part 4: Questions to Prepare For (Client Q&A)

After they watch the demo, clients will ask:

| Question | Your answer |
|----------|-------------|
| "Can this handle 10,000 documents?" | "ChromaDB scales to millions of vectors. For 10K+ docs I'd add background processing with Celery and a progress queue." |
| "Can it do auth / multi-tenant?" | "Absolutely — I built PrimePal with dual auth systems (Supabase GoTrue + custom JWT). Adding tenant isolation is straightforward." |
| "What about sensitive documents?" | "Everything runs self-hosted — your data never leaves your infrastructure. No third-party embedding APIs, no cloud vector stores." |
| "Can it handle tables/images in PDFs?" | "For structured tables I'd add a table extraction layer. For images, I'd add OCR via Tesseract or Azure Document Intelligence." |
| "How fast is it?" | "Retrieval takes ~100-200ms. Answer generation depends on the LLM — GPT-4o-mini typically responds in 1-3 seconds." |
| "Can we use our own LLM?" | "Yes — the LLM client is provider-agnostic. Switch between OpenAI, Claude, or even local models via Ollama with one config change." |
| "What about conversation memory?" | "This demo is single-turn. Adding multi-turn memory with conversation history is a day's work — I've built this in PrimePal." |

---

## Part 5: Upwork Proposal Template (for RAG Jobs)

When applying to RAG-related jobs, reference AskDocs:

> I've built AskDocs, an enterprise-grade RAG knowledge base with:
> - Hybrid search (BM25 + vector + Reciprocal Rank Fusion)
> - Cross-encoder re-ranking for retrieval precision
> - Citation-forced answers with hallucination guardrails
> - Admin dashboard with retrieval metrics and confidence scoring
> - One-command Docker deployment
>
> [Demo video link] | [GitHub repo link]
>
> I can adapt this architecture to your specific use case. Here's how I'd approach your project: [customize per job]
