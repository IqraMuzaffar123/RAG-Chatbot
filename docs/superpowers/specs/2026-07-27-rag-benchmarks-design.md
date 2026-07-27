# AskDocs RAG Benchmarks — Design Spec

## Overview

Add a production-grade evaluation and benchmarking system to AskDocs using RAGAS (industry-standard RAG evaluation framework). Run evaluations on 3 public datasets, measure 6 metrics, compare 4 retrieval configurations, and display results on a visual dashboard page.

**Goal:** Show research-grade metrics in the portfolio — "Faithfulness: 0.91, Hallucination Rate: 9%, Context Recall: 0.84" — proving the RAG pipeline is data-driven, not guesswork.

---

## Datasets

3 standard public datasets, ~50 questions each (150 total):

| Dataset | What It Tests | Source | Format |
|---------|--------------|--------|--------|
| SQuAD 2.0 | Single-document factual Q&A | HuggingFace `rajpurkar/squad_v2` | question, context, answer |
| Natural Questions | Real Google search questions | HuggingFace `google-research-datasets/natural_questions` | question, long_answer, short_answer |
| HotpotQA | Multi-hop reasoning (needs 2+ docs) | HuggingFace `hotpot_qa` | question, supporting_facts, answer |

**Subset strategy:** Download full dataset via HuggingFace `datasets` library, sample 50 answerable questions per dataset (skip unanswerable SQuAD entries), store as JSON in `backend/eval/datasets/`.

**Ingestion:** For each eval run, context documents are ingested into a separate ChromaDB collection (`eval_{dataset}_{timestamp}`) so they don't pollute the user's knowledge base. Collections are cleaned up after the run.

---

## Metrics (via RAGAS)

| Metric | What It Measures | How RAGAS Computes It | Good Score |
|--------|-----------------|----------------------|------------|
| **Faithfulness** | Is the answer grounded in retrieved context? | LLM checks each answer claim against context | > 0.85 |
| **Answer Relevancy** | Does the answer address the question? | LLM generates questions from answer, compares to original | > 0.80 |
| **Context Precision** | Are the top retrieved chunks relevant? | Checks if relevant chunks appear before irrelevant ones | > 0.80 |
| **Context Recall** | Did retrieval find ALL relevant chunks? | LLM checks if ground truth can be derived from context | > 0.75 |
| **Answer Correctness** | Does it match the ground truth? | Semantic similarity + F1 overlap with ground truth | > 0.75 |
| **Hallucination Rate** | How much is made up? | `1 - Faithfulness` (inverted) | < 0.15 |

RAGAS uses the configured LLM (OpenAI GPT-4o-mini) as the evaluator. Estimated cost: ~$1-2 per full eval run (150 questions x 4 configs = 600 evaluations, but most are cheap with gpt-4o-mini).

---

## Ablation Study

Run the same 150 questions through 4 retrieval configurations:

| Config ID | Name | Description |
|-----------|------|-------------|
| `vector_only` | Vector Only | ChromaDB cosine similarity search, no BM25, no reranker |
| `bm25_only` | BM25 Only | BM25Okapi keyword search, no vectors, no reranker |
| `hybrid` | Hybrid (RRF) | Vector + BM25 fused with Reciprocal Rank Fusion (k=60) |
| `hybrid_rerank` | Hybrid + Reranker | Hybrid + ms-marco-MiniLM-L-6-v2 cross-encoder reranking |

**Purpose:** Proves each architectural layer adds measurable value. The ablation chart is the most impressive part for portfolio — shows data-driven engineering decisions.

**Implementation:** The existing `hybrid_search.py` already supports all 4 modes. The eval runner calls each mode by toggling parameters:
- `vector_only`: call ChromaDB query directly, skip BM25, skip reranker
- `bm25_only`: call BM25 index directly, skip ChromaDB, skip reranker
- `hybrid`: call hybrid_search with rerank=False
- `hybrid_rerank`: call hybrid_search with rerank=True (current production default)

---

## Backend Changes

### New Files

```
backend/
├── eval/
│   ├── __init__.py
│   ├── datasets/                    # Downloaded dataset subsets (gitignored, auto-created)
│   │   ├── squad_v2.json
│   │   ├── natural_questions.json
│   │   └── hotpot_qa.json
│   ├── downloader.py                # Download + sample 50 questions per dataset
│   ├── runner.py                    # Orchestrates eval: ingest → query → score → save
│   ├── configs.py                   # 4 retrieval config definitions
│   └── results.py                   # Save/load results to SQLite
├── app/
│   └── routers/
│       └── eval.py                  # NEW: /api/eval/* endpoints
```

### New Dependencies

```
ragas>=0.2.0
datasets>=2.0.0            # HuggingFace datasets library
```

### New Database Tables (SQLite, same DB as stats)

```sql
CREATE TABLE eval_runs (
    id TEXT PRIMARY KEY,                -- UUID
    status TEXT NOT NULL,               -- pending / running / completed / failed
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    duration_seconds FLOAT,
    total_questions INTEGER,
    error_message TEXT
);

CREATE TABLE eval_results (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    run_id TEXT NOT NULL REFERENCES eval_runs(id),
    dataset TEXT NOT NULL,              -- squad_v2 / natural_questions / hotpot_qa
    config TEXT NOT NULL,               -- vector_only / bm25_only / hybrid / hybrid_rerank
    faithfulness FLOAT,
    answer_relevancy FLOAT,
    context_precision FLOAT,
    context_recall FLOAT,
    answer_correctness FLOAT,
    hallucination_rate FLOAT,
    num_questions INTEGER,
    avg_retrieval_time_ms FLOAT,
    avg_answer_time_ms FLOAT
);
```

### New API Endpoints

```
POST /api/eval/run
  - Starts an eval run in a background thread
  - Returns: { "run_id": "uuid", "status": "running" }
  - Idempotent: if a run is already in progress, returns its ID

GET /api/eval/status
  - Returns: { "status": "running", "progress": "45/150", "current_dataset": "squad_v2", "current_config": "hybrid" }
  - Or: { "status": "completed", "run_id": "uuid", "duration": "4m 32s" }

GET /api/eval/results
  - Returns latest completed run's results
  - Response: {
      "run_id": "...",
      "completed_at": "...",
      "duration_seconds": 272,
      "overall": {                          -- averaged across all datasets + best config
        "faithfulness": 0.91,
        "answer_relevancy": 0.87,
        "context_precision": 0.89,
        "context_recall": 0.84,
        "answer_correctness": 0.82,
        "hallucination_rate": 0.09
      },
      "by_dataset": {                       -- per-dataset scores (best config)
        "squad_v2": { ... },
        "natural_questions": { ... },
        "hotpot_qa": { ... }
      },
      "by_config": {                        -- per-config scores (averaged across datasets)
        "vector_only": { ... },
        "bm25_only": { ... },
        "hybrid": { ... },
        "hybrid_rerank": { ... }
      },
      "matrix": [                           -- full dataset x config matrix
        { "dataset": "squad_v2", "config": "vector_only", "faithfulness": 0.88, ... },
        { "dataset": "squad_v2", "config": "bm25_only", "faithfulness": 0.79, ... },
        ...
      ]
    }

GET /api/eval/history
  - Returns: list of past runs with id, status, timestamp, overall scores
```

### Eval Runner Flow

```
1. Download datasets (if not cached locally)
2. For each dataset (squad_v2, natural_questions, hotpot_qa):
   a. Ingest context documents into temp ChromaDB collection
   b. Build temp BM25 index
   c. For each config (vector_only, bm25_only, hybrid, hybrid_rerank):
      i.   Run all 50 questions through the retrieval config
      ii.  Generate answers via LLM
      iii. Evaluate with RAGAS (faithfulness, relevancy, precision, recall, correctness)
      iv.  Save results to SQLite
   d. Delete temp ChromaDB collection
3. Mark run as completed
```

**Concurrency:** Runs in a background thread (threading.Thread). Only one run at a time (checked via status). Frontend polls `/api/eval/status` every 5 seconds while running.

**Error handling:** If a run fails mid-way, partial results are saved, status set to "failed" with error message. Can be re-run.

---

## Frontend Changes

### New Sidebar Item

Add "Benchmarks" to the sidebar navigation between "Chat" and the bottom section:
- Icon: BarChart3 from lucide-react
- Active state matches existing nav styling

### New Page: `/benchmarks` (`app/benchmarks/page.tsx`)

**Components needed:**

```
frontend/components/benchmarks/
├── EvalHeader.tsx          # Title + "Run Evaluation" button + last run info
├── ScoreCards.tsx           # 6 metric cards (2 rows of 3)
├── RadarChart.tsx           # Spider chart of 5 metrics
├── AblationChart.tsx        # Grouped bar chart: 4 configs x 5 metrics
├── DatasetTable.tsx         # Per-dataset breakdown table
├── EvalHistory.tsx          # Past eval runs list
└── RunProgress.tsx          # Progress indicator while eval is running
```

**Layout (top to bottom):**

**1. EvalHeader**
- "Benchmarks" title (32px) + "RAG pipeline evaluation on standard datasets" subtitle (17px)
- Right side: "Run Evaluation" button (emerald gradient) + last run badge ("Last run: 2 hours ago, 4m 32s")
- While running: button changes to "Running..." with spinner, progress bar below ("45/150 — SQuAD 2.0, Hybrid config")

**2. ScoreCards (6 cards, 2 rows x 3 columns)**
- Each card: metric name (14px uppercase), score (40px mono bold), progress bar (color-coded), quality label (HIGH/MEDIUM/LOW)
- Colors: green (>0.8), yellow (0.5-0.8), red (<0.5)
- Hallucination Rate card is inverted: green when LOW (<0.15), red when HIGH
- Cards have gradient top borders matching dashboard style (emerald, cyan, amber, violet)

**3. Two charts side by side (50/50)**

Left: **Radar Chart** (using recharts RadarChart)
- 5 axes: Faithfulness, Relevancy, Precision, Recall, Correctness
- Filled emerald polygon
- Grid lines at 0.2, 0.4, 0.6, 0.8, 1.0
- Shows overall "shape" of system quality

Right: **Ablation Comparison** (using recharts BarChart)
- X-axis: 5 metrics
- 4 grouped bars per metric (vector_only=slate, bm25_only=amber, hybrid=cyan, hybrid_rerank=emerald)
- Legend at top
- Shows how each layer adds value
- This is the key portfolio visual

**4. Per-Dataset Breakdown Table**
- Columns: Dataset, Faithfulness, Relevancy, Precision, Recall, Correctness, Questions, Avg Time
- 3 rows (one per dataset)
- Cells color-coded (green/yellow/red background based on score)
- Sortable by any column
- Font sizes matching DocumentTable (headers 14px, body 16px)

**5. Eval History**
- Table: Run ID (short), Date, Duration, Overall Score, Status (completed/failed badge)
- Last 10 runs
- Click to load that run's results into the charts above

**Responsive:**
- Below 1024px: score cards become 2 columns, charts stack vertically
- Below 768px: score cards become 1 column

---

## What NOT to Build

- No CI/CD integration (unnecessary for portfolio)
- No custom metric implementations (RAGAS handles it)
- No fine-tuning or model training
- No dataset creation UI (datasets are auto-downloaded)
- No comparison with external systems (only internal ablation)
- No real-time eval during chat (only batch eval runs)

---

## Estimated Cost Per Eval Run

| Component | Cost |
|-----------|------|
| Dataset download | Free (HuggingFace) |
| Embedding 150 contexts | ~$0.01 (local model) |
| 600 LLM answer generations (150 questions x 4 configs) | ~$0.60 (GPT-4o-mini) |
| RAGAS evaluation (600 LLM-as-judge calls) | ~$1.20 (GPT-4o-mini) |
| **Total per run** | **~$1.80** |

---

## Files Modified

| File | Change |
|------|--------|
| `backend/requirements.txt` | Add `ragas`, `datasets` |
| `backend/app/main.py` | Register eval router |
| `frontend/components/layout/Sidebar.tsx` | Add "Benchmarks" nav item |
| `frontend/lib/api.ts` | Add eval API functions |

## Files Created

| File | Purpose |
|------|---------|
| `backend/eval/__init__.py` | Package init |
| `backend/eval/downloader.py` | Download + sample datasets |
| `backend/eval/runner.py` | Orchestrate eval runs |
| `backend/eval/configs.py` | 4 retrieval config definitions |
| `backend/eval/results.py` | SQLite save/load |
| `backend/app/routers/eval.py` | API endpoints |
| `frontend/app/benchmarks/page.tsx` | Benchmarks page |
| `frontend/components/benchmarks/EvalHeader.tsx` | Header + run button |
| `frontend/components/benchmarks/ScoreCards.tsx` | 6 metric cards |
| `frontend/components/benchmarks/RadarChart.tsx` | Spider chart |
| `frontend/components/benchmarks/AblationChart.tsx` | Ablation bar chart |
| `frontend/components/benchmarks/DatasetTable.tsx` | Per-dataset table |
| `frontend/components/benchmarks/EvalHistory.tsx` | Past runs list |
| `frontend/components/benchmarks/RunProgress.tsx` | Progress indicator |
