"""Hybrid search combining vector similarity and BM25 with Reciprocal Rank Fusion.

Steps
-----
1. Embed query -> vector search (ChromaDB cosine similarity).
2. BM25 keyword search.
3. Reciprocal Rank Fusion:  ``score = sum(1 / (k + rank))``  with *k = 60*.
4. Deduplicate by chunk_id.
5. Return top results sorted by RRF score.
"""

from __future__ import annotations

from typing import Any

from app.services import chroma_client
from app.services.embedder import embed_query
from app.services import bm25_index


_RRF_K = 60  # constant for Reciprocal Rank Fusion


def hybrid_search(
    query: str,
    vector_k: int = 20,
    bm25_k: int = 20,
) -> list[dict[str, Any]]:
    """Run hybrid (vector + BM25) search with RRF fusion.

    Parameters
    ----------
    query:
        Natural language query string.
    vector_k:
        Number of candidates from vector search.
    bm25_k:
        Number of candidates from BM25 search.

    Returns
    -------
    list[dict]
        Sorted by descending RRF score. Each dict:
        ``{"chunk_id", "text", "metadata", "rrf_score"}``.
    """
    # 1. Vector search via ChromaDB
    query_embedding = embed_query(query)
    vector_results = chroma_client.vector_search(query_embedding, top_k=vector_k)

    vector_ids: list[str] = (vector_results.get("ids") or [[]])[0]
    vector_docs: list[str] = (vector_results.get("documents") or [[]])[0]
    vector_metas: list[dict] = (vector_results.get("metadatas") or [[]])[0]

    # 2. BM25 search
    bm25_results = bm25_index.search(query, top_k=bm25_k)

    # 3. Build RRF scores
    rrf_scores: dict[str, float] = {}
    chunk_data: dict[str, dict[str, Any]] = {}

    # Score vector results
    for rank, (cid, doc, meta) in enumerate(
        zip(vector_ids, vector_docs, vector_metas)
    ):
        rrf_scores[cid] = rrf_scores.get(cid, 0.0) + 1.0 / (_RRF_K + rank + 1)
        if cid not in chunk_data:
            chunk_data[cid] = {"text": doc, "metadata": meta}

    # Score BM25 results
    for rank, item in enumerate(bm25_results):
        cid = item["chunk_id"]
        rrf_scores[cid] = rrf_scores.get(cid, 0.0) + 1.0 / (_RRF_K + rank + 1)
        if cid not in chunk_data:
            chunk_data[cid] = {"text": item["text"], "metadata": item["metadata"]}

    # 4. Sort by RRF score descending
    sorted_ids = sorted(rrf_scores, key=lambda cid: rrf_scores[cid], reverse=True)

    # 5. Build output (already deduplicated via dict keys)
    results: list[dict[str, Any]] = []
    for cid in sorted_ids:
        results.append({
            "chunk_id": cid,
            "text": chunk_data[cid]["text"],
            "metadata": chunk_data[cid]["metadata"],
            "rrf_score": rrf_scores[cid],
        })

    return results
