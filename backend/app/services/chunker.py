"""Semantic chunking with recursive sentence-boundary splitting.

Pipeline
--------
1. Split each page's text on double-newlines and ``## `` markdown headings.
2. If any resulting chunk exceeds *chunk_size* tokens, recursively split at
   sentence boundaries (``. ``, ``? ``, ``! ``).
3. Add *chunk_overlap* tokens of overlap between consecutive chunks.
4. Assign a global ``chunk_index`` and record ``token_count`` per chunk.

Token counting uses simple whitespace splitting (fast, no external deps).
"""

from __future__ import annotations

import re
from typing import List

from app.config import get_settings


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _token_count(text: str) -> int:
    """Count tokens via whitespace splitting."""
    return len(text.split())


def _split_by_sections(text: str) -> list[str]:
    """Split *text* on double-newlines **and** markdown ``##`` headings.

    Headings are kept as the first line of their section.
    """
    # First split on markdown headings (keep the heading with the following text)
    parts = re.split(r"(?=^## )", text, flags=re.MULTILINE)
    # Then split each part on double-newlines
    sections: list[str] = []
    for part in parts:
        for sub in re.split(r"\n{2,}", part):
            stripped = sub.strip()
            if stripped:
                sections.append(stripped)
    return sections


_SENTENCE_RE = re.compile(r"(?<=[.!?])\s+")


def _split_sentences(text: str) -> list[str]:
    """Split *text* at sentence boundaries."""
    sentences = _SENTENCE_RE.split(text)
    return [s.strip() for s in sentences if s.strip()]


def _recursive_split(text: str, chunk_size: int) -> list[str]:
    """Recursively split *text* until every piece is <= *chunk_size* tokens."""
    if _token_count(text) <= chunk_size:
        return [text]

    sentences = _split_sentences(text)
    if len(sentences) <= 1:
        # Can't split further — return as-is even if oversized.
        return [text]

    chunks: list[str] = []
    current: list[str] = []
    current_tokens = 0

    for sentence in sentences:
        s_tokens = _token_count(sentence)
        if current_tokens + s_tokens > chunk_size and current:
            chunks.append(" ".join(current))
            current = []
            current_tokens = 0
        current.append(sentence)
        current_tokens += s_tokens

    if current:
        chunks.append(" ".join(current))

    # Guard: if a single sentence is still over the limit, leave it.
    return chunks


def _add_overlap(chunks: list[str], overlap: int) -> list[str]:
    """Prepend *overlap* tokens from the previous chunk to each chunk."""
    if overlap <= 0 or len(chunks) <= 1:
        return chunks

    result = [chunks[0]]
    for i in range(1, len(chunks)):
        prev_tokens = chunks[i - 1].split()
        overlap_text = " ".join(prev_tokens[-overlap:]) if len(prev_tokens) >= overlap else chunks[i - 1]
        result.append(overlap_text + " " + chunks[i])
    return result


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def chunk_text(
    pages: list[dict],
    chunk_size: int | None = None,
    chunk_overlap: int | None = None,
) -> list[dict]:
    """Chunk extracted pages into retrieval-ready pieces.

    Parameters
    ----------
    pages:
        Output of ``text_extractor.extract_text`` — each dict has
        ``"text"`` and ``"page_number"``.
    chunk_size:
        Maximum tokens per chunk (default from config).
    chunk_overlap:
        Overlap tokens between consecutive chunks (default from config).

    Returns
    -------
    list[dict]
        Each dict: ``{"text", "page_number", "chunk_index", "token_count"}``.
    """
    settings = get_settings()
    if chunk_size is None:
        chunk_size = settings.CHUNK_SIZE
    if chunk_overlap is None:
        chunk_overlap = settings.CHUNK_OVERLAP

    all_chunks: list[dict] = []
    chunk_index = 0

    for page in pages:
        text = page["text"]
        page_number = page["page_number"]

        # Step 1: section-level splits
        sections = _split_by_sections(text)

        # Step 2: recursive sentence-level splits for oversized sections
        raw_chunks: list[str] = []
        for section in sections:
            raw_chunks.extend(_recursive_split(section, chunk_size))

        # Step 3: add overlap
        raw_chunks = _add_overlap(raw_chunks, chunk_overlap)

        for chunk_text_str in raw_chunks:
            all_chunks.append(
                {
                    "text": chunk_text_str,
                    "page_number": page_number,
                    "chunk_index": chunk_index,
                    "token_count": _token_count(chunk_text_str),
                }
            )
            chunk_index += 1

    return all_chunks
