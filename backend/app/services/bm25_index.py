"""In-memory BM25 index built from ChromaDB chunks.

Rebuilt on application startup and updated incrementally when documents
are added or removed.  A parallel ``_chunk_ids`` list maps BM25 positions
back to ChromaDB chunk IDs.
"""

from __future__ import annotations

import logging
import threading
from typing import Any

from rank_bm25 import BM25Okapi

from app.services import chroma_client

logger = logging.getLogger(__name__)

_bm25: BM25Okapi | None = None
_chunk_ids: list[str] = []
_chunk_texts: list[str] = []
_chunk_metadatas: list[dict[str, Any]] = []
_lock = threading.Lock()


def _tokenize(text: str) -> list[str]:
    """Simple whitespace tokenizer (matches chunker's token counting)."""
    return text.lower().split()


# ---------------------------------------------------------------------------
# Index lifecycle
# ---------------------------------------------------------------------------

def build_index() -> int:
    """(Re-)build the BM25 index from all chunks currently in ChromaDB.

    Returns the number of chunks indexed.
    """
    global _bm25, _chunk_ids, _chunk_texts, _chunk_metadatas

    data = chroma_client.get_all_chunks()
    ids: list[str] = data.get("ids") or []
    documents: list[str] = data.get("documents") or []
    metadatas: list[dict] = data.get("metadatas") or []

    with _lock:
        _chunk_ids = list(ids)
        _chunk_texts = list(documents)
        _chunk_metadatas = list(metadatas)

        if _chunk_texts:
            corpus = [_tokenize(t) for t in _chunk_texts]
            _bm25 = BM25Okapi(corpus)
        else:
            _bm25 = None

    logger.info("BM25 index built with %d chunks", len(_chunk_ids))
    return len(_chunk_ids)


def add_to_index(chunks: list[dict[str, Any]]) -> None:
    """Add newly ingested chunks to the BM25 index.

    Parameters
    ----------
    chunks:
        List of dicts, each with at least ``chunk_id``, ``text``, and
        ``metadata``.
    """
    global _bm25, _chunk_ids, _chunk_texts, _chunk_metadatas

    if not chunks:
        return

    with _lock:
        for chunk in chunks:
            _chunk_ids.append(chunk["chunk_id"])
            _chunk_texts.append(chunk["text"])
            _chunk_metadatas.append(chunk.get("metadata", {}))

        # Rebuild BM25 — rank_bm25 doesn't support incremental adds
        if _chunk_texts:
            corpus = [_tokenize(t) for t in _chunk_texts]
            _bm25 = BM25Okapi(corpus)


def remove_from_index(doc_id: str) -> None:
    """Remove all chunks belonging to *doc_id* from the BM25 index."""
    global _bm25, _chunk_ids, _chunk_texts, _chunk_metadatas

    with _lock:
        indices_to_keep = [
            i for i, meta in enumerate(_chunk_metadatas)
            if meta.get("doc_id") != doc_id
        ]

        _chunk_ids = [_chunk_ids[i] for i in indices_to_keep]
        _chunk_texts = [_chunk_texts[i] for i in indices_to_keep]
        _chunk_metadatas = [_chunk_metadatas[i] for i in indices_to_keep]

        if _chunk_texts:
            corpus = [_tokenize(t) for t in _chunk_texts]
            _bm25 = BM25Okapi(corpus)
        else:
            _bm25 = None

    logger.info("BM25 index updated: removed chunks for doc_id=%s", doc_id)


# ---------------------------------------------------------------------------
# Search
# ---------------------------------------------------------------------------

def search(query: str, top_k: int = 20) -> list[dict[str, Any]]:
    """Search the BM25 index and return the top *top_k* results.

    Returns
    -------
    list[dict]
        Each dict: ``{"chunk_id", "text", "metadata", "bm25_score"}``.
    """
    if _bm25 is None or not _chunk_ids:
        return []

    tokenized_query = _tokenize(query)
    scores = _bm25.get_scores(tokenized_query)

    # Get top-k indices sorted by score descending
    scored_indices = sorted(
        range(len(scores)),
        key=lambda i: scores[i],
        reverse=True,
    )[:top_k]

    results: list[dict[str, Any]] = []
    for idx in scored_indices:
        if scores[idx] <= 0:
            continue
        results.append({
            "chunk_id": _chunk_ids[idx],
            "text": _chunk_texts[idx],
            "metadata": _chunk_metadatas[idx],
            "bm25_score": float(scores[idx]),
        })

    return results
