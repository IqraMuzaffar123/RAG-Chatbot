"""Text extraction from PDF, DOCX, and TXT files.

Each extractor returns a list of page dicts:

    [{"text": "page content...", "page_number": 1}, ...]

This is the expected input format for ``chunker.chunk_text``.
"""

from __future__ import annotations

import io
import logging

logger = logging.getLogger(__name__)

_SUPPORTED_EXTENSIONS = {"pdf", "docx", "txt"}


def extract_text(filename: str, file_bytes: bytes) -> list[dict]:
    """Extract text from an uploaded file.

    Parameters
    ----------
    filename:
        Original filename with extension (e.g. ``"report.pdf"``).
    file_bytes:
        Raw bytes of the uploaded file.

    Returns
    -------
    list[dict]
        Each dict has ``"text"`` (str) and ``"page_number"`` (int).

    Raises
    ------
    ValueError
        If the file extension is not supported.
    """
    ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""

    if ext not in _SUPPORTED_EXTENSIONS:
        raise ValueError(
            f"Unsupported file type '.{ext}'. "
            f"Supported: {', '.join(sorted(_SUPPORTED_EXTENSIONS))}"
        )

    if ext == "pdf":
        return _extract_pdf(file_bytes)
    elif ext == "docx":
        return _extract_docx(file_bytes)
    else:
        return _extract_txt(file_bytes)


def _extract_pdf(file_bytes: bytes) -> list[dict]:
    """Extract text from a PDF, one entry per page."""
    from PyPDF2 import PdfReader

    reader = PdfReader(io.BytesIO(file_bytes))
    pages: list[dict] = []

    for page_num, page in enumerate(reader.pages, 1):
        text = page.extract_text() or ""
        text = text.strip()
        if text:
            pages.append({"text": text, "page_number": page_num})

    return pages


def _extract_docx(file_bytes: bytes) -> list[dict]:
    """Extract text from a DOCX file.

    Word documents don't have a native page concept, so the full
    document is returned as a single logical page.
    """
    from docx import Document

    doc = Document(io.BytesIO(file_bytes))
    paragraphs = [p.text for p in doc.paragraphs if p.text.strip()]
    text = "\n\n".join(paragraphs)

    if not text.strip():
        return []

    return [{"text": text, "page_number": 1}]


def _extract_txt(file_bytes: bytes) -> list[dict]:
    """Extract text from a plain-text file."""
    text = file_bytes.decode("utf-8", errors="ignore").strip()

    if not text:
        return []

    return [{"text": text, "page_number": 1}]
