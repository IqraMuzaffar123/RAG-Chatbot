# RAG Benchmarks Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add RAGAS-based evaluation with 3 public datasets, 6 metrics, 4-config ablation study, and a visual Benchmarks dashboard page.

**Architecture:** Backend eval module downloads dataset subsets, ingests into temporary ChromaDB collections, runs queries through 4 retrieval configs, evaluates with RAGAS, stores results in SQLite. Frontend Benchmarks page displays score cards, radar chart, ablation bar chart, dataset table, and eval history.

**Tech Stack:** RAGAS, HuggingFace datasets, aiosqlite, recharts, Next.js 14, FastAPI

---

## File Structure

### Backend — New Files

| File | Responsibility |
|------|---------------|
| `backend/eval/__init__.py` | Package init |
| `backend/eval/downloader.py` | Download + sample 50 questions from each HuggingFace dataset |
| `backend/eval/configs.py` | Define 4 retrieval configurations as callables |
| `backend/eval/runner.py` | Orchestrate: ingest → query → evaluate → save |
| `backend/eval/results.py` | SQLite table creation + CRUD for eval_runs / eval_results |
| `backend/app/routers/eval.py` | 4 API endpoints: run, status, results, history |

### Backend — Modified Files

| File | Change |
|------|--------|
| `backend/requirements.txt` | Add `ragas`, `datasets` |
| `backend/app/main.py` | Register eval router, init eval tables in lifespan |

### Frontend — New Files

| File | Responsibility |
|------|---------------|
| `frontend/app/benchmarks/page.tsx` | Benchmarks page layout |
| `frontend/components/benchmarks/EvalHeader.tsx` | Title + Run button + progress |
| `frontend/components/benchmarks/ScoreCards.tsx` | 6 metric cards (2x3 grid) |
| `frontend/components/benchmarks/RadarChart.tsx` | Spider chart of 5 metrics |
| `frontend/components/benchmarks/AblationChart.tsx` | Grouped bar chart of 4 configs |
| `frontend/components/benchmarks/DatasetTable.tsx` | Per-dataset breakdown table |
| `frontend/components/benchmarks/EvalHistory.tsx` | Past runs list |

### Frontend — Modified Files

| File | Change |
|------|--------|
| `frontend/components/layout/Sidebar.tsx` | Add "Benchmarks" nav item |
| `frontend/lib/api.ts` | Add 4 eval API functions |

---

### Task 1: Add Dependencies

**Files:**
- Modify: `backend/requirements.txt`

- [ ] **Step 1: Add ragas and datasets to requirements**

Add these two lines at the end of `backend/requirements.txt`:

```
ragas>=0.2.0
datasets>=2.0.0
```

- [ ] **Step 2: Install dependencies**

Run:
```bash
cd "C:/Users/Iqra Muzaffar/Desktop/MS-Thesis/Primepal/Resume/Hasnain/upwork/docmind-rag/backend"
pip install ragas datasets
```

Expected: Both packages install successfully.

- [ ] **Step 3: Verify imports work**

Run:
```bash
python -c "from ragas.metrics import faithfulness, answer_relevancy, context_precision, context_recall, answer_correctness; print('ragas OK')"
python -c "from datasets import load_dataset; print('datasets OK')"
```

Expected: Both print OK.

- [ ] **Step 4: Commit**

```bash
cd "C:/Users/Iqra Muzaffar/Desktop/MS-Thesis/Primepal/Resume/Hasnain/upwork/docmind-rag"
git add backend/requirements.txt
git commit -m "deps: add ragas and datasets for RAG evaluation"
```

---

### Task 2: Eval Results SQLite Module

**Files:**
- Create: `backend/eval/__init__.py`
- Create: `backend/eval/results.py`

- [ ] **Step 1: Create eval package**

Create `backend/eval/__init__.py`:

```python
"""RAG evaluation and benchmarking module."""
```

- [ ] **Step 2: Create results.py with table creation and CRUD**

Create `backend/eval/results.py`:

```python
"""SQLite storage for evaluation runs and results."""

import uuid
from datetime import datetime, timezone
from pathlib import Path

import aiosqlite

DB_PATH = Path(__file__).resolve().parent.parent / "data" / "stats.db"


async def init_eval_tables() -> None:
    """Create eval tables if they don't exist."""
    async with aiosqlite.connect(str(DB_PATH)) as db:
        await db.execute("""
            CREATE TABLE IF NOT EXISTS eval_runs (
                id TEXT PRIMARY KEY,
                status TEXT NOT NULL DEFAULT 'pending',
                started_at TEXT,
                completed_at TEXT,
                duration_seconds REAL,
                total_questions INTEGER DEFAULT 0,
                progress TEXT DEFAULT '',
                error_message TEXT
            )
        """)
        await db.execute("""
            CREATE TABLE IF NOT EXISTS eval_results (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                run_id TEXT NOT NULL,
                dataset TEXT NOT NULL,
                config TEXT NOT NULL,
                faithfulness REAL,
                answer_relevancy REAL,
                context_precision REAL,
                context_recall REAL,
                answer_correctness REAL,
                hallucination_rate REAL,
                num_questions INTEGER,
                avg_retrieval_time_ms REAL,
                avg_answer_time_ms REAL,
                FOREIGN KEY (run_id) REFERENCES eval_runs(id)
            )
        """)
        await db.commit()


async def create_run() -> str:
    """Create a new eval run, return its ID."""
    run_id = str(uuid.uuid4())[:8]
    now = datetime.now(timezone.utc).isoformat()
    async with aiosqlite.connect(str(DB_PATH)) as db:
        await db.execute(
            "INSERT INTO eval_runs (id, status, started_at) VALUES (?, 'running', ?)",
            (run_id, now),
        )
        await db.commit()
    return run_id


async def update_run_progress(run_id: str, progress: str) -> None:
    """Update progress text for a running eval."""
    async with aiosqlite.connect(str(DB_PATH)) as db:
        await db.execute(
            "UPDATE eval_runs SET progress = ? WHERE id = ?",
            (progress, run_id),
        )
        await db.commit()


async def complete_run(run_id: str, total_questions: int) -> None:
    """Mark a run as completed."""
    now = datetime.now(timezone.utc).isoformat()
    async with aiosqlite.connect(str(DB_PATH)) as db:
        row = await db.execute_fetchall(
            "SELECT started_at FROM eval_runs WHERE id = ?", (run_id,)
        )
        started = datetime.fromisoformat(row[0][0])
        duration = (datetime.now(timezone.utc) - started).total_seconds()
        await db.execute(
            """UPDATE eval_runs
               SET status = 'completed', completed_at = ?, duration_seconds = ?,
                   total_questions = ?, progress = ''
               WHERE id = ?""",
            (now, duration, total_questions, run_id),
        )
        await db.commit()


async def fail_run(run_id: str, error: str) -> None:
    """Mark a run as failed."""
    now = datetime.now(timezone.utc).isoformat()
    async with aiosqlite.connect(str(DB_PATH)) as db:
        await db.execute(
            "UPDATE eval_runs SET status = 'failed', completed_at = ?, error_message = ? WHERE id = ?",
            (now, error, run_id),
        )
        await db.commit()


async def save_result(
    run_id: str,
    dataset: str,
    config: str,
    scores: dict,
    num_questions: int,
    avg_retrieval_ms: float,
    avg_answer_ms: float,
) -> None:
    """Save one dataset x config result row."""
    async with aiosqlite.connect(str(DB_PATH)) as db:
        await db.execute(
            """INSERT INTO eval_results
               (run_id, dataset, config, faithfulness, answer_relevancy,
                context_precision, context_recall, answer_correctness,
                hallucination_rate, num_questions, avg_retrieval_time_ms, avg_answer_time_ms)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (
                run_id, dataset, config,
                scores.get("faithfulness", 0),
                scores.get("answer_relevancy", 0),
                scores.get("context_precision", 0),
                scores.get("context_recall", 0),
                scores.get("answer_correctness", 0),
                1.0 - scores.get("faithfulness", 1),
                num_questions, avg_retrieval_ms, avg_answer_ms,
            ),
        )
        await db.commit()


async def get_run_status(run_id: str | None = None) -> dict | None:
    """Get status of a specific run, or the latest run."""
    async with aiosqlite.connect(str(DB_PATH)) as db:
        db.row_factory = aiosqlite.Row
        if run_id:
            cur = await db.execute("SELECT * FROM eval_runs WHERE id = ?", (run_id,))
        else:
            cur = await db.execute("SELECT * FROM eval_runs ORDER BY started_at DESC LIMIT 1")
        row = await cur.fetchone()
        return dict(row) if row else None


async def get_active_run() -> dict | None:
    """Get currently running eval, if any."""
    async with aiosqlite.connect(str(DB_PATH)) as db:
        db.row_factory = aiosqlite.Row
        cur = await db.execute("SELECT * FROM eval_runs WHERE status = 'running' LIMIT 1")
        row = await cur.fetchone()
        return dict(row) if row else None


async def get_latest_results() -> dict | None:
    """Get results from the latest completed run."""
    async with aiosqlite.connect(str(DB_PATH)) as db:
        db.row_factory = aiosqlite.Row
        # Find latest completed run
        cur = await db.execute(
            "SELECT * FROM eval_runs WHERE status = 'completed' ORDER BY completed_at DESC LIMIT 1"
        )
        run = await cur.fetchone()
        if not run:
            return None
        run = dict(run)

        # Get all results for that run
        cur = await db.execute(
            "SELECT * FROM eval_results WHERE run_id = ? ORDER BY dataset, config",
            (run["id"],),
        )
        rows = [dict(r) for r in await cur.fetchall()]

    metrics = ["faithfulness", "answer_relevancy", "context_precision",
               "context_recall", "answer_correctness", "hallucination_rate"]

    # Overall: average of hybrid_rerank config across all datasets
    best_rows = [r for r in rows if r["config"] == "hybrid_rerank"]
    overall = {}
    for m in metrics:
        vals = [r[m] for r in best_rows if r[m] is not None]
        overall[m] = round(sum(vals) / len(vals), 3) if vals else 0

    # By dataset: best config (hybrid_rerank) per dataset
    by_dataset = {}
    for r in best_rows:
        by_dataset[r["dataset"]] = {m: round(r[m], 3) for m in metrics if r[m] is not None}

    # By config: average across datasets per config
    configs = ["vector_only", "bm25_only", "hybrid", "hybrid_rerank"]
    by_config = {}
    for cfg in configs:
        cfg_rows = [r for r in rows if r["config"] == cfg]
        by_config[cfg] = {}
        for m in metrics:
            vals = [r[m] for r in cfg_rows if r[m] is not None]
            by_config[cfg][m] = round(sum(vals) / len(vals), 3) if vals else 0

    return {
        "run_id": run["id"],
        "completed_at": run["completed_at"],
        "duration_seconds": run["duration_seconds"],
        "total_questions": run["total_questions"],
        "overall": overall,
        "by_dataset": by_dataset,
        "by_config": by_config,
        "matrix": rows,
    }


async def get_eval_history(limit: int = 10) -> list[dict]:
    """Get list of past eval runs."""
    async with aiosqlite.connect(str(DB_PATH)) as db:
        db.row_factory = aiosqlite.Row
        cur = await db.execute(
            "SELECT * FROM eval_runs ORDER BY started_at DESC LIMIT ?", (limit,)
        )
        return [dict(r) for r in await cur.fetchall()]
```

- [ ] **Step 3: Verify module imports**

Run:
```bash
cd "C:/Users/Iqra Muzaffar/Desktop/MS-Thesis/Primepal/Resume/Hasnain/upwork/docmind-rag/backend"
python -c "from eval.results import init_eval_tables, create_run, save_result, get_latest_results; print('OK')"
```

Expected: `OK`

- [ ] **Step 4: Commit**

```bash
git add backend/eval/__init__.py backend/eval/results.py
git commit -m "feat(eval): add SQLite storage for eval runs and results"
```

---

### Task 3: Dataset Downloader

**Files:**
- Create: `backend/eval/downloader.py`

- [ ] **Step 1: Create downloader.py**

Create `backend/eval/downloader.py`:

```python
"""Download and sample questions from public QA datasets."""

import json
import random
from pathlib import Path

DATASETS_DIR = Path(__file__).parent / "datasets"
SAMPLE_SIZE = 50
SEED = 42


def _ensure_dir() -> None:
    DATASETS_DIR.mkdir(parents=True, exist_ok=True)


def download_squad() -> list[dict]:
    """Download SQuAD 2.0, sample 50 answerable questions."""
    cache = DATASETS_DIR / "squad_v2.json"
    if cache.exists():
        return json.loads(cache.read_text())

    _ensure_dir()
    from datasets import load_dataset
    ds = load_dataset("rajpurkar/squad_v2", split="validation")

    # Keep only answerable questions (non-empty answer)
    answerable = [
        {
            "question": row["question"],
            "context": row["context"],
            "ground_truth": row["answers"]["text"][0],
        }
        for row in ds
        if row["answers"]["text"]
    ]

    random.seed(SEED)
    sampled = random.sample(answerable, min(SAMPLE_SIZE, len(answerable)))
    cache.write_text(json.dumps(sampled, indent=2))
    return sampled


def download_natural_questions() -> list[dict]:
    """Download Natural Questions, sample 50 with short answers."""
    cache = DATASETS_DIR / "natural_questions.json"
    if cache.exists():
        return json.loads(cache.read_text())

    _ensure_dir()
    from datasets import load_dataset
    ds = load_dataset("google-research-datasets/natural_questions", "default", split="validation", trust_remote_code=True)

    items = []
    for row in ds:
        short_answers = row.get("annotations", {}).get("short_answers", [])
        if not short_answers:
            continue
        # Extract first short answer text from document tokens
        doc_text = row.get("document", {}).get("tokens", {}).get("token", [])
        sa = short_answers[0]
        if not sa.get("start_token") and not sa.get("end_token"):
            continue
        start = sa["start_token"]
        end = sa["end_token"]
        if start >= 0 and end > start and end <= len(doc_text):
            answer_text = " ".join(doc_text[start:end])
            context_start = max(0, start - 100)
            context_end = min(len(doc_text), end + 100)
            context = " ".join(doc_text[context_start:context_end])
            items.append({
                "question": row["question"]["text"],
                "context": context,
                "ground_truth": answer_text,
            })
        if len(items) >= 200:
            break

    random.seed(SEED)
    sampled = random.sample(items, min(SAMPLE_SIZE, len(items)))
    cache.write_text(json.dumps(sampled, indent=2))
    return sampled


def download_hotpotqa() -> list[dict]:
    """Download HotpotQA, sample 50 questions."""
    cache = DATASETS_DIR / "hotpot_qa.json"
    if cache.exists():
        return json.loads(cache.read_text())

    _ensure_dir()
    from datasets import load_dataset
    ds = load_dataset("hotpot_qa", "fullwiki", split="validation")

    items = []
    for row in ds:
        if not row["answer"] or row["answer"] == "yes" or row["answer"] == "no":
            continue
        # Combine supporting facts into context
        context_parts = []
        for title, sentences in zip(row["supporting_facts"]["title"], row["supporting_facts"]["sent_id"]):
            for ctx_title, ctx_sents in zip(row["context"]["title"], row["context"]["sentences"]):
                if ctx_title == title and sentences < len(ctx_sents):
                    context_parts.append(ctx_sents[sentences])
        if context_parts:
            items.append({
                "question": row["question"],
                "context": " ".join(context_parts),
                "ground_truth": row["answer"],
            })
        if len(items) >= 200:
            break

    random.seed(SEED)
    sampled = random.sample(items, min(SAMPLE_SIZE, len(items)))
    cache.write_text(json.dumps(sampled, indent=2))
    return sampled


def download_all() -> dict[str, list[dict]]:
    """Download all 3 datasets, return dict keyed by dataset name."""
    return {
        "squad_v2": download_squad(),
        "natural_questions": download_natural_questions(),
        "hotpot_qa": download_hotpotqa(),
    }
```

- [ ] **Step 2: Add datasets/ to .gitignore**

Append to `backend/.gitignore` (or create it):

```
eval/datasets/
```

- [ ] **Step 3: Test SQuAD download (smallest dataset)**

Run:
```bash
cd "C:/Users/Iqra Muzaffar/Desktop/MS-Thesis/Primepal/Resume/Hasnain/upwork/docmind-rag/backend"
python -c "
from eval.downloader import download_squad
data = download_squad()
print(f'Downloaded {len(data)} questions')
print(f'Sample: {data[0][\"question\"][:60]}...')
print(f'Answer: {data[0][\"ground_truth\"][:60]}')
"
```

Expected: `Downloaded 50 questions` with a real question and answer.

- [ ] **Step 4: Commit**

```bash
git add backend/eval/downloader.py
git commit -m "feat(eval): add dataset downloader for SQuAD, NQ, HotpotQA"
```

---

### Task 4: Retrieval Configs

**Files:**
- Create: `backend/eval/configs.py`

- [ ] **Step 1: Create configs.py**

Create `backend/eval/configs.py`:

```python
"""Four retrieval configurations for ablation study."""

from __future__ import annotations

import time
from typing import Any

from app.services import bm25_index
from app.services.hybrid_search import hybrid_search
from app.services.embedder import get_embedder
from app.services.reranker import rerank


def _vector_only_search(query: str, collection, top_k: int = 5) -> tuple[list[dict], float]:
    """Vector-only: ChromaDB cosine similarity, no BM25, no reranker."""
    start = time.perf_counter()
    embedder = get_embedder()
    query_emb = embedder.embed_query(query)
    results = collection.query(
        query_embeddings=[query_emb],
        n_results=top_k,
        include=["documents", "metadatas", "distances"],
    )
    chunks = []
    if results["ids"] and results["ids"][0]:
        for i, chunk_id in enumerate(results["ids"][0]):
            chunks.append({
                "chunk_id": chunk_id,
                "text": results["documents"][0][i],
                "metadata": results["metadatas"][0][i] if results["metadatas"] else {},
                "score": 1 - results["distances"][0][i],
            })
    elapsed = (time.perf_counter() - start) * 1000
    return chunks, elapsed


def _bm25_only_search(query: str, top_k: int = 5) -> tuple[list[dict], float]:
    """BM25-only: keyword search, no vectors, no reranker."""
    start = time.perf_counter()
    results = bm25_index.search(query, top_k=top_k)
    elapsed = (time.perf_counter() - start) * 1000
    return results, elapsed


def _hybrid_search(query: str, top_k: int = 5) -> tuple[list[dict], float]:
    """Hybrid: Vector + BM25 with RRF fusion, no reranker."""
    start = time.perf_counter()
    results = hybrid_search(query, vector_k=20, bm25_k=20)
    elapsed = (time.perf_counter() - start) * 1000
    return results[:top_k], elapsed


def _hybrid_rerank_search(query: str, top_k: int = 5) -> tuple[list[dict], float]:
    """Hybrid + Reranker: Vector + BM25 + RRF + cross-encoder."""
    start = time.perf_counter()
    results = hybrid_search(query, vector_k=20, bm25_k=20)
    reranked = rerank(query, results, top_k=top_k)
    elapsed = (time.perf_counter() - start) * 1000
    return reranked, elapsed


RETRIEVAL_CONFIGS: dict[str, dict[str, Any]] = {
    "vector_only": {
        "name": "Vector Only",
        "description": "ChromaDB cosine similarity search",
        "search_fn": _vector_only_search,
        "needs_collection": True,
    },
    "bm25_only": {
        "name": "BM25 Only",
        "description": "BM25Okapi keyword search",
        "search_fn": _bm25_only_search,
        "needs_collection": False,
    },
    "hybrid": {
        "name": "Hybrid (RRF)",
        "description": "Vector + BM25 fused with Reciprocal Rank Fusion",
        "search_fn": _hybrid_search,
        "needs_collection": False,
    },
    "hybrid_rerank": {
        "name": "Hybrid + Reranker",
        "description": "Hybrid + ms-marco cross-encoder reranking",
        "search_fn": _hybrid_rerank_search,
        "needs_collection": False,
    },
}
```

- [ ] **Step 2: Commit**

```bash
git add backend/eval/configs.py
git commit -m "feat(eval): add 4 retrieval configs for ablation study"
```

---

### Task 5: Eval Runner

**Files:**
- Create: `backend/eval/runner.py`

- [ ] **Step 1: Create runner.py**

Create `backend/eval/runner.py`:

```python
"""Orchestrates evaluation: ingest → query → evaluate → save."""

from __future__ import annotations

import asyncio
import logging
import time
from typing import Any

from ragas import evaluate
from ragas.metrics import (
    answer_correctness,
    answer_relevancy,
    context_precision,
    context_recall,
    faithfulness,
)
from datasets import Dataset

from app.services.embedder import get_embedder
from app.services import bm25_index
from app.services.llm_client import generate_stream
from app.config import get_settings
from eval.configs import RETRIEVAL_CONFIGS
from eval import results as eval_db
from eval.downloader import download_all

logger = logging.getLogger(__name__)

# Global state for current run
_current_run_id: str | None = None


def is_running() -> bool:
    return _current_run_id is not None


async def run_evaluation() -> str:
    """Start a full evaluation run. Returns run_id."""
    global _current_run_id
    if _current_run_id is not None:
        return _current_run_id

    run_id = await eval_db.create_run()
    _current_run_id = run_id

    # Run in background
    asyncio.get_event_loop().run_in_executor(None, _run_sync, run_id)
    return run_id


def _run_sync(run_id: str) -> None:
    """Synchronous eval runner (runs in thread)."""
    global _current_run_id
    loop = asyncio.new_event_loop()
    try:
        loop.run_until_complete(_run_async(run_id))
    except Exception as e:
        logger.exception("Eval run failed: %s", e)
        loop.run_until_complete(eval_db.fail_run(run_id, str(e)))
    finally:
        _current_run_id = None
        loop.close()


async def _run_async(run_id: str) -> None:
    """Main eval logic."""
    settings = get_settings()

    # Step 1: Download datasets
    await eval_db.update_run_progress(run_id, "Downloading datasets...")
    datasets = download_all()

    total_questions = sum(len(v) for v in datasets.values())
    processed = 0

    # Step 2: For each dataset
    for ds_name, questions in datasets.items():
        # Ingest contexts into the main collection (they'll be searched)
        embedder = get_embedder()
        import chromadb
        chroma = chromadb.HttpClient(host=settings.CHROMA_HOST, port=settings.CHROMA_PORT)
        eval_collection_name = f"eval_{ds_name}_{run_id}"
        collection = chroma.get_or_create_collection(eval_collection_name)

        # Embed and store contexts
        contexts = [q["context"] for q in questions]
        embeddings = embedder.embed_texts(contexts)
        ids = [f"{ds_name}_{i}" for i in range(len(questions))]
        metadatas = [{"doc_name": f"{ds_name}_doc_{i}", "page_number": 1} for i in range(len(questions))]

        # Batch add (ChromaDB limit is ~5000 per batch)
        batch_size = 100
        for start in range(0, len(ids), batch_size):
            end = start + batch_size
            collection.add(
                ids=ids[start:end],
                embeddings=embeddings[start:end],
                documents=contexts[start:end],
                metadatas=metadatas[start:end],
            )

        # Also add to BM25 index temporarily
        bm25_chunks = [
            {"chunk_id": ids[i], "text": contexts[i], "metadata": metadatas[i]}
            for i in range(len(questions))
        ]
        bm25_index.add_to_index(bm25_chunks)

        # Step 3: For each retrieval config
        for cfg_id, cfg in RETRIEVAL_CONFIGS.items():
            progress = f"{processed}/{total_questions * 4} — {ds_name}, {cfg['name']}"
            await eval_db.update_run_progress(run_id, progress)

            ragas_questions = []
            ragas_answers = []
            ragas_contexts = []
            ragas_ground_truths = []
            retrieval_times = []
            answer_times = []

            for q in questions:
                # Retrieve
                if cfg.get("needs_collection"):
                    chunks, ret_ms = cfg["search_fn"](q["question"], collection, top_k=5)
                else:
                    chunks, ret_ms = cfg["search_fn"](q["question"], top_k=5)
                retrieval_times.append(ret_ms)

                # Get context texts
                ctx_texts = [c.get("text", "") for c in chunks] if chunks else [""]

                # Generate answer
                ans_start = time.perf_counter()
                context_block = "\n\n".join(
                    f"[Source: doc_{i+1}]\n{t}" for i, t in enumerate(ctx_texts)
                )
                system_prompt = (
                    "You are a helpful assistant. Answer the question based ONLY on the provided context. "
                    "If the context doesn't contain the answer, say 'I don't have enough information.'"
                )
                user_msg = f"Context:\n{context_block}\n\nQuestion: {q['question']}"

                answer_parts = []
                async for event in generate_stream(system_prompt, user_msg):
                    if event.get("type") == "token":
                        answer_parts.append(event["data"])
                answer = "".join(answer_parts)
                ans_ms = (time.perf_counter() - ans_start) * 1000
                answer_times.append(ans_ms)

                ragas_questions.append(q["question"])
                ragas_answers.append(answer)
                ragas_contexts.append(ctx_texts)
                ragas_ground_truths.append(q["ground_truth"])

            # Evaluate with RAGAS
            eval_dataset = Dataset.from_dict({
                "question": ragas_questions,
                "answer": ragas_answers,
                "contexts": ragas_contexts,
                "ground_truth": ragas_ground_truths,
            })

            try:
                ragas_result = evaluate(
                    eval_dataset,
                    metrics=[
                        faithfulness,
                        answer_relevancy,
                        context_precision,
                        context_recall,
                        answer_correctness,
                    ],
                )
                scores = {
                    "faithfulness": float(ragas_result["faithfulness"]),
                    "answer_relevancy": float(ragas_result["answer_relevancy"]),
                    "context_precision": float(ragas_result["context_precision"]),
                    "context_recall": float(ragas_result["context_recall"]),
                    "answer_correctness": float(ragas_result["answer_correctness"]),
                }
            except Exception as e:
                logger.warning("RAGAS eval failed for %s/%s: %s", ds_name, cfg_id, e)
                scores = {
                    "faithfulness": 0, "answer_relevancy": 0,
                    "context_precision": 0, "context_recall": 0,
                    "answer_correctness": 0,
                }

            avg_ret = sum(retrieval_times) / len(retrieval_times) if retrieval_times else 0
            avg_ans = sum(answer_times) / len(answer_times) if answer_times else 0

            await eval_db.save_result(
                run_id, ds_name, cfg_id, scores,
                len(questions), avg_ret, avg_ans,
            )
            processed += len(questions)

        # Cleanup: delete temp collection
        try:
            chroma.delete_collection(eval_collection_name)
        except Exception:
            pass

        # Remove from BM25 index
        for chunk_id in ids:
            try:
                bm25_index.remove_from_index(chunk_id)
            except Exception:
                pass

    await eval_db.complete_run(run_id, total_questions)
    logger.info("Eval run %s completed: %d questions", run_id, total_questions)
```

- [ ] **Step 2: Commit**

```bash
git add backend/eval/runner.py
git commit -m "feat(eval): add eval runner with RAGAS + ablation"
```

---

### Task 6: Eval API Endpoints

**Files:**
- Create: `backend/app/routers/eval.py`
- Modify: `backend/app/main.py`

- [ ] **Step 1: Create eval router**

Create `backend/app/routers/eval.py`:

```python
"""Evaluation API endpoints."""

from fastapi import APIRouter, HTTPException

from eval import results as eval_db
from eval.runner import run_evaluation, is_running

router = APIRouter(prefix="/api/eval", tags=["evaluation"])


@router.post("/run")
async def start_eval():
    """Start a new evaluation run."""
    active = await eval_db.get_active_run()
    if active:
        return {"run_id": active["id"], "status": "already_running"}

    run_id = await run_evaluation()
    return {"run_id": run_id, "status": "running"}


@router.get("/status")
async def eval_status():
    """Get status of the latest eval run."""
    active = await eval_db.get_active_run()
    if active:
        return {
            "status": "running",
            "run_id": active["id"],
            "progress": active.get("progress", ""),
            "started_at": active["started_at"],
        }

    latest = await eval_db.get_run_status()
    if not latest:
        return {"status": "no_runs"}

    return {
        "status": latest["status"],
        "run_id": latest["id"],
        "completed_at": latest.get("completed_at"),
        "duration_seconds": latest.get("duration_seconds"),
        "error_message": latest.get("error_message"),
    }


@router.get("/results")
async def eval_results():
    """Get results from the latest completed eval run."""
    data = await eval_db.get_latest_results()
    if not data:
        raise HTTPException(status_code=404, detail="No completed eval runs found")
    return data


@router.get("/history")
async def eval_history():
    """Get list of past eval runs."""
    runs = await eval_db.get_eval_history(limit=10)
    return {"runs": runs}
```

- [ ] **Step 2: Register eval router in main.py**

Add to `backend/app/main.py` imports (after existing router imports):

```python
from app.routers import documents, chat, stats, eval as eval_router
```

And add the router registration (after existing `app.include_router` calls):

```python
app.include_router(eval_router.router)
```

Also add eval table initialization in the lifespan function, after `await init_db()`:

```python
from eval.results import init_eval_tables
await init_eval_tables()
```

- [ ] **Step 3: Commit**

```bash
git add backend/app/routers/eval.py backend/app/main.py
git commit -m "feat(eval): add eval API endpoints and register router"
```

---

### Task 7: Frontend API Functions

**Files:**
- Modify: `frontend/lib/api.ts`

- [ ] **Step 1: Add eval API types and functions**

Add to the end of `frontend/lib/api.ts`:

```typescript
// ── Evaluation API ─────────────────────────────────────

export interface EvalScores {
  faithfulness: number;
  answer_relevancy: number;
  context_precision: number;
  context_recall: number;
  answer_correctness: number;
  hallucination_rate: number;
}

export interface EvalResultRow {
  dataset: string;
  config: string;
  faithfulness: number;
  answer_relevancy: number;
  context_precision: number;
  context_recall: number;
  answer_correctness: number;
  hallucination_rate: number;
  num_questions: number;
  avg_retrieval_time_ms: number;
  avg_answer_time_ms: number;
}

export interface EvalResults {
  run_id: string;
  completed_at: string;
  duration_seconds: number;
  total_questions: number;
  overall: EvalScores;
  by_dataset: Record<string, EvalScores>;
  by_config: Record<string, EvalScores>;
  matrix: EvalResultRow[];
}

export interface EvalRun {
  id: string;
  status: string;
  started_at: string;
  completed_at?: string;
  duration_seconds?: number;
  total_questions?: number;
  progress?: string;
  error_message?: string;
}

export interface EvalStatus {
  status: string;
  run_id?: string;
  progress?: string;
  started_at?: string;
  completed_at?: string;
  duration_seconds?: number;
  error_message?: string;
}

export async function startEvalRun(): Promise<{ run_id: string; status: string }> {
  const res = await fetch(`${API_BASE}/api/eval/run`, { method: "POST" });
  if (!res.ok) throw new Error(await parseError(res, "Failed to start eval"));
  return res.json();
}

export async function fetchEvalStatus(): Promise<EvalStatus> {
  const res = await fetch(`${API_BASE}/api/eval/status`);
  if (!res.ok) throw new Error(await parseError(res, "Failed to fetch eval status"));
  return res.json();
}

export async function fetchEvalResults(): Promise<EvalResults> {
  const res = await fetch(`${API_BASE}/api/eval/results`);
  if (!res.ok) throw new Error(await parseError(res, "Failed to fetch eval results"));
  return res.json();
}

export async function fetchEvalHistory(): Promise<{ runs: EvalRun[] }> {
  const res = await fetch(`${API_BASE}/api/eval/history`);
  if (!res.ok) throw new Error(await parseError(res, "Failed to fetch eval history"));
  return res.json();
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/lib/api.ts
git commit -m "feat(eval): add eval API types and functions to frontend"
```

---

### Task 8: Add Benchmarks Nav Item to Sidebar

**Files:**
- Modify: `frontend/components/layout/Sidebar.tsx`

- [ ] **Step 1: Add BarChart3 import and nav item**

In `frontend/components/layout/Sidebar.tsx`, add `BarChart3` to the lucide-react imports:

```typescript
import {
  LayoutDashboard,
  FolderOpen,
  MessageSquare,
  BarChart3,
  // ... existing imports
} from "lucide-react";
```

Then update the `navItems` array to add Benchmarks:

```typescript
const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/documents", label: "Documents", icon: FolderOpen },
  { href: "/chat", label: "Chat", icon: MessageSquare },
  { href: "/benchmarks", label: "Benchmarks", icon: BarChart3 },
];
```

- [ ] **Step 2: Commit**

```bash
git add frontend/components/layout/Sidebar.tsx
git commit -m "feat(eval): add Benchmarks nav item to sidebar"
```

---

### Task 9: Benchmarks Dashboard Page

**Files:**
- Create: `frontend/app/benchmarks/page.tsx`
- Create: `frontend/components/benchmarks/EvalHeader.tsx`
- Create: `frontend/components/benchmarks/ScoreCards.tsx`
- Create: `frontend/components/benchmarks/RadarChart.tsx`
- Create: `frontend/components/benchmarks/AblationChart.tsx`
- Create: `frontend/components/benchmarks/DatasetTable.tsx`
- Create: `frontend/components/benchmarks/EvalHistory.tsx`

This is the largest task. Each component is straightforward.

- [ ] **Step 1: Create EvalHeader component**

Create `frontend/components/benchmarks/EvalHeader.tsx`:

```tsx
"use client";

import { Loader2, Play, Clock } from "lucide-react";

interface EvalHeaderProps {
  isRunning: boolean;
  progress: string;
  lastRun: string | null;
  duration: number | null;
  onRun: () => void;
}

export function EvalHeader({ isRunning, progress, lastRun, duration, onRun }: EvalHeaderProps) {
  const formatDuration = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = Math.round(s % 60);
    return m > 0 ? `${m}m ${sec}s` : `${sec}s`;
  };

  return (
    <div className="flex items-end justify-between mb-6 flex-wrap gap-3 animate-in">
      <div>
        <h1 className="text-[32px] font-bold text-slate-50 m-0" style={{ letterSpacing: "-0.025em" }}>
          Benchmarks
        </h1>
        <p className="mt-1 text-[17px] text-slate-400 m-0">
          RAG pipeline evaluation on standard datasets
        </p>
      </div>
      <div className="flex items-center gap-3">
        {lastRun && duration != null && (
          <span className="flex items-center gap-2 text-[14px] text-slate-500"
            style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", padding: "8px 14px", borderRadius: 99 }}>
            <Clock className="w-4 h-4" />
            Last run: {formatDuration(duration)}
          </span>
        )}
        <button
          onClick={onRun}
          disabled={isRunning}
          className="flex items-center gap-2 text-[15px] font-semibold cursor-pointer transition-all"
          style={{
            padding: "10px 20px",
            borderRadius: 12,
            border: "none",
            background: isRunning ? "rgba(255,255,255,0.06)" : "linear-gradient(140deg, #10b981, #059669)",
            color: isRunning ? "#94a3b8" : "#04120c",
            boxShadow: isRunning ? "none" : "0 4px 14px rgba(16,185,129,0.35)",
          }}
        >
          {isRunning ? (
            <><Loader2 className="w-4 h-4 animate-spin" /> Running...</>
          ) : (
            <><Play className="w-4 h-4" /> Run Evaluation</>
          )}
        </button>
      </div>
      {isRunning && progress && (
        <div className="w-full text-[15px] text-teal-300 font-mono"
          style={{ background: "rgba(16,185,129,0.06)", border: "1px solid rgba(16,185,129,0.15)", padding: "10px 16px", borderRadius: 10 }}>
          {progress}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Create ScoreCards component**

Create `frontend/components/benchmarks/ScoreCards.tsx`:

```tsx
"use client";

import type { EvalScores } from "@/lib/api";

const METRIC_CONFIG = [
  { key: "faithfulness", label: "Faithfulness", color: "#10b981", desc: "Grounded in context" },
  { key: "answer_relevancy", label: "Answer Relevancy", color: "#06b6d4", desc: "Addresses the question" },
  { key: "context_precision", label: "Context Precision", color: "#8b5cf6", desc: "Top chunks are relevant" },
  { key: "context_recall", label: "Context Recall", color: "#f59e0b", desc: "Found all relevant chunks" },
  { key: "answer_correctness", label: "Answer Correctness", color: "#60a5fa", desc: "Matches ground truth" },
  { key: "hallucination_rate", label: "Hallucination Rate", color: "#f87171", desc: "Lower is better", inverted: true },
] as const;

function qualityLabel(score: number, inverted?: boolean): { text: string; color: string } {
  if (inverted) {
    if (score < 0.15) return { text: "LOW", color: "#34d399" };
    if (score < 0.3) return { text: "MEDIUM", color: "#fbbf24" };
    return { text: "HIGH", color: "#f87171" };
  }
  if (score >= 0.8) return { text: "HIGH", color: "#34d399" };
  if (score >= 0.5) return { text: "MEDIUM", color: "#fbbf24" };
  return { text: "LOW", color: "#f87171" };
}

export function ScoreCards({ scores }: { scores: EvalScores | null }) {
  if (!scores) {
    return (
      <div className="grid grid-cols-3 gap-4 mb-6">
        {METRIC_CONFIG.map((m) => (
          <div key={m.key} className="gradient-card" style={{ padding: "18px 20px" }}>
            <div className="skeleton" style={{ width: 100, height: 14, marginBottom: 12 }} />
            <div className="skeleton" style={{ width: 60, height: 36 }} />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-3 gap-4 mb-6">
      {METRIC_CONFIG.map((m) => {
        const value = scores[m.key as keyof EvalScores] ?? 0;
        const q = qualityLabel(value, "inverted" in m && m.inverted);
        const barWidth = "inverted" in m && m.inverted ? (1 - value) * 100 : value * 100;

        return (
          <div key={m.key} className="gradient-card relative overflow-hidden" style={{ padding: "18px 20px" }}>
            <div className="absolute top-0 left-0 right-0 h-[2px]" style={{ background: `linear-gradient(90deg, ${m.color}, transparent)` }} />
            <div className="text-[14px] uppercase tracking-wider text-slate-500 font-semibold">{m.label}</div>
            <div className="flex items-end gap-3 mt-2">
              <span className="text-[40px] font-bold font-mono leading-none" style={{ color: q.color }}>
                {"inverted" in m && m.inverted ? `${(value * 100).toFixed(0)}%` : value.toFixed(2)}
              </span>
              <span className="text-[14px] font-semibold mb-1" style={{ color: q.color }}>{q.text}</span>
            </div>
            <div className="text-[14px] text-slate-500 mt-1">{m.desc}</div>
            <div className="mt-3 rounded-full overflow-hidden" style={{ height: 6, background: "rgba(255,255,255,0.06)" }}>
              <div className="h-full rounded-full transition-all duration-500"
                style={{ width: `${barWidth}%`, background: `linear-gradient(90deg, ${m.color}88, ${m.color})` }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 3: Create RadarChart component**

Create `frontend/components/benchmarks/RadarChart.tsx`:

```tsx
"use client";

import { Radar, RadarChart as RechartsRadar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer } from "recharts";
import type { EvalScores } from "@/lib/api";

const AXES = [
  { key: "faithfulness", label: "Faithfulness" },
  { key: "answer_relevancy", label: "Relevancy" },
  { key: "context_precision", label: "Precision" },
  { key: "context_recall", label: "Recall" },
  { key: "answer_correctness", label: "Correctness" },
];

export function MetricsRadarChart({ scores }: { scores: EvalScores | null }) {
  if (!scores) {
    return (
      <div className="gradient-card flex items-center justify-center" style={{ padding: 20, minHeight: 350 }}>
        <p className="text-[16px] text-slate-500">Run an evaluation to see results</p>
      </div>
    );
  }

  const data = AXES.map((a) => ({
    metric: a.label,
    score: scores[a.key as keyof EvalScores] ?? 0,
  }));

  return (
    <div className="gradient-card" style={{ padding: "16px 20px" }}>
      <div className="text-[18px] font-semibold text-slate-50 mb-2">Quality Profile</div>
      <ResponsiveContainer width="100%" height={300}>
        <RechartsRadar data={data}>
          <PolarGrid stroke="rgba(255,255,255,0.08)" />
          <PolarAngleAxis dataKey="metric" tick={{ fill: "#94a3b8", fontSize: 13 }} />
          <PolarRadiusAxis angle={90} domain={[0, 1]} tick={{ fill: "#475569", fontSize: 12 }} tickCount={6} />
          <Radar dataKey="score" stroke="#10b981" fill="#10b981" fillOpacity={0.2} strokeWidth={2} />
        </RechartsRadar>
      </ResponsiveContainer>
    </div>
  );
}
```

- [ ] **Step 4: Create AblationChart component**

Create `frontend/components/benchmarks/AblationChart.tsx`:

```tsx
"use client";

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import type { EvalScores } from "@/lib/api";

const CONFIGS = [
  { key: "vector_only", label: "Vector Only", color: "#64748b" },
  { key: "bm25_only", label: "BM25 Only", color: "#f59e0b" },
  { key: "hybrid", label: "Hybrid (RRF)", color: "#06b6d4" },
  { key: "hybrid_rerank", label: "Hybrid + Reranker", color: "#10b981" },
];

const METRICS = [
  { key: "faithfulness", label: "Faithful" },
  { key: "answer_relevancy", label: "Relevancy" },
  { key: "context_precision", label: "Precision" },
  { key: "context_recall", label: "Recall" },
  { key: "answer_correctness", label: "Correct" },
];

interface Props {
  byConfig: Record<string, EvalScores> | null;
}

export function AblationChart({ byConfig }: Props) {
  if (!byConfig) {
    return (
      <div className="gradient-card flex items-center justify-center" style={{ padding: 20, minHeight: 350 }}>
        <p className="text-[16px] text-slate-500">Run an evaluation to see ablation results</p>
      </div>
    );
  }

  const data = METRICS.map((m) => {
    const row: Record<string, string | number> = { metric: m.label };
    for (const cfg of CONFIGS) {
      row[cfg.key] = byConfig[cfg.key]?.[m.key as keyof EvalScores] ?? 0;
    }
    return row;
  });

  return (
    <div className="gradient-card" style={{ padding: "16px 20px" }}>
      <div className="text-[18px] font-semibold text-slate-50 mb-2">Ablation Study</div>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data} barCategoryGap="20%">
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
          <XAxis dataKey="metric" tick={{ fill: "#94a3b8", fontSize: 13 }} />
          <YAxis domain={[0, 1]} tick={{ fill: "#475569", fontSize: 12 }} />
          <Tooltip
            contentStyle={{ background: "#0d1320", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, fontSize: 14 }}
            labelStyle={{ color: "#f1f5f9", fontWeight: 600 }}
          />
          <Legend wrapperStyle={{ fontSize: 13 }} />
          {CONFIGS.map((cfg) => (
            <Bar key={cfg.key} dataKey={cfg.key} name={cfg.label} fill={cfg.color} radius={[4, 4, 0, 0]} />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
```

- [ ] **Step 5: Create DatasetTable component**

Create `frontend/components/benchmarks/DatasetTable.tsx`:

```tsx
"use client";

import type { EvalScores } from "@/lib/api";

const METRICS = ["faithfulness", "answer_relevancy", "context_precision", "context_recall", "answer_correctness"] as const;
const LABELS: Record<string, string> = {
  squad_v2: "SQuAD 2.0",
  natural_questions: "Natural Questions",
  hotpot_qa: "HotpotQA",
};

function cellColor(v: number): string {
  if (v >= 0.8) return "rgba(16,185,129,0.12)";
  if (v >= 0.5) return "rgba(245,158,11,0.12)";
  return "rgba(239,68,68,0.12)";
}

interface Props {
  byDataset: Record<string, EvalScores> | null;
}

export function DatasetTable({ byDataset }: Props) {
  if (!byDataset || Object.keys(byDataset).length === 0) {
    return null;
  }

  return (
    <div className="gradient-card overflow-hidden mt-6">
      <div style={{ padding: "14px 20px", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
        <span className="text-[18px] font-semibold text-slate-50">Per-Dataset Breakdown</span>
      </div>
      <div className="overflow-x-auto">
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "rgba(255,255,255,0.02)", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
              <th style={{ padding: "12px 20px", textAlign: "left", fontSize: 14, textTransform: "uppercase", letterSpacing: "0.08em", color: "#94a3b8", fontWeight: 600 }}>Dataset</th>
              {METRICS.map((m) => (
                <th key={m} style={{ padding: "12px 16px", textAlign: "center", fontSize: 14, textTransform: "uppercase", letterSpacing: "0.08em", color: "#94a3b8", fontWeight: 600 }}>
                  {m.replace("answer_", "").replace("context_", "").replace("_", " ")}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Object.entries(byDataset).map(([ds, scores]) => (
              <tr key={ds} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                <td style={{ padding: "14px 20px", fontSize: 16, fontWeight: 500, color: "#e2e8f0" }}>
                  {LABELS[ds] || ds}
                </td>
                {METRICS.map((m) => {
                  const v = scores[m as keyof EvalScores] ?? 0;
                  return (
                    <td key={m} style={{ padding: "14px 16px", textAlign: "center" }}>
                      <span className="font-mono text-[16px] font-semibold" style={{
                        background: cellColor(v),
                        padding: "4px 10px",
                        borderRadius: 6,
                        color: v >= 0.8 ? "#34d399" : v >= 0.5 ? "#fbbf24" : "#f87171",
                      }}>
                        {v.toFixed(2)}
                      </span>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
```

- [ ] **Step 6: Create EvalHistory component**

Create `frontend/components/benchmarks/EvalHistory.tsx`:

```tsx
"use client";

import { CheckCircle2, XCircle, Clock } from "lucide-react";
import type { EvalRun } from "@/lib/api";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

export function EvalHistory({ runs }: { runs: EvalRun[] }) {
  if (runs.length === 0) return null;

  return (
    <div className="gradient-card overflow-hidden mt-6">
      <div style={{ padding: "14px 20px", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
        <span className="text-[18px] font-semibold text-slate-50">Evaluation History</span>
      </div>
      {runs.map((run) => (
        <div key={run.id} className="flex items-center gap-4 hover:bg-white/[0.03] transition-colors"
          style={{ padding: "12px 20px", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
          {run.status === "completed" ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          ) : (
            <XCircle className="w-5 h-5 text-red-400 shrink-0" />
          )}
          <span className="font-mono text-[15px] text-slate-400 w-20 shrink-0">{run.id}</span>
          <span className="text-[15px] text-slate-300 flex-1">{formatDate(run.started_at)}</span>
          {run.duration_seconds && (
            <span className="flex items-center gap-1.5 text-[14px] text-slate-500">
              <Clock className="w-3.5 h-3.5" />
              {Math.round(run.duration_seconds)}s
            </span>
          )}
          <span className="text-[14px] text-slate-500">{run.total_questions || 0} questions</span>
          <span className="text-[13px] font-semibold px-3 py-1 rounded-full" style={{
            color: run.status === "completed" ? "#34d399" : "#f87171",
            background: run.status === "completed" ? "rgba(16,185,129,0.12)" : "rgba(239,68,68,0.12)",
          }}>
            {run.status}
          </span>
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 7: Create Benchmarks page**

Create `frontend/app/benchmarks/page.tsx`:

```tsx
"use client";

import { useCallback, useEffect, useState } from "react";
import { EvalHeader } from "@/components/benchmarks/EvalHeader";
import { ScoreCards } from "@/components/benchmarks/ScoreCards";
import { MetricsRadarChart } from "@/components/benchmarks/RadarChart";
import { AblationChart } from "@/components/benchmarks/AblationChart";
import { DatasetTable } from "@/components/benchmarks/DatasetTable";
import { EvalHistory } from "@/components/benchmarks/EvalHistory";
import {
  startEvalRun,
  fetchEvalStatus,
  fetchEvalResults,
  fetchEvalHistory,
  type EvalResults,
  type EvalRun,
  type EvalStatus,
} from "@/lib/api";

export default function BenchmarksPage() {
  const [results, setResults] = useState<EvalResults | null>(null);
  const [history, setHistory] = useState<EvalRun[]>([]);
  const [status, setStatus] = useState<EvalStatus | null>(null);
  const [loading, setLoading] = useState(true);

  const isRunning = status?.status === "running";

  const loadData = useCallback(async () => {
    try {
      const [resData, histData, statusData] = await Promise.allSettled([
        fetchEvalResults(),
        fetchEvalHistory(),
        fetchEvalStatus(),
      ]);
      if (resData.status === "fulfilled") setResults(resData.value);
      if (histData.status === "fulfilled") setHistory(histData.value.runs);
      if (statusData.status === "fulfilled") setStatus(statusData.value);
    } catch {
      // Results may not exist yet
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Poll while running
  useEffect(() => {
    if (!isRunning) return;
    const interval = setInterval(async () => {
      const s = await fetchEvalStatus();
      setStatus(s);
      if (s.status !== "running") {
        clearInterval(interval);
        loadData();
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [isRunning, loadData]);

  const handleRun = async () => {
    const { run_id, status: s } = await startEvalRun();
    setStatus({ status: "running", run_id, progress: "Starting..." });
  };

  return (
    <div className="h-full overflow-y-auto" style={{ padding: "24px 32px 36px" }}>
      <EvalHeader
        isRunning={isRunning}
        progress={status?.progress || ""}
        lastRun={results?.completed_at || null}
        duration={results?.duration_seconds || null}
        onRun={handleRun}
      />

      {loading ? (
        <div className="grid grid-cols-3 gap-4 mb-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="gradient-card" style={{ padding: "18px 20px", minHeight: 120 }}>
              <div className="skeleton" style={{ width: 100, height: 14, marginBottom: 12 }} />
              <div className="skeleton" style={{ width: 60, height: 36 }} />
            </div>
          ))}
        </div>
      ) : (
        <>
          <ScoreCards scores={results?.overall || null} />

          <div className="grid grid-cols-2 gap-4 mb-6">
            <MetricsRadarChart scores={results?.overall || null} />
            <AblationChart byConfig={results?.by_config || null} />
          </div>

          <DatasetTable byDataset={results?.by_dataset || null} />
          <EvalHistory runs={history} />
        </>
      )}
    </div>
  );
}
```

- [ ] **Step 8: Verify frontend compiles**

Run:
```bash
cd "C:/Users/Iqra Muzaffar/Desktop/MS-Thesis/Primepal/Resume/Hasnain/upwork/docmind-rag/frontend"
npm run build
```

Expected: Build succeeds with no errors.

- [ ] **Step 9: Commit**

```bash
git add frontend/app/benchmarks/ frontend/components/benchmarks/
git commit -m "feat(eval): add Benchmarks dashboard page with charts and tables"
```

---

### Task 10: Integration Test

- [ ] **Step 1: Start all services**

Ensure ChromaDB, backend, and frontend are running:
```bash
# Terminal 1: ChromaDB
chroma run --host localhost --port 8100 --path ./chroma_data

# Terminal 2: Backend
cd backend && uvicorn app.main:app --reload --port 8000

# Terminal 3: Frontend
cd frontend && npm run dev
```

- [ ] **Step 2: Test eval endpoints**

```bash
# Check status (should be no_runs initially)
curl http://localhost:8000/api/eval/status

# Start an eval run
curl -X POST http://localhost:8000/api/eval/run

# Poll status (should show progress)
curl http://localhost:8000/api/eval/status

# After completion, get results
curl http://localhost:8000/api/eval/results

# Get history
curl http://localhost:8000/api/eval/history
```

- [ ] **Step 3: Test Benchmarks page in browser**

Open http://localhost:3000/benchmarks
- Verify "Benchmarks" appears in sidebar
- Click "Run Evaluation" button
- Watch progress update
- After completion: 6 score cards, radar chart, ablation chart, dataset table, history

- [ ] **Step 4: Final commit**

```bash
git add -A
git commit -m "feat(eval): complete RAG benchmarks with RAGAS evaluation and dashboard"
```
