"""Hybrid retrieval over paragraphs: PostgreSQL full-text search + pgvector similarity.

Results from both rankers are merged with reciprocal-rank fusion (RRF), so
paragraphs without an embedding yet are still found through full-text search.
"""

from dataclasses import dataclass

from .db import connection

RRF_K = 60
CANDIDATES = 50
MIN_PARAGRAPH = 60  # shorter fragments (headings, page furniture) are noise for full-text ranking


@dataclass
class SearchFilters:
    dataset: str | None = None
    kind: str | None = None
    year_from: int | None = None
    year_to: int | None = None


_FILTER_SQL = """
    (%(dataset)s::text IS NULL OR a.dataset_id = %(dataset)s)
    AND (%(kind)s::text IS NULL OR a.kind = %(kind)s)
    AND (%(year_from)s::int IS NULL OR a.year >= %(year_from)s)
    AND (%(year_to)s::int IS NULL OR a.year <= %(year_to)s)
"""


def _params(f: SearchFilters, **extra) -> dict:
    return {"dataset": f.dataset, "kind": f.kind, "year_from": f.year_from, "year_to": f.year_to, "n": CANDIDATES, **extra}


def search(query: str, filters: SearchFilters | None = None, limit: int = 10, use_vectors: bool = True) -> list[dict]:
    filters = filters or SearchFilters()
    scores: dict[int, float] = {}
    sources: dict[int, set[str]] = {}
    # Short queries first try to match every term. Long ones (fact scenarios, claims), and short ones
    # with too few strict matches, match any term ranked by length-normalised term frequency, which
    # scored best on the AILA 2019 statute benchmark.
    strict = ("websearch_to_tsquery('english', %(q)s)", "ts_rank_cd(p.tsv, websearch_to_tsquery('english', %(q)s))")
    loose_q = "replace(plainto_tsquery('english', %(q)s)::text, '&', '|')::tsquery"
    long_query = len(query.split()) > 12
    loose = (loose_q, f"ts_rank(p.tsv, {loose_q}, {2 if long_query else 1})")
    with connection() as conn:

        def lexical_ids(tsquery: str, rank: str) -> list[int]:
            rows = conn.execute(
                f"""SELECT p.id FROM paragraphs p JOIN authorities a ON a.id = p.authority_id
                    WHERE p.tsv @@ {tsquery} AND length(p.text) >= {MIN_PARAGRAPH} AND {_FILTER_SQL}
                    ORDER BY {rank} DESC LIMIT %(n)s""",
                _params(filters, q=query),
            ).fetchall()
            return [r["id"] for r in rows]

        lexical = [] if long_query else lexical_ids(*strict)
        if len(lexical) < limit:
            lexical += [i for i in lexical_ids(*loose) if i not in lexical]
        for rank, pid in enumerate(lexical[:CANDIDATES]):
            scores[pid] = scores.get(pid, 0.0) + 1.0 / (RRF_K + rank + 1)
            sources.setdefault(pid, set()).add("full_text")

        if use_vectors and conn.execute("SELECT EXISTS (SELECT 1 FROM paragraphs WHERE embedding IS NOT NULL) AS x").fetchone()["x"]:
            from .embed import embed_query

            vector = embed_query(query)
            dense = conn.execute(
                f"""SELECT p.id FROM paragraphs p JOIN authorities a ON a.id = p.authority_id
                    WHERE p.embedding IS NOT NULL AND {_FILTER_SQL}
                    ORDER BY p.embedding <=> %(v)s LIMIT %(n)s""",
                _params(filters, v=vector),
            ).fetchall()
            for rank, row in enumerate(dense):
                scores[row["id"]] = scores.get(row["id"], 0.0) + 1.0 / (RRF_K + rank + 1)
                sources.setdefault(row["id"], set()).add("vector")

        top = sorted(scores, key=scores.get, reverse=True)[:limit]
        if not top:
            return []
        rows = conn.execute(
            """SELECT p.id AS paragraph_id, p.label, p.text, a.id AS authority_id, a.dataset_id, a.kind, a.title,
                      a.court, a.year, a.neutral_citation, a.reporter_citation
               FROM paragraphs p JOIN authorities a ON a.id = p.authority_id WHERE p.id = ANY(%s)""",
            (top,),
        ).fetchall()
    by_id = {r["paragraph_id"]: r for r in rows}
    return [
        {**by_id[pid], "score": round(scores[pid], 5), "matched_by": sorted(sources[pid])}
        for pid in top
        if pid in by_id
    ]
