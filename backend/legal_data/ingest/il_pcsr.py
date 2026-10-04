"""IL-PCSR — Indian Legal corpus for Prior Case and Statute Retrieval (EMNLP 2025).

https://huggingface.co/datasets/Exploration-Lab/IL-PCSR · licence CC-BY-NC-SA-4.0
(non-commercial: fine for research and hackathon evaluation, not for a paid product).

The dataset is gated on Hugging Face: accept its terms with your account, then
set HF_TOKEN. Loads the precedent and statute candidate pools as authorities and
the train/dev/test queries with their relevance labels as an evaluation set.
"""

import io
import json

import httpx
import pandas as pd

from ..config import get_settings
from ..db import connection, set_status

DATASET = "il_pcsr"
BASE = "https://huggingface.co/datasets/Exploration-Lab/IL-PCSR/resolve/main"
QUERY_FILES = {"train": "train_queries.parquet", "dev": "dev_queries.parquet", "test": "test_queries.parquet"}
CANDIDATE_FILES = {"precedent": "precedent_candidates.parquet", "statute": "statute_candidates.parquet"}

# Column names vary between releases; the first match wins.
ID_COLS = ("id", "doc_id", "query_id", "candidate_id", "case_id", "statute_id")
TEXT_COLS = ("text", "content", "document", "query_text", "facts", "description")
TITLE_COLS = ("title", "name", "statute_title", "case_title")
REL_COLS = {
    "precedent": ("relevant_precedents", "relevant_cases", "precedent_ids", "relevant_prior_cases", "precedents"),
    "statute": ("relevant_statutes", "statute_ids", "statutes"),
}


class SchemaError(RuntimeError):
    pass


def _pick(df: pd.DataFrame, names: tuple[str, ...], what: str, required: bool = True) -> str | None:
    for n in names:
        if n in df.columns:
            return n
    if required:
        raise SchemaError(f"IL-PCSR: no {what} column among {list(df.columns)}; update the column map in il_pcsr.py")
    return None


def _fetch(client: httpx.Client, name: str) -> pd.DataFrame:
    resp = client.get(f"{BASE}/{name}")
    if resp.status_code in (401, 403):
        raise PermissionError(
            "IL-PCSR is gated: accept the dataset terms at https://huggingface.co/datasets/Exploration-Lab/IL-PCSR "
            "and set HF_TOKEN to a token from that account."
        )
    resp.raise_for_status()
    return pd.read_parquet(io.BytesIO(resp.content))


def _as_list(value) -> list[str]:
    if value is None:
        return []
    if isinstance(value, str):
        try:
            value = json.loads(value)
        except json.JSONDecodeError:
            return [v.strip() for v in value.split(",") if v.strip()]
    return [str(v) for v in list(value)]


def load(log=print) -> None:
    token = get_settings().hf_token
    if not token:
        raise PermissionError("IL-PCSR needs HF_TOKEN (the dataset is gated on Hugging Face).")
    with httpx.Client(headers={"Authorization": f"Bearer {token}"}, follow_redirects=True, timeout=600) as client, connection() as conn:
        set_status(conn, DATASET, "loading")
        conn.commit()
        for kind, fname in CANDIDATE_FILES.items():
            df = _fetch(client, fname)
            id_col, text_col = _pick(df, ID_COLS, "id"), _pick(df, TEXT_COLS, "text")
            title_col = _pick(df, TITLE_COLS, "title", required=False)
            for row in df.to_dict("records"):
                ref = str(row[id_col])
                rec = conn.execute(
                    """INSERT INTO authorities (dataset_id, source_ref, kind, title, jurisdiction, text_available)
                       VALUES (%s, %s, %s, %s, 'India', true)
                       ON CONFLICT (dataset_id, source_ref) DO UPDATE SET title = EXCLUDED.title RETURNING id""",
                    (DATASET, ref, "case" if kind == "precedent" else "statute", str(row[title_col]) if title_col else ref),
                ).fetchone()
                conn.execute(
                    """INSERT INTO paragraphs (authority_id, ordinal, label, text) VALUES (%s, 1, 'Document', %s)
                       ON CONFLICT (authority_id, ordinal) DO UPDATE SET text = EXCLUDED.text""",
                    (rec["id"], " ".join(str(row[text_col]).split())),
                )
            conn.commit()
            log(f"  {kind} candidates: {len(df)}")

        for split, fname in QUERY_FILES.items():
            df = _fetch(client, fname)
            id_col, text_col = _pick(df, ID_COLS, "id"), _pick(df, TEXT_COLS, "text")
            rel_cols = {task: _pick(df, cols, f"{task} relevance", required=False) for task, cols in REL_COLS.items()}
            for row in df.to_dict("records"):
                qid = str(row[id_col])
                conn.execute(
                    """INSERT INTO eval_queries (dataset_id, query_id, split, text) VALUES (%s, %s, %s, %s)
                       ON CONFLICT (dataset_id, query_id) DO UPDATE SET text = EXCLUDED.text, split = EXCLUDED.split""",
                    (DATASET, qid, split, str(row[text_col])),
                )
                for task, col in rel_cols.items():
                    for ref in _as_list(row[col]) if col else []:
                        conn.execute(
                            """INSERT INTO eval_qrels (dataset_id, query_id, task, candidate_ref, relevance)
                               VALUES (%s, %s, %s, %s, 1) ON CONFLICT DO NOTHING""",
                            (DATASET, qid, task, ref),
                        )
            conn.commit()
            log(f"  {split} queries: {len(df)}")
        set_status(conn, DATASET, "loaded", "candidates and queries loaded")
