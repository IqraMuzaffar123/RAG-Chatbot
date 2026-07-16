"""Documents router — upload, list, view, and delete documents.

All document persistence is handled by the ingestion service (which writes
to ChromaDB).  The BM25 index is updated on add/delete.
"""

from __future__ import annotations

import asyncio
import logging
from typing import Any

from fastapi import APIRouter, File, HTTPException, Query, UploadFile

from app.models.schemas import (
    ChunkListResponse,
    ChunkResponse,
    DocumentDetailResponse,
    DocumentListResponse,
    DocumentResponse,
    UploadResponse,
)
from app.services import chroma_client
from app.services.ingestion import ingest_document
from app.services import bm25_index

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/documents", tags=["documents"])

_MAX_FILE_SIZE = 20 * 1024 * 1024  # 20 MB
_ALLOWED_EXTENSIONS = {"pdf", "docx", "txt"}

# In-memory document metadata store (supplements ChromaDB which only stores chunks)
_doc_store: dict[str, dict[str, Any]] = {}


def _get_extension(filename: str) -> str:
    """Extract and lowercase the file extension."""
    return filename.rsplit(".", 1)[-1].lower() if "." in filename else ""


# ---------------------------------------------------------------------------
# Upload
# ---------------------------------------------------------------------------

@router.post("/upload", response_model=UploadResponse)
async def upload_documents(files: list[UploadFile] = File(...)):
    """Upload one or more documents (PDF, DOCX, TXT) for ingestion.

    Files are processed synchronously: extract -> chunk -> embed -> store.
    Each file's chunks are also added to the in-memory BM25 index.
    """
    # Validate file count
    if len(files) > 10:
        raise HTTPException(
            status_code=400,
            detail=f"Too many files ({len(files)}). Maximum 10 files per upload.",
        )

    results: list[DocumentResponse] = []

    for upload in files:
        # Validate extension
        ext = _get_extension(upload.filename or "")
        if ext not in _ALLOWED_EXTENSIONS:
            raise HTTPException(
                status_code=400,
                detail=f"Unsupported file type '.{ext}'. Allowed: {_ALLOWED_EXTENSIONS}",
            )

        # Read bytes and validate size
        file_bytes = await upload.read()
        if len(file_bytes) == 0:
            raise HTTPException(
                status_code=400,
                detail=f"File '{upload.filename}' is empty (0 bytes).",
            )
        if len(file_bytes) > _MAX_FILE_SIZE:
            raise HTTPException(
                status_code=400,
                detail=f"File '{upload.filename}' exceeds 20 MB limit.",
            )

        # Run ingestion pipeline (in executor to avoid blocking event loop)
        try:
            doc_info = await asyncio.to_thread(
                ingest_document, upload.filename or "untitled", file_bytes
            )
        except ValueError as exc:
            raise HTTPException(status_code=422, detail=str(exc))

        # Store metadata for later retrieval
        _doc_store[doc_info["id"]] = doc_info

        # Update BM25 index with new chunks
        chunks_data = chroma_client.get_chunks_by_doc_id(doc_info["id"])
        bm25_chunks = []
        for cid, text, meta in zip(
            chunks_data.get("ids") or [],
            chunks_data.get("documents") or [],
            chunks_data.get("metadatas") or [],
        ):
            bm25_chunks.append({
                "chunk_id": cid,
                "text": text,
                "metadata": meta,
            })
        bm25_index.add_to_index(bm25_chunks)

        results.append(DocumentResponse(**doc_info))

    return UploadResponse(documents=results)


# ---------------------------------------------------------------------------
# List
# ---------------------------------------------------------------------------

@router.get("", response_model=DocumentListResponse)
async def list_documents():
    """List all uploaded documents with metadata."""
    # Rebuild from ChromaDB if in-memory store is empty (e.g. after restart)
    if not _doc_store:
        _rebuild_doc_store()

    docs = [DocumentResponse(**info) for info in _doc_store.values()]
    return DocumentListResponse(documents=docs, total=len(docs))


# ---------------------------------------------------------------------------
# Detail
# ---------------------------------------------------------------------------

@router.get("/{doc_id}", response_model=DocumentDetailResponse)
async def get_document(doc_id: str):
    """Get detailed info about a single document with chunk previews."""
    if not _doc_store:
        _rebuild_doc_store()

    if doc_id not in _doc_store:
        raise HTTPException(status_code=404, detail="Document not found")

    doc_info = _doc_store[doc_id]
    chunks_data = chroma_client.get_chunks_by_doc_id(doc_id)

    previews: list[ChunkResponse] = []
    for cid, text, meta in zip(
        chunks_data.get("ids") or [],
        chunks_data.get("documents") or [],
        chunks_data.get("metadatas") or [],
    ):
        previews.append(
            ChunkResponse(
                chunk_id=cid,
                chunk_index=meta.get("chunk_index", 0),
                text_preview=text[:200],
                page_number=meta.get("page_number", 1),
                token_count=meta.get("token_count", 0),
                metadata=meta,
            )
        )

    # Sort by chunk_index
    previews.sort(key=lambda c: c.chunk_index)

    return DocumentDetailResponse(
        id=doc_id,
        filename=doc_info.get("filename", "unknown"),
        file_type=doc_info.get("file_type", "unknown"),
        num_chunks=len(previews),
        chunks_preview=previews[:20],  # limit preview
    )


# ---------------------------------------------------------------------------
# Chunks (paginated)
# ---------------------------------------------------------------------------

@router.get("/{doc_id}/chunks", response_model=ChunkListResponse)
async def get_document_chunks(
    doc_id: str,
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
):
    """Get paginated chunks for a document."""
    chunks_data = chroma_client.get_chunks_by_doc_id(doc_id)

    ids = chunks_data.get("ids") or []
    if not ids:
        raise HTTPException(status_code=404, detail="Document not found or has no chunks")

    documents = chunks_data.get("documents") or []
    metadatas = chunks_data.get("metadatas") or []

    # Build full list and sort by chunk_index
    all_chunks: list[ChunkResponse] = []
    for cid, text, meta in zip(ids, documents, metadatas):
        all_chunks.append(
            ChunkResponse(
                chunk_id=cid,
                chunk_index=meta.get("chunk_index", 0),
                text=text,
                text_preview=text[:200],
                page_number=meta.get("page_number", 1),
                token_count=meta.get("token_count", 0),
                metadata=meta,
            )
        )
    all_chunks.sort(key=lambda c: c.chunk_index)

    # Paginate
    total = len(all_chunks)
    start = (page - 1) * per_page
    end = start + per_page
    page_chunks = all_chunks[start:end]

    return ChunkListResponse(
        chunks=page_chunks,
        total=total,
        page=page,
        per_page=per_page,
    )


# ---------------------------------------------------------------------------
# Delete
# ---------------------------------------------------------------------------

@router.delete("/{doc_id}")
async def delete_document(doc_id: str):
    """Delete a document and all its chunks from ChromaDB and BM25."""
    # Remove from ChromaDB
    chroma_client.delete_by_doc_id(doc_id)

    # Remove from BM25 index
    bm25_index.remove_from_index(doc_id)

    # Remove from in-memory doc store
    _doc_store.pop(doc_id, None)

    return {"deleted": True}


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _rebuild_doc_store() -> None:
    """Reconstruct the in-memory doc store from ChromaDB metadata.

    Called on first list/detail request after a process restart.
    """
    doc_metas = chroma_client.get_all_doc_metadata()
    for dm in doc_metas:
        doc_id = dm["doc_id"]
        if doc_id not in _doc_store:
            _doc_store[doc_id] = {
                "id": doc_id,
                "filename": dm["doc_name"],
                "file_type": _get_extension(dm["doc_name"]),
                "file_size_bytes": 0,  # not stored in ChromaDB
                "num_pages": 0,  # not stored in ChromaDB
                "num_chunks": dm["num_chunks"],
                "uploaded_at": "1970-01-01T00:00:00Z",  # not stored
            }
