"""Retrieval pipeline orchestrator.

Coordinates the full query-answering flow:

    question  -->  hybrid_search  -->  rerank  -->  LLM (streaming)  -->  cited answer
"""

from __future__ import annotations

import asyncio
import time
import logging
from typing import Any, AsyncGenerator

from app.config import get_settings
from app.services.hybrid_search import hybrid_search
from app.services.reranker import rerank
from app.services.llm_client import generate_stream, SYSTEM_PROMPT
from app.services import chroma_client

logger = logging.getLogger(__name__)


def _format_context(chunks: list[dict[str, Any]]) -> str:
    """Format retrieved chunks into a context string for the LLM."""
    parts: list[str] = []
    for i, chunk in enumerate(chunks, 1):
        meta = chunk.get("metadata", {})
        doc_name = meta.get("doc_name", "unknown")
        page = meta.get("page_number", "?")
        parts.append(
            f"[Source {i}: {doc_name}, p.{page}]\n{chunk['text']}\n"
        )
    return "\n---\n".join(parts)


def _build_sources(chunks: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Build source info dicts from reranked chunks."""
    sources: list[dict[str, Any]] = []
    for chunk in chunks:
        meta = chunk.get("metadata", {})
        sources.append({
            "chunk_id": chunk.get("chunk_id", ""),
            "document_name": meta.get("doc_name", "unknown"),
            "page_number": meta.get("page_number", 0),
            "text": chunk.get("text", ""),
            "relevance_score": round(chunk.get("rrf_score", 0.0), 4),
            "rerank_score": round(chunk.get("rerank_score", 0.0), 4),
        })
    return sources


async def retrieve_and_answer(
    question: str,
    top_k: int = 5,
    use_reranking: bool = True,
    conversation_history: list[dict[str, str]] | None = None,
) -> AsyncGenerator[dict[str, Any], None]:
    """Run the full retrieval + generation pipeline, yielding events.

    Yields three types of events (as dicts):

    1. ``{"type": "sources", "data": [...]}`` — the source chunks.
    2. ``{"type": "token", "data": "..."}`` — each LLM token.
    3. ``{"type": "metadata", "data": {...}}`` — retrieval metadata.

    Parameters
    ----------
    question:
        The user's natural-language question.
    top_k:
        Number of final chunks to send to the LLM.
    use_reranking:
        Whether to apply cross-encoder re-ranking.
    """
    settings = get_settings()
    retrieval_start = time.perf_counter()

    # Count total chunks for metadata (lightweight count, not full fetch)
    collection = chroma_client.get_collection()
    total_chunks = collection.count()

    # 1. Hybrid search (CPU-bound — run in thread to avoid blocking event loop)
    vector_k = settings.VECTOR_SEARCH_K
    bm25_k = settings.BM25_SEARCH_K
    hybrid_results = await asyncio.to_thread(
        hybrid_search, question, vector_k, bm25_k
    )
    after_fusion = len(hybrid_results)

    # 2. Re-rank (optional, CPU-bound — run in thread)
    if use_reranking and hybrid_results:
        reranked = await asyncio.to_thread(rerank, question, hybrid_results, top_k)
        after_reranking = len(reranked)
    else:
        reranked = hybrid_results[:top_k]
        after_reranking = len(reranked)
        # Add a dummy rerank_score for consistency
        for chunk in reranked:
            chunk.setdefault("rerank_score", 0.0)

    retrieval_time = (time.perf_counter() - retrieval_start) * 1000  # ms

    # 3. Yield sources
    sources = _build_sources(reranked)
    yield {"type": "sources", "data": sources}

    # 4. Format context and generate answer
    context = _format_context(reranked)
    user_message = (
        f"Context documents:\n\n{context}\n\n---\n\n"
        f"Question: {question}"
    )

    generation_start = time.perf_counter()
    answer_tokens: list[str] = []

    async for token in generate_stream(SYSTEM_PROMPT, user_message, conversation_history):
        answer_tokens.append(token)
        yield {"type": "token", "data": token}

    generation_time = (time.perf_counter() - generation_start) * 1000  # ms

    # 5. Compute confidence from rerank scores
    if reranked and any(c.get("rerank_score", 0) for c in reranked):
        raw_scores = [c.get("rerank_score", 0.0) for c in reranked]
        # Normalize cross-encoder scores (they can be negative) to 0-1
        min_s, max_s = min(raw_scores), max(raw_scores)
        if max_s > min_s:
            confidence = sum(
                (s - min_s) / (max_s - min_s) for s in raw_scores
            ) / len(raw_scores)
        else:
            # All scores are equal — use sigmoid-like normalization
            import math
            confidence = 1.0 / (1.0 + math.exp(-raw_scores[0]))
    else:
        confidence = 0.0

    confidence = round(min(max(confidence, 0.0), 1.0), 4)

    # 6. Yield metadata
    yield {
        "type": "metadata",
        "data": {
            "confidence": confidence,
            "retrieval_metadata": {
                "total_chunks_searched": total_chunks,
                "vector_candidates": vector_k,
                "bm25_candidates": bm25_k,
                "after_fusion": after_fusion,
                "after_reranking": after_reranking,
                "retrieval_time_ms": round(retrieval_time, 2),
                "generation_time_ms": round(generation_time, 2),
            },
        },
    }
