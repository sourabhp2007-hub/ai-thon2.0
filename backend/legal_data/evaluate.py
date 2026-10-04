"""Retrieval evaluation against benchmark relevance judgments (AILA 2019, IL-PCSR).

Measures how well "Searching authorities" finds the authorities that legal
experts marked relevant: Recall@k and Mean Reciprocal Rank over the queries.
"""

from .db import connection
from .search import SearchFilters, search

TASK_KIND = {"precedent": "case", "statute": "statute"}


def evaluate(dataset: str, task: str, k: int = 10, limit: int | None = None, use_vectors: bool = False) -> dict:
    with connection() as conn:
        queries = conn.execute(
            "SELECT query_id, text FROM eval_queries WHERE dataset_id = %s ORDER BY query_id LIMIT %s",
            (dataset, limit),
        ).fetchall()
        qrels = conn.execute(
            "SELECT query_id, candidate_ref FROM eval_qrels WHERE dataset_id = %s AND task = %s AND relevance > 0",
            (dataset, task),
        ).fetchall()
        refs = {r["id"]: r["source_ref"] for r in conn.execute(
            "SELECT id, source_ref FROM authorities WHERE dataset_id = %s", (dataset,)
        ).fetchall()}
    relevant: dict[str, set[str]] = {}
    for r in qrels:
        relevant.setdefault(r["query_id"], set()).add(r["candidate_ref"])

    recalls, rrs = [], []
    for q in queries:
        gold = relevant.get(q["query_id"])
        if not gold:
            continue
        hits = search(q["text"], SearchFilters(dataset=dataset, kind=TASK_KIND[task]), limit=k * 5, use_vectors=use_vectors)
        ranked: list[str] = []
        for h in hits:  # one entry per authority, in rank order
            ref = refs.get(h["authority_id"])
            if ref and ref not in ranked:
                ranked.append(ref)
        top = ranked[:k]
        recalls.append(len(gold & set(top)) / len(gold))
        rr = next((1 / (i + 1) for i, ref in enumerate(ranked) if ref in gold), 0.0)
        rrs.append(rr)
    n = len(recalls)
    return {
        "dataset": dataset,
        "task": task,
        "queries": n,
        f"recall@{k}": round(sum(recalls) / n, 4) if n else None,
        "mrr": round(sum(rrs) / n, 4) if n else None,
        "retrieval": "hybrid" if use_vectors else "full_text",
    }
