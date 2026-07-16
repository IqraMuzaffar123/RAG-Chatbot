"""AskDocs — Enterprise RAG Knowledge Base API."""

import logging
import time
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings

logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO)


def _wait_for_chromadb(max_retries: int = 15, delay: float = 2.0) -> None:
    """Wait for ChromaDB to be reachable before proceeding."""
    from app.services.chroma_client import get_collection
    for attempt in range(1, max_retries + 1):
        try:
            get_collection().count()
            logger.info("ChromaDB is ready.")
            return
        except Exception as exc:
            if attempt == max_retries:
                raise RuntimeError(
                    f"ChromaDB not reachable after {max_retries} attempts: {exc}"
                ) from exc
            logger.warning(
                "ChromaDB not ready (attempt %d/%d): %s — retrying in %.0fs",
                attempt, max_retries, exc, delay,
            )
            time.sleep(delay)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan handler.

    Startup: load ML models, build BM25 index.
    Shutdown: cleanup resources.
    """
    # --- Startup ---
    logger.info("Starting AskDocs backend ...")

    # 0. Wait for ChromaDB to be reachable
    _wait_for_chromadb()

    # 1. Load embedding model (sentence-transformers)
    logger.info("Loading embedding model ...")
    from app.services.embedder import get_embedder
    get_embedder()
    logger.info("Embedding model ready.")

    # 2. Load cross-encoder re-ranker model
    logger.info("Loading reranker model ...")
    from app.services.reranker import load_model as load_reranker
    load_reranker()
    logger.info("Reranker model ready.")

    # 3. Build BM25 index from existing ChromaDB data
    logger.info("Building BM25 index ...")
    from app.services.bm25_index import build_index
    num_chunks = build_index()
    logger.info("BM25 index ready (%d chunks).", num_chunks)

    # 4. Auto-load demo documents if ChromaDB collection is empty
    from app.services.chroma_client import get_collection
    collection = get_collection()
    if collection.count() == 0:
        logger.info("ChromaDB collection is empty — loading demo documents ...")
        import pathlib
        from app.services.ingestion import ingest_document
        from app.services.bm25_index import build_index as rebuild_bm25

        demo_dir = pathlib.Path(__file__).resolve().parent / "data" / "demo_docs"
        if demo_dir.is_dir():
            txt_files = sorted(demo_dir.glob("*.txt"))
            total_chunks = 0
            loaded = 0
            for txt_file in txt_files:
                try:
                    file_bytes = txt_file.read_bytes()
                    result = ingest_document(txt_file.name, file_bytes)
                    total_chunks += result["num_chunks"]
                    loaded += 1
                    logger.info("  Ingested %s (%d chunks)", txt_file.name, result["num_chunks"])
                except Exception:
                    logger.exception("  Failed to ingest %s", txt_file.name)
            # Rebuild BM25 index with the newly loaded demo data
            rebuild_bm25()
            logger.info("Loaded %d demo documents (%d total chunks).", loaded, total_chunks)
        else:
            logger.warning("Demo docs directory not found at %s", demo_dir)

    # 5. Initialize stats database (SQLite)
    logger.info("Initializing stats database ...")
    from app.services.stats_db import init_db
    await init_db()
    logger.info("Stats database ready.")

    logger.info("AskDocs backend startup complete.")
    yield
    # --- Shutdown ---
    logger.info("AskDocs backend shutting down.")


settings = get_settings()

app = FastAPI(
    title="AskDocs",
    description="Enterprise RAG Knowledge Base — Hybrid search with cross-encoder re-ranking",
    version="0.1.0",
    lifespan=lifespan,
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Routers ---
from app.routers import documents, chat, stats  # noqa: E402

app.include_router(documents.router)
app.include_router(chat.router)
app.include_router(stats.router)


import uuid
from fastapi import Request
from fastapi.responses import JSONResponse


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Catch unhandled errors and return structured JSON."""
    request_id = str(uuid.uuid4())[:8]
    logger.exception("Unhandled error [%s]: %s", request_id, exc)
    return JSONResponse(
        status_code=500,
        content={
            "detail": "Internal server error",
            "request_id": request_id,
        },
    )


@app.get("/health", tags=["system"])
async def health_check():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "service": "askdocs-backend",
        "version": "0.1.0",
    }
