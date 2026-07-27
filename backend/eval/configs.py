"""Retrieval configurations for the ablation study.

Each configuration exposes a ``search_fn`` callable with signature::

    search_fn(query: str, top_k: int, collection=None) -> tuple[list[dict], float]

where the return value is ``(chunks, elapsed_ms)``.

``needs_collection=True`` means the caller must pass a ChromaDB
``Collection`` object as the ``collection`` keyword argument.  This is
needed for ``vector_only`` so the eval harness can point it at a temporary
per-document collection rather than the global one.

The four configurations:

1. **vector_only**   — ChromaDB cosine similarity only.
2. **bm25_only**     — BM25Okapi keyword search only (global in-memory index).
3. **hybrid**        — Vector + BM25 fused with Reciprocal Rank Fusion (k=60).
4. **hybrid_rerank** — Hybrid + ms-marco cross-encoder reranking.
"""

from __future__ import annotations

import time
from typing import Any

# ---------------------------------------------------------------------------
# Private search functions
# ---------------------------------------------------------------------------


def _vector_only_search(
    query: str,
    top_k: int = 20,
    collection=None,
) -> tuple[list[dict[str, Any]], float]:
    """Vector-only search via ChromaDB cosine similarity.

    Parameters
    ----------
    query:
        Natural-language query string.
    top_k:
        Number of results to return.
    collection:
        A ChromaDB ``Collection`` object.  When ``None`` the global
        ``askdocs_chunks`` collection is used via ``chroma_client``.

    Returns
    -------
    tuple[list[dict], float]
        ``(chunks, elapsed_ms)`` where each chunk dict has keys
        ``chunk_id``, ``text``, ``metadata``, ``vector_score``.
    """
    from app.services.embedder import embed_query
    from app.services import chroma_client

    t0 = time.perf_counter()

    query_embedding = embed_query(query)

    if collection is not None:
        raw = collection.query(
            query_embeddings=[query_embedding],
            n_results=top_k,
        )
    else:
        raw = chroma_client.vector_search(query_embedding, top_k=top_k)

    ids: list[str] = (raw.get("ids") or [[]])[0]
    docs: list[str] = (raw.get("documents") or [[]])[0]
    metas: list[dict] = (raw.get("metadatas") or [[]])[0]
    distances: list[float] = (raw.get("distances") or [[]])[0]

    chunks: list[dict[str, Any]] = []
    for cid, doc, meta, dist in zip(ids, docs, metas, distances):
        chunks.append({
            "chunk_id": cid,
            "text": doc,
            "metadata": meta,
            # ChromaDB cosine distance: score = 1 - distance
            "vector_score": float(1.0 - dist),
        })

    elapsed_ms = (time.perf_counter() - t0) * 1000.0
    return chunks, elapsed_ms


def _bm25_only_search(
    query: str,
    top_k: int = 20,
    collection=None,  # unused — BM25 index is global
) -> tuple[list[dict[str, Any]], float]:
    """BM25Okapi keyword search using the global in-memory index.

    Parameters
    ----------
    query:
        Natural-language query string.
    top_k:
        Number of results to return.
    collection:
        Ignored.  Accepted for a uniform call signature.

    Returns
    -------
    tuple[list[dict], float]
        ``(chunks, elapsed_ms)`` where each chunk dict has keys
        ``chunk_id``, ``text``, ``metadata``, ``bm25_score``.
    """
    from app.services import bm25_index

    t0 = time.perf_counter()

    chunks = bm25_index.search(query, top_k=top_k)

    elapsed_ms = (time.perf_counter() - t0) * 1000.0
    return chunks, elapsed_ms


def _hybrid_search(
    query: str,
    top_k: int = 20,
    collection=None,  # unused — hybrid_search uses the global collection
) -> tuple[list[dict[str, Any]], float]:
    """Hybrid vector + BM25 search with Reciprocal Rank Fusion (k=60).

    Parameters
    ----------
    query:
        Natural-language query string.
    top_k:
        Maximum number of results to return after RRF fusion.
    collection:
        Ignored.  Accepted for a uniform call signature.

    Returns
    -------
    tuple[list[dict], float]
        ``(chunks, elapsed_ms)`` where each chunk dict has keys
        ``chunk_id``, ``text``, ``metadata``, ``rrf_score``.
    """
    from app.services.hybrid_search import hybrid_search

    t0 = time.perf_counter()

    chunks = hybrid_search(query, vector_k=top_k, bm25_k=top_k)[:top_k]

    elapsed_ms = (time.perf_counter() - t0) * 1000.0
    return chunks, elapsed_ms


def _hybrid_rerank_search(
    query: str,
    top_k: int = 5,
    collection=None,  # unused
) -> tuple[list[dict[str, Any]], float]:
    """Hybrid search followed by ms-marco cross-encoder reranking.

    Fetches 4× ``top_k`` candidates from the hybrid pipeline, then
    reranks them with the cross-encoder and returns the top ``top_k``.

    Parameters
    ----------
    query:
        Natural-language query string.
    top_k:
        Number of final results to return after reranking.
    collection:
        Ignored.  Accepted for a uniform call signature.

    Returns
    -------
    tuple[list[dict], float]
        ``(chunks, elapsed_ms)`` where each chunk dict has the original
        hybrid keys plus ``rerank_score``.
    """
    from app.services.hybrid_search import hybrid_search
    from app.services.reranker import rerank

    t0 = time.perf_counter()

    # Fetch a larger candidate pool for the reranker to work with
    candidate_k = max(top_k * 4, 20)
    candidates = hybrid_search(query, vector_k=candidate_k, bm25_k=candidate_k)

    chunks = rerank(query, candidates, top_k=top_k)

    elapsed_ms = (time.perf_counter() - t0) * 1000.0
    return chunks, elapsed_ms


# ---------------------------------------------------------------------------
# Public config registry
# ---------------------------------------------------------------------------

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
        "description": "Vector + BM25 fused with Reciprocal Rank Fusion (k=60), no reranker",
        "search_fn": _hybrid_search,
        "needs_collection": False,
    },
    "hybrid_rerank": {
        "name": "Hybrid + Rerank",
        "description": "Hybrid RRF search followed by ms-marco cross-encoder reranking",
        "search_fn": _hybrid_rerank_search,
        "needs_collection": False,
    },
}
