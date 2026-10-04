"""open-india-law (Vaquill), CC-BY-4.0.

https://github.com/Vaquill-AI/open-india-law · mirror: https://oss-data-in.vaquill.ai/

Official Indian primary law, normalised: Central and State legislation
(provision by provision, sourced from India Code and State portals),
regulator rules, and Supreme Court / High Court judgment chunks.

Files are fetched from the public mirror (no token needed); set HF_TOKEN to
read from Hugging Face instead. Legislation files are small (tens of MB);
judgment files are large (up to several GB), so they are streamed one row
group at a time and ``limit`` caps the rows read per file.
"""

import io
import json
import re
from collections import defaultdict

import httpx
import pyarrow.parquet as pq

from ..config import get_settings
from ..db import connection, set_status

DATASET = "open_india_law"
MIRROR = "https://oss-data-in.vaquill.ai/v2026.08.1"
HF = "https://huggingface.co/datasets/vaquill/open-india-law/resolve/main"
DEFAULT_FILES = ["in_central_legislation"]


class _HttpFile(io.RawIOBase):
    """Seekable file over HTTP range requests, so Parquet row groups stream without a full download."""

    def __init__(self, url: str, headers: dict[str, str]):
        self.url = url
        self.client = httpx.Client(headers=headers, follow_redirects=True, timeout=300)
        head = self.client.head(url)
        head.raise_for_status()
        self.size = int(head.headers["content-length"])
        self.pos = 0

    def seekable(self) -> bool:
        return True

    def readable(self) -> bool:
        return True

    def tell(self) -> int:
        return self.pos

    def seek(self, offset: int, whence: int = io.SEEK_SET) -> int:
        self.pos = {io.SEEK_SET: offset, io.SEEK_CUR: self.pos + offset, io.SEEK_END: self.size + offset}[whence]
        return self.pos

    def readinto(self, b) -> int:
        if self.pos >= self.size:
            return 0
        end = min(self.pos + len(b), self.size) - 1
        resp = self.client.get(self.url, headers={"Range": f"bytes={self.pos}-{end}"})
        resp.raise_for_status()
        n = len(resp.content)
        b[:n] = resp.content
        self.pos += n
        return n

    def close(self) -> None:
        self.client.close()
        super().close()


def _open(name: str) -> pq.ParquetFile:
    token = get_settings().hf_token
    url, headers = (f"{HF}/{name}.parquet", {"Authorization": f"Bearer {token}"}) if token else (f"{MIRROR}/{name}.parquet", {})
    return pq.ParquetFile(io.BufferedReader(_HttpFile(url, headers), buffer_size=8 << 20))


def _section_label(row: dict) -> str:
    num = (row.get("section_number") or "").strip()
    kind = (row.get("section_type") or "section").lower()
    if not num:
        return "Provision"
    return {"article": f"Art. {num}", "rule": f"r. {num}", "regulation": f"reg. {num}"}.get(kind, f"s. {num}")


def _strip_header(text: str) -> str:
    # Rows start with a context header ("Act: … | India | Central | In Force"); keep the provision text.
    lines = [line for line in (text or "").splitlines() if not line.startswith("Act: ")]
    return " ".join(" ".join(lines).split())


def _load_legislation(conn, pf: pq.ParquetFile, limit: int | None, log) -> tuple[int, int]:
    acts: dict[str, dict] = {}
    provisions: dict[str, list[tuple[str, str]]] = defaultdict(list)
    read = 0
    for rg in range(pf.num_row_groups):
        for row in pf.read_row_group(rg).to_pylist():
            if limit is not None and read >= limit:
                break
            read += 1
            act_id = row["act_id"]
            acts.setdefault(act_id, row)
            text = _strip_header(row.get("text") or "")
            if text:
                label = _section_label(row)
                parts = sum(1 for existing, _ in provisions[act_id] if existing.split(" (part")[0] == label)
                provisions[act_id].append((f"{label} (part {parts + 1})" if parts else label, text))
    for act_id, row in acts.items():
        year = int(row["year"]) if row.get("year") else None
        rec = conn.execute(
            """INSERT INTO authorities (dataset_id, source_ref, kind, title, jurisdiction, year, text_available, meta)
               VALUES (%s, %s, 'statute', %s, %s, %s, true, %s)
               ON CONFLICT (dataset_id, source_ref) DO UPDATE SET title = EXCLUDED.title,
                   jurisdiction = EXCLUDED.jurisdiction, year = EXCLUDED.year, meta = EXCLUDED.meta
               RETURNING id""",
            (
                DATASET,
                act_id,
                row.get("title") or act_id,
                row.get("state") or row.get("jurisdiction") or "central",
                year,
                json.dumps({
                    "act_status": row.get("act_status"),
                    "in_force": row.get("in_force"),
                    "amendment_count": row.get("amendment_count"),
                    "source_url": row.get("source_url"),
                    "source_publisher": row.get("source_publisher"),
                }),
            ),
        ).fetchone()
        conn.execute("DELETE FROM paragraphs WHERE authority_id = %s", (rec["id"],))
        with conn.cursor() as cur:
            cur.executemany(
                "INSERT INTO paragraphs (authority_id, ordinal, label, text) VALUES (%s, %s, %s, %s)",
                [(rec["id"], i + 1, label, text) for i, (label, text) in enumerate(provisions[act_id])],
            )
    return len(acts), read


def _load_judgments(conn, pf: pq.ParquetFile, limit: int | None, log) -> tuple[int, int]:
    read = 0
    cases: set[str] = set()
    for rg in range(pf.num_row_groups):
        if limit is not None and read >= limit:
            break
        for row in pf.read_row_group(rg).to_pylist():
            if limit is not None and read >= limit:
                break
            read += 1
            case_id = row.get("case_id")
            if not case_id:
                continue
            decided = (row.get("decision_date") or "")[:10] or None
            rec = conn.execute(
                """INSERT INTO authorities (dataset_id, source_ref, kind, title, court, jurisdiction, decided_on, year,
                       reporter_citation, case_number, petitioner, respondent, disposal, text_available, meta)
                   VALUES (%s, %s, 'case', %s, %s, 'India', %s, %s, %s, %s, %s, %s, %s, true, %s)
                   ON CONFLICT (dataset_id, source_ref) DO UPDATE SET title = EXCLUDED.title
                   RETURNING id""",
                (
                    DATASET,
                    case_id,
                    row.get("title") or case_id,
                    row.get("court"),
                    decided if decided and re.fullmatch(r"\d{4}-\d{2}-\d{2}", decided) else None,
                    row.get("year"),
                    row.get("citation"),
                    row.get("case_number"),
                    row.get("petitioner"),
                    row.get("respondent"),
                    row.get("disposition"),
                    json.dumps({"pdf_url": row.get("pdf_url") or row.get("source_url"), "court_type": row.get("court_type")}),
                ),
            ).fetchone()
            idx = int(row.get("chunk_index") or 0)
            conn.execute(
                """INSERT INTO paragraphs (authority_id, ordinal, label, text) VALUES (%s, %s, %s, %s)
                   ON CONFLICT (authority_id, ordinal) DO NOTHING""",
                (rec["id"], idx + 1, f"Chunk {idx + 1}", row.get("text_original") or row.get("text") or ""),
            )
            cases.add(case_id)
        conn.commit()
        log(f"    {read} rows")
    return len(cases), read


def load(files: list[str] | None = None, limit: int | None = None, log=print) -> None:
    files = files or DEFAULT_FILES
    with connection() as conn:
        set_status(conn, DATASET, "loading", ", ".join(files))
        conn.commit()
        for name in files:
            pf = _open(name)
            log(f"  {name}: {pf.metadata.num_rows} rows in {pf.num_row_groups} row groups")
            if name.endswith("_judgments"):
                n, read = _load_judgments(conn, pf, limit, log)
                log(f"  {name}: {n} judgments from {read} chunks")
            else:
                n, read = _load_legislation(conn, pf, limit, log)
                log(f"  {name}: {n} instruments, {read} provisions")
            conn.commit()
        stats = conn.execute(
            """SELECT count(*) FILTER (WHERE kind = 'statute') AS statutes, count(*) FILTER (WHERE kind = 'case') AS cases
               FROM authorities WHERE dataset_id = %s""",
            (DATASET,),
        ).fetchone()
        set_status(conn, DATASET, "partial", f"{stats['statutes']} acts/instruments, {stats['cases']} judgments loaded ({', '.join(files)})")
