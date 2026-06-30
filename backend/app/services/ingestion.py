"""Ingestion pipeline orchestrator.

Coordinates the full document-processing flow:

    upload bytes  -->  text_extractor  -->  chunker  -->  embedder  -->  chroma_client

Returns a summary dict describing the ingested document.
"""

from __future__ import annotations

import uuid
from datetime import datetime, timezone
from pathlib import PurePosixPath

from app.services.text_extractor import extract_text
from app.services.chunker import chunk_text
from app.services.embedder import embed_texts
from app.services import chroma_client


def ingest_document(filename: str, file_bytes: bytes) -> dict:
    """Run the full ingestion pipeline for a single uploaded file.

    Parameters
    ----------
    filename:
        Original filename with extension (e.g. ``"report.pdf"``).
    file_bytes:
        Raw bytes of the uploaded file.

    Returns
    -------
    dict
        Summary with keys: ``id``, ``filename``, ``file_type``,
        ``file_size_bytes``, ``num_pages``, ``num_chunks``, ``uploaded_at``.

    Raises
    ------
    ValueError
        If the file type is unsupported or extraction yields no text.
    """
    doc_id = str(uuid.uuid4())
    file_type = PurePosixPath(filename).suffix.lstrip(".").lower()

    # 1. Extract text (page-level)
    pages = extract_text(filename, file_bytes)
    if not pages:
        raise ValueError(f"No text could be extracted from '{filename}'.")

    # 2. Chunk
    chunks = chunk_text(pages)
    if not chunks:
        raise ValueError(f"Chunking produced no output for '{filename}'.")

    # 3. Embed
    texts = [c["text"] for c in chunks]
    embeddings = embed_texts(texts)

    # 4. Store in ChromaDB
    chroma_client.add_chunks(
        doc_id=doc_id,
        doc_name=filename,
        chunks=chunks,
        embeddings=embeddings,
    )

    return {
        "id": doc_id,
        "filename": filename,
        "file_type": file_type,
        "file_size_bytes": len(file_bytes),
        "num_pages": len(pages),
        "num_chunks": len(chunks),
        "uploaded_at": datetime.now(timezone.utc).isoformat(),
    }
