"""LLM abstraction supporting OpenAI and Anthropic with streaming.

Reads ``LLM_PROVIDER`` from config to determine which client to use.
Both providers stream tokens via an async generator.
"""

from __future__ import annotations

import logging
from typing import AsyncGenerator

from app.config import get_settings

logger = logging.getLogger(__name__)

SYSTEM_PROMPT = (
    "You are a helpful knowledge-base assistant. "
    "Answer the user's question using ONLY the provided source documents. "
    "Cite every claim using the format [Source: filename, p.X]. "
    "If the answer is not found in the provided sources, respond with: "
    '"I don\'t have enough information in the uploaded documents to answer this." '
    "Do not make up information. Do not use outside knowledge."
)


async def generate_stream(
    system_prompt: str,
    user_message: str,
    conversation_history: list[dict] | None = None,
) -> AsyncGenerator[str, None]:
    """Stream LLM tokens for the given system prompt and user message.

    Yields one string token at a time.

    Parameters
    ----------
    system_prompt:
        Instructions for the model (e.g. citation rules).
    user_message:
        The formatted user query with context chunks.
    conversation_history:
        Optional list of previous messages for multi-turn context.
        Each dict has 'role' and 'content' keys.
    """
    settings = get_settings()
    provider = settings.LLM_PROVIDER

    # Build messages array with history
    messages = []
    if conversation_history:
        # Only keep last 10 messages to avoid token overflow
        for msg in conversation_history[-10:]:
            messages.append({"role": msg["role"], "content": msg["content"]})
    messages.append({"role": "user", "content": user_message})

    if provider == "openai":
        async for token in _stream_openai(system_prompt, messages, settings):
            yield token
    elif provider == "anthropic":
        async for token in _stream_anthropic(system_prompt, messages, settings):
            yield token
    else:
        raise ValueError(f"Unsupported LLM_PROVIDER: {provider}")


async def _stream_openai(
    system_prompt: str,
    messages: list[dict],
    settings,
) -> AsyncGenerator[str, None]:
    """Stream from OpenAI's chat completions API."""
    from openai import AsyncOpenAI

    client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)

    full_messages = [{"role": "system", "content": system_prompt}] + messages

    stream = await client.chat.completions.create(
        model=settings.LLM_MODEL,
        messages=full_messages,
        stream=True,
        temperature=0.1,
    )

    async for chunk in stream:
        delta = chunk.choices[0].delta
        if delta.content:
            yield delta.content


async def _stream_anthropic(
    system_prompt: str,
    messages: list[dict],
    settings,
) -> AsyncGenerator[str, None]:
    """Stream from Anthropic's messages API."""
    from anthropic import AsyncAnthropic

    client = AsyncAnthropic(api_key=settings.ANTHROPIC_API_KEY)

    async with client.messages.stream(
        model=settings.LLM_MODEL,
        max_tokens=2048,
        system=system_prompt,
        messages=messages,
        temperature=0.1,
    ) as stream:
        async for text in stream.text_stream:
            yield text
