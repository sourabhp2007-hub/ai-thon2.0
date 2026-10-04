"""Indian Supreme Court Judgments — AWS Open Data (CC-BY-4.0).

https://registry.opendata.aws/indian-supreme-court-judgments/

* ``load_metadata`` loads every judgment's metadata (title, parties, judges,
  decision date, SCR and neutral citations) and builds the citation index.
  This is small (one Parquet file per year) and is what powers citation
  existence checks.
* ``load_text`` downloads the English PDFs for chosen years (one tar per year,
  roughly 40–400 MB each), extracts text and stores numbered paragraphs.
"""

import io
import json
import re
import tarfile
from datetime import date, datetime
from pathlib import Path

import httpx
import pandas as pd

from ..citations import parse_citations, parse_scr_path
from ..config import get_settings
from ..db import connection, set_status
from ..text import pdf_to_text, split_paragraphs

DATASET = "sc_judgments"
BASE = "https://indian-supreme-court-judgments.s3.ap-south-1.amazonaws.com"
FIRST_YEAR = 1950


def _client() -> httpx.Client:
    return httpx.Client(timeout=httpx.Timeout(60.0, read=300.0), follow_redirects=True)


def available_years(client: httpx.Client) -> list[int]:
    resp = client.get(f"{BASE}/", params={"list-type": "2", "prefix": "metadata/parquet/", "delimiter": "/"})
    resp.raise_for_status()
    return sorted(int(y) for y in re.findall(r"metadata/parquet/year=(\d{4})/", resp.text))


def _date(value: str | None) -> date | None:
    if not value:
        return None
    for fmt in ("%d-%m-%Y", "%Y-%m-%d"):
        try:
            return datetime.strptime(value.strip(), fmt).date()
        except ValueError:
            continue
    return None


def _text(value: object) -> str | None:
    if value is None or (isinstance(value, float) and pd.isna(value)):
        return None
    s = str(value).strip()
    return s or None


def _upsert_year(conn, df: pd.DataFrame) -> int:
    count = 0
    for row in df.to_dict("records"):
        path = _text(row.get("path"))
        if not path:
            continue
        scr = parse_scr_path(path)
        neutral = _text(row.get("case_id"))
        reporter = _text(row.get("citation"))
        decided = _date(_text(row.get("decision_date")))
        rec = conn.execute(
            """INSERT INTO authorities (dataset_id, source_ref, kind, title, court, jurisdiction, decided_on, year,
                   neutral_citation, reporter_citation, scr_volume, scr_page_from, scr_page_to, cnr, judges,
                   petitioner, respondent, disposal, meta)
               VALUES (%s, %s, 'case', %s, %s, 'India', %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
               ON CONFLICT (dataset_id, source_ref) DO UPDATE SET
                   title = EXCLUDED.title, court = EXCLUDED.court, decided_on = EXCLUDED.decided_on,
                   year = EXCLUDED.year, neutral_citation = EXCLUDED.neutral_citation,
                   reporter_citation = EXCLUDED.reporter_citation, scr_volume = EXCLUDED.scr_volume,
                   scr_page_from = EXCLUDED.scr_page_from, scr_page_to = EXCLUDED.scr_page_to,
                   cnr = EXCLUDED.cnr, judges = EXCLUDED.judges, petitioner = EXCLUDED.petitioner,
                   respondent = EXCLUDED.respondent, disposal = EXCLUDED.disposal, meta = EXCLUDED.meta
               RETURNING id""",
            (
                DATASET,
                path,
                _text(row.get("title")) or path,
                _text(row.get("court")) or "Supreme Court of India",
                decided,
                int(row["year"]) if _text(row.get("year")) else (decided.year if decided else None),
                neutral,
                reporter,
                scr[1] if scr else None,
                scr[2] if scr else None,
                scr[3] if scr else None,
                _text(row.get("cnr")),
                _text(row.get("judge")),
                _text(row.get("petitioner")),
                _text(row.get("respondent")),
                _text(row.get("disposal_nature")),
                json.dumps({"languages": _text(row.get("available_languages")), "author_judge": _text(row.get("author_judge"))}),
            ),
        ).fetchone()
        authority_id = rec["id"]
        conn.execute("DELETE FROM citation_index WHERE authority_id = %s", (authority_id,))
        for raw in filter(None, [neutral, reporter]):
            for c in parse_citations(raw):
                conn.execute(
                    "INSERT INTO citation_index (key, authority_id, raw) VALUES (%s, %s, %s) ON CONFLICT DO NOTHING",
                    (c.key, authority_id, raw),
                )
        count += 1
    return count


def load_metadata(years: list[int] | None = None, log=print) -> int:
    """Load metadata for the given years (default: every year in the bucket)."""
    total = 0
    with _client() as client:
        years = years or available_years(client)
        with connection() as conn:
            set_status(conn, DATASET, "loading", f"metadata {years[0]}–{years[-1]}")
        for year in years:
            resp = client.get(f"{BASE}/metadata/parquet/year={year}/metadata.parquet")
            if resp.status_code == 404:
                log(f"  {year}: no metadata")
                continue
            resp.raise_for_status()
            df = pd.read_parquet(io.BytesIO(resp.content))
            with connection() as conn:
                n = _upsert_year(conn, df)
            total += n
            log(f"  {year}: {n} judgments")
    with connection() as conn:
        _refresh_status(conn)
    return total


def load_text(years: list[int], limit: int | None = None, log=print) -> int:
    """Download English PDFs for the given years and store paragraph text."""
    data_dir: Path = get_settings().data_dir / DATASET
    data_dir.mkdir(parents=True, exist_ok=True)
    stored = 0
    with _client() as client:
        for year in years:
            tar_path = data_dir / f"english-{year}.tar"
            if not tar_path.exists():
                log(f"  {year}: downloading English judgments…")
                with client.stream("GET", f"{BASE}/data/tar/year={year}/english/english.tar") as resp:
                    if resp.status_code == 404:
                        log(f"  {year}: no English archive")
                        continue
                    resp.raise_for_status()
                    tmp = tar_path.with_suffix(".part")
                    with tmp.open("wb") as fh:
                        for chunk in resp.iter_bytes(1 << 20):
                            fh.write(chunk)
                    tmp.rename(tar_path)
            year_count = 0
            with tarfile.open(tar_path) as tar, connection() as conn:
                for member in tar:
                    if not member.isfile() or not member.name.endswith("_EN.pdf"):
                        continue
                    if limit is not None and stored >= limit:
                        break
                    source_ref = Path(member.name).name.removesuffix("_EN.pdf")
                    row = conn.execute(
                        "SELECT id, text_available FROM authorities WHERE dataset_id = %s AND source_ref = %s",
                        (DATASET, source_ref),
                    ).fetchone()
                    if not row or row["text_available"]:
                        continue
                    fh = tar.extractfile(member)
                    if fh is None:
                        continue
                    paragraphs = split_paragraphs(pdf_to_text(fh.read()))
                    if not paragraphs:
                        continue
                    with conn.cursor() as cur:
                        cur.executemany(
                            "INSERT INTO paragraphs (authority_id, ordinal, label, text) VALUES (%s, %s, %s, %s) "
                            "ON CONFLICT (authority_id, ordinal) DO NOTHING",
                            [(row["id"], i + 1, label, body) for i, (label, body) in enumerate(paragraphs)],
                        )
                    conn.execute("UPDATE authorities SET text_available = true WHERE id = %s", (row["id"],))
                    conn.commit()
                    stored += 1
                    year_count += 1
                    if year_count % 100 == 0:
                        log(f"  {year}: {year_count} judgments with text")
            log(f"  {year}: {year_count} judgments with text")
    with connection() as conn:
        _refresh_status(conn)
    return stored


def _refresh_status(conn) -> None:
    stats = conn.execute(
        """SELECT count(*) AS judgments, count(*) FILTER (WHERE text_available) AS with_text,
                  min(year) AS first_year, max(year) AS last_year
           FROM authorities WHERE dataset_id = %s""",
        (DATASET,),
    ).fetchone()
    if not stats["judgments"]:
        set_status(conn, DATASET, "not_loaded")
        return
    detail = (
        f"{stats['judgments']} judgments ({stats['first_year']}–{stats['last_year']}) with metadata; "
        f"{stats['with_text']} with full text"
    )
    set_status(conn, DATASET, "loaded" if stats["with_text"] == stats["judgments"] else "partial", detail)
