"""Stats router — dashboard statistics for the admin UI.

Uses SQLite for persistent query metrics (survives restarts).
Document/chunk counts come from ChromaDB.
"""

from __future__ import annotations

import threading
from collections import defaultdict
from datetime import datetime, timezone
from typing import Any

from fastapi import APIRouter

from app.models.schemas import RecentQuery, StatsResponse
from app.services import chroma_client
from app.services.stats_db import log_query as db_log_query, get_recent_queries, get_stats_summary

router = APIRouter(prefix="/api/stats", tags=["stats"])

# ---------------------------------------------------------------------------
# In-memory fallback state (used if SQLite not yet initialized)
# ---------------------------------------------------------------------------

_lock = threading.Lock()
_queries: list[dict[str, Any]] = []
_confidence_scores: list[float] = []
_retrieval_times: list[float] = []
_MAX_RECENT = 50


def record_query(
    question: str,
    confidence: float,
    retrieval_time_ms: float,
) -> None:
    """Record a completed query for statistics tracking.

    Called from the chat router after each query completes.
    Also logs to SQLite asynchronously.
    """
    with _lock:
        entry = {
            "question": question,
            "confidence": confidence,
            "retrieval_time_ms": retrieval_time_ms,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }
        _queries.append(entry)
        _confidence_scores.append(confidence)
        _retrieval_times.append(retrieval_time_ms)

        if len(_queries) > _MAX_RECENT:
            _queries.pop(0)
        if len(_confidence_scores) > _MAX_RECENT:
            _confidence_scores.pop(0)
        if len(_retrieval_times) > _MAX_RECENT:
            _retrieval_times.pop(0)

    # Also log to SQLite (fire-and-forget via import)
    import asyncio
    try:
        loop = asyncio.get_event_loop()
        if loop.is_running():
            loop.create_task(db_log_query(question, confidence, retrieval_time_ms))
    except RuntimeError:
        pass


# ---------------------------------------------------------------------------
# Endpoint
# ---------------------------------------------------------------------------

@router.get("", response_model=StatsResponse)
async def get_stats():
    """Return dashboard statistics.

    Aggregates document/chunk counts from ChromaDB and query metrics
    from SQLite (with in-memory fallback).
    """
    # Document and chunk data from ChromaDB
    all_data = chroma_client.get_all_chunks()
    metadatas = all_data.get("metadatas") or []

    doc_map: dict[str, dict[str, Any]] = {}
    total_tokens = 0
    type_counts: dict[str, int] = defaultdict(int)

    for meta in metadatas:
        doc_id = meta.get("doc_id", "")
        if doc_id and doc_id not in doc_map:
            doc_name = meta.get("doc_name", "unknown")
            ext = doc_name.rsplit(".", 1)[-1].lower() if "." in doc_name else "unknown"
            doc_map[doc_id] = {"doc_name": doc_name, "type": ext}
            type_counts[ext] += 1
        total_tokens += meta.get("token_count", 0)

    total_chunks = len(metadatas)
    total_documents = len(doc_map)
    avg_tokens = total_tokens / total_chunks if total_chunks > 0 else 0.0

    # Query metrics — try SQLite first, fallback to in-memory
    stats_summary = await get_stats_summary()
    recent_db = await get_recent_queries(10)

    if stats_summary["total_queries"] > 0:
        # Use SQLite data
        total_queries = stats_summary["total_queries"]
        avg_confidence = stats_summary["avg_confidence"]
        avg_retrieval_time = stats_summary["avg_retrieval_time_ms"]
        recent = [
            RecentQuery(
                question=q["question"],
                confidence=q["confidence"],
                timestamp=q["timestamp"],
            )
            for q in recent_db
        ]
    else:
        # Fallback to in-memory
        with _lock:
            total_queries = len(_confidence_scores)
            avg_confidence = (
                sum(_confidence_scores) / len(_confidence_scores)
                if _confidence_scores
                else 0.0
            )
            avg_retrieval_time = (
                sum(_retrieval_times) / len(_retrieval_times)
                if _retrieval_times
                else 0.0
            )
            recent = [
                RecentQuery(
                    question=q["question"],
                    confidence=q["confidence"],
                    timestamp=q["timestamp"],
                )
                for q in _queries[-10:]
            ]

    return StatsResponse(
        total_documents=total_documents,
        total_chunks=total_chunks,
        avg_chunk_tokens=round(avg_tokens, 1),
        total_queries=total_queries,
        avg_confidence=round(avg_confidence, 4),
        avg_retrieval_time_ms=round(avg_retrieval_time, 2),
        recent_queries=list(reversed(recent)) if stats_summary["total_queries"] == 0 else recent,
        documents_by_type=dict(type_counts),
    )
