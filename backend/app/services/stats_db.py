"""Persistent query statistics using SQLite.

Stores query metrics so they survive backend restarts.
Uses aiosqlite for async access.
"""

from __future__ import annotations

import logging
import os
from datetime import datetime, timezone
from pathlib import Path

import aiosqlite

logger = logging.getLogger(__name__)

# SQLite database path — sibling to backend/app
DB_DIR = Path(__file__).resolve().parent.parent.parent / "data"
DB_PATH = DB_DIR / "stats.db"

_CREATE_TABLE = """
CREATE TABLE IF NOT EXISTS queries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    question TEXT NOT NULL,
    confidence REAL NOT NULL DEFAULT 0.0,
    retrieval_time_ms REAL NOT NULL DEFAULT 0.0,
    sources_count INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
)
"""


async def init_db() -> None:
    """Create the stats database and table if they don't exist."""
    DB_DIR.mkdir(parents=True, exist_ok=True)
    async with aiosqlite.connect(str(DB_PATH)) as db:
        await db.execute(_CREATE_TABLE)
        await db.commit()
    logger.info("Stats DB initialized at %s", DB_PATH)


async def log_query(
    question: str,
    confidence: float,
    retrieval_time_ms: float,
    sources_count: int = 0,
) -> None:
    """Record a completed query."""
    try:
        async with aiosqlite.connect(str(DB_PATH)) as db:
            await db.execute(
                "INSERT INTO queries (question, confidence, retrieval_time_ms, sources_count, created_at) "
                "VALUES (?, ?, ?, ?, ?)",
                (
                    question,
                    confidence,
                    retrieval_time_ms,
                    sources_count,
                    datetime.now(timezone.utc).isoformat(),
                ),
            )
            await db.commit()
    except Exception as exc:
        logger.warning("Failed to log query to stats DB: %s", exc)


async def get_recent_queries(limit: int = 10) -> list[dict]:
    """Return the most recent queries."""
    try:
        async with aiosqlite.connect(str(DB_PATH)) as db:
            db.row_factory = aiosqlite.Row
            cursor = await db.execute(
                "SELECT question, confidence, created_at FROM queries "
                "ORDER BY id DESC LIMIT ?",
                (limit,),
            )
            rows = await cursor.fetchall()
            return [
                {
                    "question": row["question"],
                    "confidence": row["confidence"],
                    "timestamp": row["created_at"],
                }
                for row in rows
            ]
    except Exception as exc:
        logger.warning("Failed to read from stats DB: %s", exc)
        return []


async def get_stats_summary() -> dict:
    """Return aggregate query stats."""
    try:
        async with aiosqlite.connect(str(DB_PATH)) as db:
            cursor = await db.execute(
                "SELECT COUNT(*) as total, "
                "COALESCE(AVG(confidence), 0) as avg_conf, "
                "COALESCE(AVG(retrieval_time_ms), 0) as avg_time "
                "FROM queries"
            )
            row = await cursor.fetchone()
            if row:
                return {
                    "total_queries": row[0],
                    "avg_confidence": round(row[1], 4),
                    "avg_retrieval_time_ms": round(row[2], 2),
                }
            return {"total_queries": 0, "avg_confidence": 0.0, "avg_retrieval_time_ms": 0.0}
    except Exception as exc:
        logger.warning("Failed to get stats summary: %s", exc)
        return {"total_queries": 0, "avg_confidence": 0.0, "avg_retrieval_time_ms": 0.0}
