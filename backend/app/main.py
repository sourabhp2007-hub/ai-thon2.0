"""FastAPI service exposing the data layer.

Run:  uvicorn app.main:app --reload --port 8000

Routes live under /api/v1. The data endpoints here are the real sources the
verification pipeline (and the frontend's Sources views) will read from.
"""

from contextlib import asynccontextmanager
from datetime import date

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from legal_data.config import get_settings
from legal_data.db import connection, init_db
from legal_data.search import SearchFilters, search
from legal_data.verify import check_text

@asynccontextmanager
async def lifespan(_: FastAPI):
    init_db()
    yield


app = FastAPI(title="AI Legal Integrity — Data API", version="0.1.0", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=get_settings().cors_origins,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)


# ---- models -------------------------------------------------------------


class Dataset(BaseModel):
    id: str
    name: str
    source_url: str
    license: str
    gated: bool
    status: str
    detail: str | None
    authorities: int
    paragraphs: int
    embedded: int


class AuthoritySummary(BaseModel):
    id: int
    dataset_id: str
    kind: str
    title: str
    court: str | None
    year: int | None
    decided_on: date | None
    neutral_citation: str | None
    reporter_citation: str | None
    text_available: bool


class Paragraph(BaseModel):
    ordinal: int
    label: str
    text: str


class AuthorityDetail(AuthoritySummary):
    jurisdiction: str | None
    judges: str | None
    petitioner: str | None
    respondent: str | None
    disposal: str | None
    meta: dict
    paragraphs: list[Paragraph]
    paragraph_total: int


class SearchHit(BaseModel):
    paragraph_id: int
    label: str
    text: str
    authority_id: int
    dataset_id: str
    kind: str
    title: str
    court: str | None
    year: int | None
    neutral_citation: str | None
    reporter_citation: str | None
    score: float
    matched_by: list[str]


class CitationRequest(BaseModel):
    text: str = Field(..., min_length=3, max_length=20_000, description="A claim or passage containing citations")
    case_name: str | None = Field(None, description="Case name as cited, if known")


# ---- routes -------------------------------------------------------------


@app.get("/api/v1/health")
def health() -> dict:
    with connection() as conn:
        conn.execute("SELECT 1")
    return {"status": "ok"}


@app.get("/api/v1/datasets", response_model=list[Dataset])
def datasets() -> list[dict]:
    with connection() as conn:
        return conn.execute(
            """SELECT d.*,
                      (SELECT count(*) FROM authorities a WHERE a.dataset_id = d.id) AS authorities,
                      (SELECT count(*) FROM paragraphs p JOIN authorities a ON a.id = p.authority_id WHERE a.dataset_id = d.id) AS paragraphs,
                      (SELECT count(*) FROM paragraphs p JOIN authorities a ON a.id = p.authority_id
                        WHERE a.dataset_id = d.id AND p.embedding IS NOT NULL) AS embedded
               FROM datasets d ORDER BY d.id"""
        ).fetchall()


@app.get("/api/v1/data/sources", response_model=list[AuthoritySummary])
def list_sources(
    q: str | None = Query(None, description="title, party or citation"),
    dataset: str | None = None,
    kind: str | None = Query(None, pattern="^(case|statute|provision)$"),
    year_from: int | None = None,
    year_to: int | None = None,
    limit: int = Query(25, ge=1, le=200),
    offset: int = Query(0, ge=0),
) -> list[dict]:
    with connection() as conn:
        return conn.execute(
            """SELECT id, dataset_id, kind, title, court, year, decided_on, neutral_citation, reporter_citation, text_available
               FROM authorities a
               WHERE (%(q)s::text IS NULL OR a.title ILIKE '%%' || %(q)s || '%%'
                      OR a.neutral_citation ILIKE '%%' || %(q)s || '%%' OR a.reporter_citation ILIKE '%%' || %(q)s || '%%')
                 AND (%(dataset)s::text IS NULL OR a.dataset_id = %(dataset)s)
                 AND (%(kind)s::text IS NULL OR a.kind = %(kind)s)
                 AND (%(year_from)s::int IS NULL OR a.year >= %(year_from)s)
                 AND (%(year_to)s::int IS NULL OR a.year <= %(year_to)s)
               ORDER BY a.text_available DESC, a.year DESC NULLS LAST, a.id
               LIMIT %(limit)s OFFSET %(offset)s""",
            {"q": q, "dataset": dataset, "kind": kind, "year_from": year_from, "year_to": year_to, "limit": limit, "offset": offset},
        ).fetchall()


@app.get("/api/v1/data/sources/{authority_id}", response_model=AuthorityDetail)
def get_source(
    authority_id: int,
    para_from: int = Query(1, ge=1),
    para_limit: int = Query(200, ge=1, le=1000),
) -> dict:
    with connection() as conn:
        row = conn.execute(
            """SELECT id, dataset_id, kind, title, court, year, decided_on, neutral_citation, reporter_citation,
                      text_available, jurisdiction, judges, petitioner, respondent, disposal, meta
               FROM authorities WHERE id = %s""",
            (authority_id,),
        ).fetchone()
        if not row:
            raise HTTPException(404, "Source not found")
        paragraphs = conn.execute(
            """SELECT ordinal, label, text FROM paragraphs WHERE authority_id = %s AND ordinal >= %s
               ORDER BY ordinal LIMIT %s""",
            (authority_id, para_from, para_limit),
        ).fetchall()
        total = conn.execute("SELECT count(*) AS n FROM paragraphs WHERE authority_id = %s", (authority_id,)).fetchone()["n"]
    return {**row, "paragraphs": paragraphs, "paragraph_total": total}


@app.get("/api/v1/search", response_model=list[SearchHit])
def search_paragraphs(
    q: str = Query(..., min_length=2, max_length=5000),
    dataset: str | None = None,
    kind: str | None = Query(None, pattern="^(case|statute|provision)$"),
    year_from: int | None = None,
    year_to: int | None = None,
    limit: int = Query(10, ge=1, le=50),
    vectors: bool = True,
) -> list[dict]:
    return search(q, SearchFilters(dataset, kind, year_from, year_to), limit=limit, use_vectors=vectors)


@app.post("/api/v1/citations/check")
def check_citations(body: CitationRequest) -> dict:
    results = check_text(body.text, body.case_name)
    return {"citations": results, "count": len(results)}
