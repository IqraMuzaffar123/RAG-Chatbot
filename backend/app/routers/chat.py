"""Chat router — streaming Q&A over uploaded documents.

``POST /api/chat`` accepts a ``ChatRequest`` and returns a Server-Sent Events
(SSE) stream containing source info, token-by-token answer, and retrieval
metadata.
"""

from __future__ import annotations

import json
import logging
from typing import AsyncGenerator

from fastapi import APIRouter
from sse_starlette.sse import EventSourceResponse

from app.models.schemas import ChatRequest
from app.services.retrieval import retrieve_and_answer

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/chat", tags=["chat"])


async def _event_generator(request: ChatRequest) -> AsyncGenerator[dict, None]:
    """Yield SSE-formatted events from the retrieval pipeline."""
    # Convert conversation history to plain dicts
    history = [
        {"role": msg.role, "content": msg.content}
        for msg in (request.conversation_history or [])
    ]

    async for event in retrieve_and_answer(
        question=request.question,
        top_k=request.top_k,
        use_reranking=request.use_reranking,
        conversation_history=history if history else None,
    ):
        event_type = event["type"]

        if event_type == "sources":
            yield {
                "event": "sources",
                "data": json.dumps(event["data"]),
            }
        elif event_type == "token":
            yield {
                "event": "token",
                "data": event["data"],
            }
        elif event_type == "metadata":
            # Record stats
            from app.routers.stats import record_query

            metadata = event["data"]
            record_query(
                question=request.question,
                confidence=metadata.get("confidence", 0.0),
                retrieval_time_ms=metadata.get("retrieval_metadata", {}).get(
                    "retrieval_time_ms", 0.0
                ),
            )
            yield {
                "event": "metadata",
                "data": json.dumps(event["data"]),
            }


@router.post("")
async def chat(request: ChatRequest):
    """Stream a cited answer to the user's question via SSE.

    Event types:
    - ``sources``: JSON array of source chunks (sent first).
    - ``token``: A single token of the generated answer.
    - ``metadata``: JSON object with confidence and retrieval timing (sent last).
    """
    return EventSourceResponse(_event_generator(request))
