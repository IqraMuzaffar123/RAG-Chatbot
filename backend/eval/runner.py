"""Evaluation runner — orchestrates dataset download, ingestion, retrieval,
LLM answer generation, and RAGAS scoring across all configs.

Usage::

    from eval.runner import run_evaluation, is_running

    run_id = await run_evaluation()   # kicks off background thread
"""

from __future__ import annotations

import asyncio
import logging
import time
import threading
from typing import Any

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Global state
# ---------------------------------------------------------------------------

_current_run_id: str | None = None
_lock = threading.Lock()


def is_running() -> bool:
    """Return True if an evaluation is currently in progress."""
    return _current_run_id is not None


async def run_evaluation() -> str:
    """Start an evaluation run in a background thread.

    Returns the ``run_id`` immediately.  The heavy work happens in
    :func:`_run_sync` on an executor thread.
    """
    global _current_run_id

    if is_running():
        raise RuntimeError(
            f"An evaluation is already running (run_id={_current_run_id})"
        )

    from eval import results as eval_db

    run_id = await eval_db.create_run()

    with _lock:
        _current_run_id = run_id

    loop = asyncio.get_running_loop()
    loop.run_in_executor(None, _run_sync, run_id)

    return run_id


# ---------------------------------------------------------------------------
# Background execution wrappers
# ---------------------------------------------------------------------------

def _run_sync(run_id: str) -> None:
    """Sync entry-point executed on the thread-pool executor.

    Creates a fresh event loop so the async helpers work correctly.
    """
    loop = asyncio.new_event_loop()
    try:
        loop.run_until_complete(_run_async(run_id))
    finally:
        loop.close()


# ---------------------------------------------------------------------------
# Main evaluation logic
# ---------------------------------------------------------------------------

_EVAL_SYSTEM_PROMPT = (
    "You are a helpful assistant. Answer the question using ONLY the "
    "provided context. If the answer is not in the context, say "
    '"I don\'t know."'
)

BATCH_SIZE = 100  # ChromaDB upsert batch size


async def _run_async(run_id: str) -> None:  # noqa: C901 — intentionally long
    """Download datasets, ingest, run retrieval configs, score with RAGAS."""
    global _current_run_id

    from eval import results as eval_db
    from eval.downloader import download_all
    from eval.configs import RETRIEVAL_CONFIGS
    from app.services.embedder import get_embedder
    from app.services.bm25_index import add_to_index, remove_from_index
    from app.config import get_settings

    total_questions = 0

    try:
        # ---- 1. Download datasets ----------------------------------------
        await eval_db.update_run_progress(run_id, "Downloading datasets...")
        datasets = download_all()
        logger.info("Downloaded %d datasets", len(datasets))

        settings = get_settings()

        # Connect to ChromaDB
        import chromadb

        chroma = chromadb.HttpClient(
            host=settings.CHROMA_HOST,
            port=settings.CHROMA_PORT,
        )

        embedder = get_embedder()

        # ---- 2. Process each dataset -------------------------------------
        for ds_idx, (ds_name, questions) in enumerate(datasets.items(), 1):
            collection_name = f"eval_{ds_name}_{run_id.replace('-', '_')}"[:63]
            collection = None
            bm25_doc_id = f"eval_{ds_name}_{run_id}"

            try:
                # -- 2a. Create temp ChromaDB collection -------------------
                await eval_db.update_run_progress(
                    run_id,
                    f"Ingesting dataset {ds_idx}/{len(datasets)}: {ds_name}",
                )

                collection = chroma.get_or_create_collection(
                    name=collection_name,
                    metadata={"hnsw:space": "cosine"},
                )

                # Extract contexts and embed them
                contexts = [q["context"] for q in questions]
                embeddings = embedder.embed_texts(contexts)

                # -- 2b. Add to ChromaDB in batches ------------------------
                chunk_dicts_for_bm25: list[dict[str, Any]] = []
                for batch_start in range(0, len(contexts), BATCH_SIZE):
                    batch_end = min(batch_start + BATCH_SIZE, len(contexts))
                    batch_ids = [
                        f"{ds_name}_ctx_{i}" for i in range(batch_start, batch_end)
                    ]
                    batch_docs = contexts[batch_start:batch_end]
                    batch_embs = embeddings[batch_start:batch_end]

                    collection.add(
                        ids=batch_ids,
                        documents=batch_docs,
                        embeddings=batch_embs,
                    )

                    for cid, doc in zip(batch_ids, batch_docs):
                        chunk_dicts_for_bm25.append({
                            "chunk_id": cid,
                            "text": doc,
                            "metadata": {"doc_id": bm25_doc_id},
                        })

                # -- 2c. Add to BM25 index ---------------------------------
                add_to_index(chunk_dicts_for_bm25)

                # -- 2d. Run each retrieval config -------------------------
                for cfg_key, cfg in RETRIEVAL_CONFIGS.items():
                    await eval_db.update_run_progress(
                        run_id,
                        f"[{ds_name}] Running config: {cfg['name']} "
                        f"({ds_idx}/{len(datasets)})",
                    )

                    search_fn = cfg["search_fn"]
                    needs_collection = cfg.get("needs_collection", False)

                    questions_list: list[str] = []
                    answers_list: list[str] = []
                    contexts_list: list[list[str]] = []
                    ground_truths_list: list[str] = []
                    retrieval_times: list[float] = []
                    answer_times: list[float] = []

                    for q in questions:
                        question_text = q["question"]

                        # Retrieve
                        kwargs: dict[str, Any] = {"top_k": 5}
                        if needs_collection:
                            kwargs["collection"] = collection
                        chunks, retrieval_ms = search_fn(question_text, **kwargs)
                        retrieval_times.append(retrieval_ms)

                        # Build context for LLM
                        retrieved_texts = [
                            c.get("text", "") for c in chunks
                        ]
                        context_str = "\n\n".join(retrieved_texts) if retrieved_texts else "No context found."

                        user_msg = (
                            f"Context:\n{context_str}\n\n"
                            f"Question: {question_text}"
                        )

                        # Generate answer via LLM
                        t0 = time.perf_counter()
                        answer_tokens: list[str] = []
                        try:
                            from app.services.llm_client import generate_stream

                            async for token in generate_stream(
                                _EVAL_SYSTEM_PROMPT, user_msg
                            ):
                                answer_tokens.append(token)
                        except Exception as llm_exc:
                            logger.warning(
                                "LLM generation failed for %s/%s: %s",
                                ds_name, cfg_key, llm_exc,
                            )
                            answer_tokens = ["Error generating answer."]
                        answer_ms = (time.perf_counter() - t0) * 1000.0
                        answer_times.append(answer_ms)

                        answer = "".join(answer_tokens)

                        questions_list.append(question_text)
                        answers_list.append(answer)
                        contexts_list.append(retrieved_texts if retrieved_texts else [""])
                        ground_truths_list.append(q["ground_truth"])

                    total_questions += len(questions_list)

                    # -- 2e. Evaluate with RAGAS ---------------------------
                    scores: dict[str, float] = {}
                    try:
                        from ragas import evaluate as ragas_evaluate
                        from ragas.metrics import (
                            faithfulness,
                            answer_relevancy,
                            context_precision,
                            context_recall,
                            answer_correctness,
                        )
                        from datasets import Dataset

                        eval_dataset = Dataset.from_dict({
                            "question": questions_list,
                            "answer": answers_list,
                            "contexts": contexts_list,
                            "ground_truth": ground_truths_list,
                        })

                        ragas_result = ragas_evaluate(
                            eval_dataset,
                            metrics=[
                                faithfulness,
                                answer_relevancy,
                                context_precision,
                                context_recall,
                                answer_correctness,
                            ],
                        )

                        for metric_name in [
                            "faithfulness",
                            "answer_relevancy",
                            "context_precision",
                            "context_recall",
                            "answer_correctness",
                        ]:
                            val = ragas_result.get(metric_name)
                            if val is not None:
                                scores[metric_name] = float(val)

                    except Exception as ragas_exc:
                        logger.warning(
                            "RAGAS evaluation failed for %s/%s: %s — saving zeros",
                            ds_name, cfg_key, ragas_exc,
                        )
                        scores = {
                            "faithfulness": 0.0,
                            "answer_relevancy": 0.0,
                            "context_precision": 0.0,
                            "context_recall": 0.0,
                            "answer_correctness": 0.0,
                        }

                    avg_retrieval_ms = (
                        sum(retrieval_times) / len(retrieval_times)
                        if retrieval_times
                        else 0.0
                    )
                    avg_answer_ms = (
                        sum(answer_times) / len(answer_times)
                        if answer_times
                        else 0.0
                    )

                    await eval_db.save_result(
                        run_id=run_id,
                        dataset=ds_name,
                        config=cfg_key,
                        scores=scores,
                        num_questions=len(questions_list),
                        avg_retrieval_ms=avg_retrieval_ms,
                        avg_answer_ms=avg_answer_ms,
                    )

            finally:
                # -- 2f. Cleanup temp collection and BM25 ------------------
                if collection is not None:
                    try:
                        chroma.delete_collection(name=collection_name)
                        logger.info("Deleted temp collection: %s", collection_name)
                    except Exception as cleanup_exc:
                        logger.warning(
                            "Failed to delete temp collection %s: %s",
                            collection_name, cleanup_exc,
                        )
                try:
                    remove_from_index(bm25_doc_id)
                except Exception as bm25_exc:
                    logger.warning(
                        "Failed to remove BM25 entries for %s: %s",
                        bm25_doc_id, bm25_exc,
                    )

        # ---- 3. Mark run completed ---------------------------------------
        await eval_db.complete_run(run_id, total_questions)
        logger.info(
            "Evaluation run %s completed (%d total questions)", run_id, total_questions
        )

    except Exception as exc:
        logger.exception("Evaluation run %s failed", run_id)
        try:
            await eval_db.fail_run(run_id, str(exc))
        except Exception:
            logger.exception("Failed to record run failure for %s", run_id)

    finally:
        with _lock:
            _current_run_id = None
