"""API tests against the live database. Skipped when PostgreSQL is not reachable."""

import psycopg
import pytest
from fastapi.testclient import TestClient

from legal_data.config import get_settings

try:
    psycopg.connect(get_settings().database_url, connect_timeout=2).close()
except psycopg.OperationalError:  # pragma: no cover
    pytest.skip("PostgreSQL not available", allow_module_level=True)

from app.main import app  # noqa: E402

client = TestClient(app)


def test_health():
    assert client.get("/api/v1/health").json() == {"status": "ok"}


def test_datasets_are_registered_with_licences():
    ids = {d["id"]: d for d in client.get("/api/v1/datasets").json()}
    assert {"sc_judgments", "aila2019", "il_pcsr", "open_india_law"} <= ids.keys()
    assert all(d["license"] for d in ids.values())


def test_unknown_citation_is_not_found_and_unindexed_reporter_is_not_checked():
    body = {"text": "Fake v. Case, 2021 INSC 99999 and (2020) 4 SCC 512"}
    results = client.post("/api/v1/citations/check", json=body).json()["citations"]
    assert [r["resolution"] for r in results] == ["not_found", "not_checked"]


def test_source_404():
    assert client.get("/api/v1/data/sources/999999999").status_code == 404
