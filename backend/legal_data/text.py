"""Turning judgment PDFs and plain text into paragraph-level evidence units."""

import io
import re

from pypdf import PdfReader

# Supreme Court judgments number their paragraphs: "12. The appellant…".
_PARA_START = re.compile(r"(?m)^\s*(\d{1,3})\.\s+(?=[A-Z(“\"'])")
_WS = re.compile(r"[ \t]+")
_MAX_CHUNK = 1500


def pdf_to_text(data: bytes) -> str:
    reader = PdfReader(io.BytesIO(data))
    pages = []
    for page in reader.pages:
        try:
            pages.append(page.extract_text() or "")
        except Exception:  # a single malformed page should not drop the judgment
            pages.append("")
    return "\n".join(pages)


def clean(text: str) -> str:
    text = text.replace("\r", "\n").replace("\x00", "")
    text = "\n".join(_WS.sub(" ", line).strip() for line in text.split("\n"))
    return re.sub(r"\n{3,}", "\n\n", text).strip()


def _chunks(text: str, prefix: str) -> list[tuple[str, str]]:
    """Fixed-size chunks on sentence boundaries, for text without numbered paragraphs."""
    sentences = re.split(r"(?<=[.;:])\s+", text)
    out: list[tuple[str, str]] = []
    buf = ""
    for s in sentences:
        if buf and len(buf) + len(s) > _MAX_CHUNK:
            out.append((f"{prefix} {len(out) + 1}", buf.strip()))
            buf = ""
        buf += " " + s
    if buf.strip():
        out.append((f"{prefix} {len(out) + 1}", buf.strip()))
    return out


def split_paragraphs(text: str) -> list[tuple[str, str]]:
    """Split judgment text into (label, text) pairs, using numbered paragraphs when present."""
    text = clean(text)
    if not text:
        return []
    starts = list(_PARA_START.finditer(text))
    # Require an increasing sequence of paragraph numbers, otherwise fall back to chunks.
    numbered: list[tuple[int, int]] = []
    expected = 1
    for m in starts:
        n = int(m.group(1))
        if n == expected:
            numbered.append((n, m.start()))
            expected += 1
    if len(numbered) < 3:
        return _chunks(" ".join(text.split()), "Chunk")

    out: list[tuple[str, str]] = []
    head = text[: numbered[0][1]].strip()
    if head:
        out.extend(_chunks(" ".join(head.split()), "Header"))
    for i, (n, pos) in enumerate(numbered):
        end = numbered[i + 1][1] if i + 1 < len(numbered) else len(text)
        body = " ".join(text[pos:end].split())
        body = re.sub(rf"^{n}\.\s*", "", body)
        if len(body) <= _MAX_CHUNK * 2:
            out.append((f"¶{n}", body))
        else:  # very long paragraphs are split but keep their number
            out.extend((f"¶{n} ({label.split()[-1]})", part) for label, part in _chunks(body, "part"))
    return out
