"""ChromaDB client for the ``docmind_chunks`` collection.

Connects to a running ChromaDB instance using ``CHROMA_HOST`` / ``CHROMA_PORT``
from config.  All chunk storage, retrieval, and deletion goes through this
module.
"""

from __future__ import annotations

import threading
from typing import Any

import chromadb
from chromadb.api.models.Collection import Collection

from app.config import get_settings

_COLLECTION_NAME = "docmind_chunks"

_client: chromadb.HttpClient | None = None
_lock = threading.Lock()


def _get_client() -> chromadb.HttpClient:
    """Return a lazily-initialised ChromaDB HTTP client (singleton)."""
    global _client
    if _client is None:
        with _lock:
            if _client is None:
                settings = get_settings()
                _client = chromadb.HttpClient(
                    host=settings.CHROMA_HOST,
                    port=settings.CHROMA_PORT,
                )
    return _client


def get_collection() -> Collection:
    """Get (or create) the ``docmind_chunks`` collection."""
    client = _get_client()
    return client.get_or_create_collection(
        name=_COLLECTION_NAME,
        metadata={"hnsw:space": "cosine"},
    )


# ---------------------------------------------------------------------------
# Write operations
# ---------------------------------------------------------------------------

def add_chunks(
    doc_id: str,
    doc_name: str,
    chunks: list[dict],
    embeddings: list[list[float]],
) -> None:
    """Store chunks with their embeddings in ChromaDB.

    Parameters
    ----------
    doc_id:
        Unique identifier for the parent document.
    doc_name:
        Original filename (stored as metadata for citation).
    chunks:
        Output of ``chunker.chunk_text`` — each dict has ``text``,
        ``page_number``, ``chunk_index``, ``token_count``.
    embeddings:
        Matching list of embedding vectors (one per chunk).
    """
    collection = get_collection()
    ids = [f"{doc_id}_{c['chunk_index']}" for c in chunks]
    documents = [c["text"] for c in chunks]
    metadatas = [
        {
            "doc_id": doc_id,
            "doc_name": doc_name,
            "page_number": c["page_number"],
            "chunk_index": c["chunk_index"],
            "token_count": c["token_count"],
        }
        for c in chunks
    ]

    # ChromaDB recommends batches of <= 5000
    batch_size = 5000
    for start in range(0, len(ids), batch_size):
        end = start + batch_size
        collection.add(
            ids=ids[start:end],
            documents=documents[start:end],
            embeddings=embeddings[start:end],
            metadatas=metadatas[start:end],
        )


def delete_by_doc_id(doc_id: str) -> None:
    """Delete all chunks belonging to *doc_id*."""
    collection = get_collection()
    collection.delete(where={"doc_id": doc_id})


# ---------------------------------------------------------------------------
# Read operations
# ---------------------------------------------------------------------------

def get_all_chunks() -> dict[str, Any]:
    """Return every chunk in the collection (use sparingly)."""
    collection = get_collection()
    return collection.get()


def get_chunks_by_doc_id(doc_id: str) -> dict[str, Any]:
    """Return all chunks that belong to *doc_id*."""
    collection = get_collection()
    return collection.get(where={"doc_id": doc_id})


def vector_search(
    embedding: list[float],
    top_k: int = 20,
) -> dict[str, Any]:
    """Run a cosine-similarity search and return the top *top_k* results.

    Returns
    -------
    dict
        ChromaDB query result with keys ``ids``, ``documents``,
        ``metadatas``, ``distances``.
    """
    collection = get_collection()
    return collection.query(
        query_embeddings=[embedding],
        n_results=top_k,
    )


def get_all_doc_metadata() -> list[dict]:
    """Return a list of unique documents with their chunk counts.

    Each entry: ``{"doc_id", "doc_name", "num_chunks"}``.
    """
    data = get_all_chunks()
    metadatas = data.get("metadatas") or []

    doc_map: dict[str, dict] = {}
    for meta in metadatas:
        did = meta["doc_id"]
        if did not in doc_map:
            doc_map[did] = {
                "doc_id": did,
                "doc_name": meta["doc_name"],
                "num_chunks": 0,
            }
        doc_map[did]["num_chunks"] += 1

    return list(doc_map.values())
