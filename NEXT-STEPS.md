# AskDocs — What Needs to Be Done Next

## Current State (2026-07-27)

### Done
- [x] Full RAG pipeline: hybrid search (BM25 + vector + RRF) + cross-encoder reranking
- [x] Citation-forced answers with hallucination guard
- [x] Streaming responses via SSE
- [x] Multi-turn conversation with history
- [x] 3 LLM providers: OpenAI, Anthropic, Ollama (offline)
- [x] Dashboard with stats, recent queries, document type chart
- [x] Documents page with upload, search, filter, sort, chunk viewer
- [x] Chat with source panel, confidence badges, clickable citations
- [x] Dark theme with responsive layout
- [x] RAGAS benchmarks: 3 datasets, 6 metrics, 4-config ablation, visual dashboard
- [x] All UI text bumped for high-DPI readability
- [x] Pushed to GitHub

### Not Done — Must Do Before Demo

- [ ] **Record demo video** (90 seconds) — this is the #1 priority for Upwork portfolio
- [ ] **Take 6 portfolio screenshots** — Dashboard, Documents, Chat (empty + active), Hallucination guard, Chunk viewer, Benchmarks page
- [ ] **Run a real RAGAS evaluation** — click "Run Evaluation" on Benchmarks page, wait ~5 min, screenshot the results
- [ ] **Test on a clean machine** — verify docker-compose up works from scratch
- [ ] **Upload sample files for demo** — create company-policy.txt and return-policy.txt for live upload demo

### Nice to Have (Not Blocking)

- [ ] Add web URL ingestion (fetch content from URLs)
- [ ] Add research paper ingestion (arXiv PDF download)
- [ ] Add query expansion (rewrite user question for better retrieval)
- [ ] Add semantic caching (cache similar questions to reduce LLM calls)
- [ ] Add user feedback loop (thumbs up/down on answers)
- [ ] Add authentication (API key or login)
- [ ] Add rate limiting
- [ ] Add CI/CD pipeline (run tests on push)
- [ ] Add unit tests for backend services
- [ ] Add frontend tests (at least smoke tests)
- [ ] Performance optimization: batch embedding, async ChromaDB calls
- [ ] Export results to PDF/CSV

### Known Issues

1. Port 8000 can get zombie processes on Windows — use port 8001 or restart the machine
2. Natural Questions dataset download is slow (35GB) — uses synthetic fallback
3. No authentication — anyone can access the API
4. Frontend .env.local needed to point to non-default backend port
5. RAGAS eval uses ~$1.80 in OpenAI credits per run
