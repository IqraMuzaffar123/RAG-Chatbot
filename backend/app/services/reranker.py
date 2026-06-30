"""Cross-encoder re-ranking using ``ms-marco-MiniLM-L-6-v2``.

The model is loaded once on first access (singleton pattern) and reused
for the lifetime of the process.
"""

from __future__ import annotations

import logging
import threading
from typing import Any

logger = logging.getLogger(__name__)

_model: Any = None
_lock = threading.Lock()


def _get_model():
    """Return the lazily-initialised cross-encoder model."""
    global _model
    if _model is None:
        with _lock:
            if _model is None:
                from sentence_transformers import CrossEncoder

                logger.info("Loading cross-encoder/ms-marco-MiniLM-L-6-v2 ...")
                _model = CrossEncoder("cross-encoder/ms-marco-MiniLM-L-6-v2")
                logger.info("Cross-encoder loaded.")
    return _model


def load_model() -> None:
    """Eagerly load the cross-encoder model (called at startup)."""
    _get_model()


def rerank(
    query: str,
    chunks: list[dict[str, Any]],
    top_k: int = 5,
) -> list[dict[str, Any]]:
    """Re-rank *chunks* by cross-encoder relevance to *query*.

    Parameters
    ----------
    query:
        The user's natural-language question.
    chunks:
        List of dicts with at least a ``"text"`` key.
    top_k:
        Number of top results to return.

    Returns
    -------
    list[dict]
        The top *top_k* chunks sorted by descending ``rerank_score``.
        Each dict is the original chunk dict augmented with
        ``"rerank_score"``.
    """
    if not chunks:
        return []

    model = _get_model()

    # Build (query, chunk_text) pairs
    pairs = [(query, chunk["text"]) for chunk in chunks]
    scores = model.predict(pairs)

    # Attach scores and sort
    scored_chunks: list[dict[str, Any]] = []
    for chunk, score in zip(chunks, scores):
        scored_chunk = dict(chunk)
        scored_chunk["rerank_score"] = float(score)
        scored_chunks.append(scored_chunk)

    scored_chunks.sort(key=lambda c: c["rerank_score"], reverse=True)

    return scored_chunks[:top_k]
