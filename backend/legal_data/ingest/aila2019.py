"""AILA 2019 — Artificial Intelligence for Legal Assistance (FIRE 2019), CC-BY-4.0.

https://zenodo.org/records/4063986

Loads 2,914 Supreme Court prior-case documents and 197 statute descriptions as
authorities, plus 50 factual-scenario queries with precedent and statute
relevance judgments. The judgments are the ground truth for evaluating the
"Searching authorities" stage.
"""

import json
import re
import zipfile
from datetime import datetime
from pathlib import Path

import httpx

from ..config import get_settings
from ..db import connection, set_status
from ..text import split_paragraphs

DATASET = "aila2019"
URL = "https://zenodo.org/api/records/4063986/files/AILA_2019_dataset.zip/content"


def _download() -> Path:
    path = get_settings().data_dir / DATASET / "AILA_2019_dataset.zip"
    if not path.exists():
        path.parent.mkdir(parents=True, exist_ok=True)
        with httpx.stream("GET", URL, follow_redirects=True, timeout=300) as resp:
            resp.raise_for_status()
            with path.open("wb") as fh:
                for chunk in resp.iter_bytes(1 << 20):
                    fh.write(chunk)
    return path


def _parse_date(line: str):
    try:
        return datetime.strptime(line.strip(), "%d %B %Y").date()
    except ValueError:
        return None


def _store(conn, source_ref: str, kind: str, title: str, court: str | None, decided, body: str, meta: dict) -> None:
    row = conn.execute(
        """INSERT INTO authorities (dataset_id, source_ref, kind, title, court, jurisdiction, decided_on, year,
               text_available, meta)
           VALUES (%s, %s, %s, %s, %s, 'India', %s, %s, true, %s)
           ON CONFLICT (dataset_id, source_ref) DO UPDATE SET title = EXCLUDED.title, court = EXCLUDED.court,
               decided_on = EXCLUDED.decided_on, year = EXCLUDED.year, text_available = true, meta = EXCLUDED.meta
           RETURNING id""",
        (DATASET, source_ref, kind, title, court, decided, decided.year if decided else None, json.dumps(meta)),
    ).fetchone()
    conn.execute("DELETE FROM paragraphs WHERE authority_id = %s", (row["id"],))
    paragraphs = split_paragraphs(body) if kind == "case" else [("Provision", " ".join(body.split()))]
    with conn.cursor() as cur:
        cur.executemany(
            "INSERT INTO paragraphs (authority_id, ordinal, label, text) VALUES (%s, %s, %s, %s)",
            [(row["id"], i + 1, label, text) for i, (label, text) in enumerate(paragraphs) if text],
        )


def load(log=print) -> None:
    zpath = _download()
    with zipfile.ZipFile(zpath) as z, connection() as conn:
        set_status(conn, DATASET, "loading")
        conn.commit()
        names = z.namelist()

        cases = [n for n in names if re.fullmatch(r"Object_casedocs/C\d+\.txt", n)]
        for i, name in enumerate(cases, 1):
            lines = z.read(name).decode("utf-8", "replace").splitlines()
            title = lines[0].strip() if lines else Path(name).stem
            court = lines[1].strip() if len(lines) > 1 else None
            decided = _parse_date(lines[3]) if len(lines) > 3 else None
            _store(conn, Path(name).stem, "case", title, court, decided, "\n".join(lines[4:]), {"aila_file": name})
            if i % 500 == 0:
                conn.commit()
                log(f"  {i}/{len(cases)} prior cases")

        statutes = [n for n in names if re.fullmatch(r"Object_statutes/S\d+\.txt", n)]
        for name in statutes:
            text = z.read(name).decode("utf-8", "replace")
            title = re.search(r"^Title:\s*(.+)$", text, re.M)
            desc = re.search(r"^Desc:\s*(.+)", text, re.M | re.S)
            _store(
                conn, Path(name).stem, "statute", title.group(1).strip() if title else Path(name).stem, None, None,
                desc.group(1) if desc else text, {"aila_file": name},
            )
        log(f"  {len(cases)} prior cases, {len(statutes)} statutes")

        for line in z.read("Query_doc.txt").decode("utf-8", "replace").splitlines():
            if "||" not in line:
                continue
            qid, text = line.split("||", 1)
            conn.execute(
                """INSERT INTO eval_queries (dataset_id, query_id, split, text) VALUES (%s, %s, 'test', %s)
                   ON CONFLICT (dataset_id, query_id) DO UPDATE SET text = EXCLUDED.text""",
                (DATASET, qid.strip(), text.strip()),
            )
        qrels = 0
        for fname, task in (("relevance_judgments_priorcases.txt", "precedent"), ("relevance_judgments_statutes.txt", "statute")):
            for line in z.read(fname).decode().splitlines():
                parts = line.split()
                if len(parts) != 4:
                    continue
                conn.execute(
                    """INSERT INTO eval_qrels (dataset_id, query_id, task, candidate_ref, relevance)
                       VALUES (%s, %s, %s, %s, %s) ON CONFLICT DO NOTHING""",
                    (DATASET, parts[0], task, parts[2], int(parts[3])),
                )
                qrels += 1
        log(f"  queries and {qrels} relevance judgments")
        set_status(conn, DATASET, "loaded", f"{len(cases)} prior cases, {len(statutes)} statutes, 50 queries, {qrels} judgments")
