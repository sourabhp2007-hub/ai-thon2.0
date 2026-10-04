"""Database connection helpers and the dataset registry."""

from contextlib import contextmanager
from pathlib import Path
from typing import Iterator

import psycopg
from pgvector.psycopg import register_vector
from psycopg.rows import dict_row

from .config import get_settings

SCHEMA = Path(__file__).with_name("schema.sql")

# Every dataset the platform knows about, with provenance and licence.
DATASETS = [
    {
        "id": "sc_judgments",
        "name": "Indian Supreme Court Judgments (1950–present)",
        "source_url": "https://registry.opendata.aws/indian-supreme-court-judgments/",
        "license": "CC-BY-4.0",
        "gated": False,
    },
    {
        "id": "aila2019",
        "name": "AILA 2019 — Precedent & Statute Retrieval (FIRE)",
        "source_url": "https://zenodo.org/records/4063986",
        "license": "CC-BY-4.0",
        "gated": False,
    },
    {
        "id": "il_pcsr",
        "name": "IL-PCSR — Prior Case and Statute Retrieval (EMNLP 2025)",
        "source_url": "https://huggingface.co/datasets/Exploration-Lab/IL-PCSR",
        "license": "CC-BY-NC-SA-4.0",
        "gated": True,
    },
    {
        "id": "open_india_law",
        "name": "open-india-law — Supreme Court, High Courts and legislation",
        "source_url": "https://huggingface.co/datasets/vaquill/open-india-law",
        "license": "CC-BY-4.0",
        "gated": True,
    },
]


def connect(autocommit: bool = False) -> psycopg.Connection:
    conn = psycopg.connect(get_settings().database_url, row_factory=dict_row, autocommit=autocommit)
    register_vector(conn)
    return conn


@contextmanager
def connection(autocommit: bool = False) -> Iterator[psycopg.Connection]:
    conn = connect(autocommit=autocommit)
    try:
        yield conn
        if not autocommit:
            conn.commit()
    finally:
        conn.close()


def init_db() -> None:
    """Apply the schema and make sure every known dataset is registered."""
    # pgvector types must exist before register_vector, so apply the schema on a plain connection.
    with psycopg.connect(get_settings().database_url, autocommit=True) as conn:
        conn.execute(SCHEMA.read_text())
        for d in DATASETS:
            conn.execute(
                """INSERT INTO datasets (id, name, source_url, license, gated)
                   VALUES (%(id)s, %(name)s, %(source_url)s, %(license)s, %(gated)s)
                   ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, source_url = EXCLUDED.source_url,
                       license = EXCLUDED.license, gated = EXCLUDED.gated""",
                d,
            )


def set_status(conn: psycopg.Connection, dataset_id: str, status: str, detail: str | None = None) -> None:
    conn.execute(
        """UPDATE datasets SET status = %s, detail = %s,
               loaded_at = CASE WHEN %s IN ('loaded', 'partial') THEN now() ELSE loaded_at END
           WHERE id = %s""",
        (status, detail, status, dataset_id),
    )
