"""Singleton wrapper around sentence-transformers for text embedding.

The ``all-MiniLM-L6-v2`` model (384-dim) is loaded once on first access
and reused for the lifetime of the process.
"""

from __future__ import annotations

import threading
from typing import List


class Embedder:
    """Thin wrapper that lazily loads the sentence-transformer model."""

    _instance: "Embedder | None" = None
    _lock = threading.Lock()

    def __init__(self) -> None:
        from sentence_transformers import SentenceTransformer

        self._model = SentenceTransformer("all-MiniLM-L6-v2")

    # ---- singleton access ------------------------------------------------

    @classmethod
    def get_instance(cls) -> "Embedder":
        """Return (or create) the global singleton."""
        if cls._instance is None:
            with cls._lock:
                if cls._instance is None:
                    cls._instance = cls()
        return cls._instance

    # ---- public methods --------------------------------------------------

    def embed_texts(self, texts: list[str]) -> list[list[float]]:
        """Embed a batch of texts.

        Parameters
        ----------
        texts:
            List of strings to embed.

        Returns
        -------
        list[list[float]]
            One 384-dim embedding per input text.
        """
        embeddings = self._model.encode(texts, show_progress_bar=False)
        return [emb.tolist() for emb in embeddings]

    def embed_query(self, query: str) -> list[float]:
        """Embed a single query string.

        Parameters
        ----------
        query:
            The search query to embed.

        Returns
        -------
        list[float]
            384-dim embedding.
        """
        embedding = self._model.encode(query, show_progress_bar=False)
        return embedding.tolist()


# ---------------------------------------------------------------------------
# Module-level convenience functions
# ---------------------------------------------------------------------------

def get_embedder() -> Embedder:
    """Return the singleton :class:`Embedder` instance."""
    return Embedder.get_instance()


def embed_texts(texts: list[str]) -> list[list[float]]:
    """Embed a batch of texts using the singleton model."""
    return get_embedder().embed_texts(texts)


def embed_query(query: str) -> list[float]:
    """Embed a single query using the singleton model."""
    return get_embedder().embed_query(query)
