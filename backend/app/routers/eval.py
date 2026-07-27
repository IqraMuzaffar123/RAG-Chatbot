"""Evaluation API endpoints.

Provides endpoints to trigger evaluation runs, check status,
retrieve results, and list run history.
"""

from __future__ import annotations

from fastapi import APIRouter, HTTPException

from eval import results as eval_db
from eval.runner import run_evaluation, is_running

router = APIRouter(prefix="/api/eval", tags=["evaluation"])


@router.post("/run")
async def start_run():
    """Start a new evaluation run.

    Returns the ``run_id`` immediately while the evaluation proceeds
    in a background thread.  Returns 409 if a run is already in progress.
    """
    if is_running():
        raise HTTPException(status_code=409, detail="An evaluation is already running.")

    run_id = await run_evaluation()
    return {"run_id": run_id, "status": "running"}


@router.get("/status")
async def get_status():
    """Get the status of the latest evaluation run.

    Returns one of ``running``, ``completed``, ``failed``, or
    ``no_runs`` if no evaluation has ever been executed.
    """
    run = await eval_db.get_run_status()
    if run is None:
        return {"status": "no_runs"}
    return run


@router.get("/results")
async def get_results():
    """Get the results of the most recent completed evaluation run.

    Returns 404 if no completed run exists.
    """
    results = await eval_db.get_latest_results()
    if results is None:
        raise HTTPException(status_code=404, detail="No completed evaluation results found.")
    return results


@router.get("/history")
async def get_history(limit: int = 20):
    """List past evaluation runs, newest first."""
    runs = await eval_db.get_eval_history(limit=limit)
    return {"runs": runs}
