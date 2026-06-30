"""Pydantic models for all API request and response shapes."""

from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field


# ---------------------------------------------------------------------------
# Document schemas
# ---------------------------------------------------------------------------

class DocumentResponse(BaseModel):
    """Metadata for a single ingested document."""

    id: str = Field(..., description="Unique document identifier (UUID)")
    filename: str = Field(..., description="Original filename")
    file_type: str = Field(..., description="File extension (pdf, docx, txt)")
    file_size_bytes: int = Field(..., description="File size in bytes")
    num_pages: int = Field(..., description="Number of pages extracted")
    num_chunks: int = Field(..., description="Number of chunks produced")
    uploaded_at: datetime = Field(
        default_factory=datetime.utcnow,
        description="Upload timestamp (UTC)",
    )


class ChunkResponse(BaseModel):
    """A single text chunk from a document."""

    chunk_id: str = Field(..., description="Unique chunk identifier")
    chunk_index: int = Field(..., description="Positional index within the document")
    text: str = Field("", description="Full chunk text (or preview)")
    text_preview: str = Field("", description="First 200 characters of the chunk")
    page_number: int = Field(..., description="Source page number")
    token_count: int = Field(..., description="Approximate token count")
    metadata: dict[str, Any] = Field(default_factory=dict)


# ---------------------------------------------------------------------------
# Upload response
# ---------------------------------------------------------------------------

class UploadResponse(BaseModel):
    """Response from the document upload endpoint."""

    documents: list[DocumentResponse]


# ---------------------------------------------------------------------------
# Document list response
# ---------------------------------------------------------------------------

class DocumentListResponse(BaseModel):
    """Paginated list of documents."""

    documents: list[DocumentResponse]
    total: int


# ---------------------------------------------------------------------------
# Document detail with chunk previews
# ---------------------------------------------------------------------------

class DocumentDetailResponse(BaseModel):
    """Single document detail with chunk previews."""

    id: str
    filename: str
    file_type: str
    num_chunks: int
    chunks_preview: list[ChunkResponse]


# ---------------------------------------------------------------------------
# Chunk list (paginated)
# ---------------------------------------------------------------------------

class ChunkListResponse(BaseModel):
    """Paginated list of chunks for a document."""

    chunks: list[ChunkResponse]
    total: int
    page: int
    per_page: int


# ---------------------------------------------------------------------------
# Chat schemas
# ---------------------------------------------------------------------------

class ChatRequest(BaseModel):
    """Request body for the chat/query endpoint."""

    question: str = Field(..., min_length=1, description="User question")
    top_k: int = Field(5, ge=1, le=20, description="Number of chunks to retrieve")
    use_reranking: bool = Field(True, description="Whether to apply cross-encoder re-ranking")


class SourceInfo(BaseModel):
    """A single source chunk cited in an answer."""

    chunk_id: str
    document_name: str
    page_number: int
    text: str
    relevance_score: float = Field(..., ge=0, le=1, description="Hybrid search / RRF score")
    rerank_score: float = Field(0.0, description="Cross-encoder re-rank score")


class RetrievalMetadata(BaseModel):
    """Performance and pipeline metadata for a retrieval query."""

    total_chunks_searched: int
    vector_candidates: int
    bm25_candidates: int
    after_fusion: int
    after_reranking: int
    retrieval_time_ms: float
    generation_time_ms: float


class ChatResponse(BaseModel):
    """Full response from the chat endpoint (non-streaming fallback)."""

    answer: str
    sources: list[SourceInfo]
    confidence: float = Field(..., ge=0, le=1)
    retrieval_metadata: RetrievalMetadata


# ---------------------------------------------------------------------------
# Stats schemas
# ---------------------------------------------------------------------------

class RecentQuery(BaseModel):
    """Summary of a recent user query."""

    question: str
    confidence: float
    timestamp: datetime


class StatsResponse(BaseModel):
    """Dashboard statistics."""

    total_documents: int
    total_chunks: int
    avg_chunk_tokens: float
    total_queries: int
    avg_confidence: float
    avg_retrieval_time_ms: float
    recent_queries: list[RecentQuery]
    documents_by_type: dict[str, int]
