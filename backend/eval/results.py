"""SQLite CRUD for eval_runs and eval_results tables.

All DB access is async via aiosqlite, using the same stats.db file
as the query-stats module so there is only one SQLite file to manage.
"""

from __future__ import annotations

import logging
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import aiosqlite

logger = logging.getLogger(__name__)

# Same DB as backend/app/services/stats_db.py
DB_PATH = Path(__file__).resolve().parent.parent / "data" / "stats.db"

METRICS = [
    "faithfulness",
    "answer_relevancy",
    "context_precision",
    "context_recall",
    "answer_correctness",
    "hallucination_rate",
]

_CREATE_RUNS = """
CREATE TABLE IF NOT EXISTS eval_runs (
    id TEXT PRIMARY KEY,
    status TEXT NOT NULL DEFAULT 'pending',
    started_at TEXT,
    completed_at TEXT,
    duration_seconds REAL,
    total_questions INTEGER DEFAULT 0,
    progress TEXT DEFAULT '',
    error_message TEXT
);
"""

_CREATE_RESULTS = """
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
);
"""


async def init_eval_tables() -> None:
    """Create eval_runs and eval_results tables if they do not yet exist."""
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    async with aiosqlite.connect(str(DB_PATH)) as db:
        await db.execute(_CREATE_RUNS)
        await db.execute(_CREATE_RESULTS)
        await db.commit()
    logger.info("Eval tables initialised at %s", DB_PATH)


async def create_run() -> str:
    """Insert a new eval run row in 'running' status and return its UUID."""
    run_id = str(uuid.uuid4())
    started_at = datetime.now(timezone.utc).isoformat()
    async with aiosqlite.connect(str(DB_PATH)) as db:
        await db.execute(
            "INSERT INTO eval_runs (id, status, started_at) VALUES (?, 'running', ?)",
            (run_id, started_at),
        )
        await db.commit()
    logger.info("Eval run created: %s", run_id)
    return run_id


async def update_run_progress(run_id: str, progress: str) -> None:
    """Update the free-text progress field for a run."""
    async with aiosqlite.connect(str(DB_PATH)) as db:
        await db.execute(
            "UPDATE eval_runs SET progress = ? WHERE id = ?",
            (progress, run_id),
        )
        await db.commit()


async def complete_run(run_id: str, total_questions: int) -> None:
    """Mark a run as completed and record duration + question count."""
    completed_at = datetime.now(timezone.utc).isoformat()
    async with aiosqlite.connect(str(DB_PATH)) as db:
        # Fetch started_at to compute duration
        cursor = await db.execute(
            "SELECT started_at FROM eval_runs WHERE id = ?", (run_id,)
        )
        row = await cursor.fetchone()
        duration: float | None = None
        if row and row[0]:
            try:
                started = datetime.fromisoformat(row[0])
                completed = datetime.fromisoformat(completed_at)
                duration = (completed - started).total_seconds()
            except ValueError:
                pass

        await db.execute(
            "UPDATE eval_runs "
            "SET status = 'completed', completed_at = ?, duration_seconds = ?, total_questions = ? "
            "WHERE id = ?",
            (completed_at, duration, total_questions, run_id),
        )
        await db.commit()
    logger.info("Eval run completed: %s (%s questions)", run_id, total_questions)


async def fail_run(run_id: str, error: str) -> None:
    """Mark a run as failed and store the error message."""
    completed_at = datetime.now(timezone.utc).isoformat()
    async with aiosqlite.connect(str(DB_PATH)) as db:
        await db.execute(
            "UPDATE eval_runs "
            "SET status = 'failed', completed_at = ?, error_message = ? "
            "WHERE id = ?",
            (completed_at, error, run_id),
        )
        await db.commit()
    logger.warning("Eval run failed: %s — %s", run_id, error)


async def save_result(
    run_id: str,
    dataset: str,
    config: str,
    scores: dict[str, float],
    num_questions: int,
    avg_retrieval_ms: float,
    avg_answer_ms: float,
) -> None:
    """Persist one dataset×config result row.

    hallucination_rate is derived as ``1.0 - faithfulness`` if not
    already present in *scores*.
    """
    faithfulness = scores.get("faithfulness")
    hallucination_rate = scores.get(
        "hallucination_rate",
        (1.0 - faithfulness) if faithfulness is not None else None,
    )

    async with aiosqlite.connect(str(DB_PATH)) as db:
        await db.execute(
            "INSERT INTO eval_results "
            "(run_id, dataset, config, faithfulness, answer_relevancy, "
            " context_precision, context_recall, answer_correctness, "
            " hallucination_rate, num_questions, avg_retrieval_time_ms, avg_answer_time_ms) "
            "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
            (
                run_id,
                dataset,
                config,
                faithfulness,
                scores.get("answer_relevancy"),
                scores.get("context_precision"),
                scores.get("context_recall"),
                scores.get("answer_correctness"),
                hallucination_rate,
                num_questions,
                avg_retrieval_ms,
                avg_answer_ms,
            ),
        )
        await db.commit()


async def get_run_status(run_id: str | None = None) -> dict[str, Any] | None:
    """Return status dict for *run_id*, or for the latest run when None."""
    async with aiosqlite.connect(str(DB_PATH)) as db:
        db.row_factory = aiosqlite.Row
        if run_id:
            cursor = await db.execute(
                "SELECT * FROM eval_runs WHERE id = ?", (run_id,)
            )
        else:
            cursor = await db.execute(
                "SELECT * FROM eval_runs ORDER BY started_at DESC LIMIT 1"
            )
        row = await cursor.fetchone()
        if row is None:
            return None
        return dict(row)


async def get_active_run() -> dict[str, Any] | None:
    """Return the currently running eval run, or None if no run is active."""
    async with aiosqlite.connect(str(DB_PATH)) as db:
        db.row_factory = aiosqlite.Row
        cursor = await db.execute(
            "SELECT * FROM eval_runs WHERE status = 'running' ORDER BY started_at DESC LIMIT 1"
        )
        row = await cursor.fetchone()
        if row is None:
            return None
        return dict(row)


def _avg_metrics(rows: list[dict]) -> dict[str, float | None]:
    """Return per-metric averages across *rows*, skipping None values."""
    totals: dict[str, list[float]] = {m: [] for m in METRICS}
    for row in rows:
        for m in METRICS:
            v = row.get(m)
            if v is not None:
                totals[m].append(v)
    return {
        m: (sum(vs) / len(vs)) if vs else None
        for m, vs in totals.items()
    }


async def get_latest_results() -> dict[str, Any] | None:
    """Return a rich results dict from the most recent completed run.

    Shape::

        {
            "run_id": str,
            "completed_at": str,
            "duration_seconds": float,
            "total_questions": int,
            "overall": { metric: float, ... },       # hybrid_rerank config averaged
            "by_dataset": { dataset: { metric: float } },
            "by_config":  { config:  { metric: float } },
            "matrix": [ raw result rows ],
        }
    """
    async with aiosqlite.connect(str(DB_PATH)) as db:
        db.row_factory = aiosqlite.Row

        # Find latest completed run
        cursor = await db.execute(
            "SELECT * FROM eval_runs WHERE status = 'completed' "
            "ORDER BY completed_at DESC LIMIT 1"
        )
        run_row = await cursor.fetchone()
        if run_row is None:
            return None
        run = dict(run_row)

        # Fetch all results for that run
        cursor = await db.execute(
            "SELECT * FROM eval_results WHERE run_id = ?", (run["id"],)
        )
        result_rows = [dict(r) for r in await cursor.fetchall()]

    if not result_rows:
        return None

    # by_dataset — average all configs per dataset
    by_dataset: dict[str, dict] = {}
    datasets = {r["dataset"] for r in result_rows}
    for ds in datasets:
        rows_ds = [r for r in result_rows if r["dataset"] == ds]
        by_dataset[ds] = _avg_metrics(rows_ds)

    # by_config — average all datasets per config
    by_config: dict[str, dict] = {}
    configs = {r["config"] for r in result_rows}
    for cfg in configs:
        rows_cfg = [r for r in result_rows if r["config"] == cfg]
        by_config[cfg] = _avg_metrics(rows_cfg)

    # overall — use hybrid_rerank config if present, else average everything
    if "hybrid_rerank" in by_config:
        overall = by_config["hybrid_rerank"]
    else:
        overall = _avg_metrics(result_rows)

    return {
        "run_id": run["id"],
        "completed_at": run["completed_at"],
        "duration_seconds": run["duration_seconds"],
        "total_questions": run["total_questions"],
        "overall": overall,
        "by_dataset": by_dataset,
        "by_config": by_config,
        "matrix": result_rows,
    }


async def get_eval_history(limit: int = 20) -> list[dict[str, Any]]:
    """Return the *limit* most recent eval runs (newest first)."""
    async with aiosqlite.connect(str(DB_PATH)) as db:
        db.row_factory = aiosqlite.Row
        cursor = await db.execute(
            "SELECT * FROM eval_runs ORDER BY started_at DESC LIMIT ?",
            (limit,),
        )
        rows = await cursor.fetchall()
        return [dict(r) for r in rows]
