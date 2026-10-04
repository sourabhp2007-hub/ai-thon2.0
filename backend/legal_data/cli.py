"""Command line for loading datasets.

    python -m legal_data init
    python -m legal_data status
    python -m legal_data sc-metadata [--years 1950-2025]
    python -m legal_data sc-text --years 2023-2024 [--limit 200]
    python -m legal_data aila2019
    python -m legal_data il-pcsr                  (needs HF_TOKEN)
    python -m legal_data open-india-law [--files in_central_legislation in_delhi_judgments]  (needs HF_TOKEN)
    python -m legal_data embed [--dataset sc_judgments] [--kind statute] [--batch 256] [--limit N]
    python -m legal_data evaluate --dataset aila2019 --task statute --k 10
"""

import argparse
import sys

from .db import connection, init_db


def _years(spec: str | None) -> list[int] | None:
    if not spec:
        return None
    years: list[int] = []
    for part in spec.split(","):
        if "-" in part:
            a, b = part.split("-")
            years.extend(range(int(a), int(b) + 1))
        else:
            years.append(int(part))
    return years


def _status() -> None:
    with connection() as conn:
        rows = conn.execute(
            """SELECT d.id, d.status, d.license, d.gated, d.detail,
                      (SELECT count(*) FROM authorities a WHERE a.dataset_id = d.id) AS authorities,
                      (SELECT count(*) FROM paragraphs p JOIN authorities a ON a.id = p.authority_id
                        WHERE a.dataset_id = d.id) AS paragraphs,
                      (SELECT count(*) FROM paragraphs p JOIN authorities a ON a.id = p.authority_id
                        WHERE a.dataset_id = d.id AND p.embedding IS NOT NULL) AS embedded
               FROM datasets d ORDER BY d.id"""
        ).fetchall()
    for r in rows:
        gated = " (gated: needs HF_TOKEN)" if r["gated"] else ""
        print(f"{r['id']:<16} {r['status']:<11} {r['license']:<16} authorities={r['authorities']:<7} "
              f"paragraphs={r['paragraphs']:<8} embedded={r['embedded']}{gated}")
        if r["detail"]:
            print(f"{'':<16} {r['detail']}")


def main(argv: list[str] | None = None) -> None:
    parser = argparse.ArgumentParser(prog="legal_data", description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = parser.add_subparsers(dest="cmd", required=True)
    sub.add_parser("init", help="create tables and register datasets")
    sub.add_parser("status", help="show what is loaded")
    p = sub.add_parser("sc-metadata", help="Supreme Court judgment metadata and citation index")
    p.add_argument("--years")
    p = sub.add_parser("sc-text", help="Supreme Court judgment full text (PDF → paragraphs)")
    p.add_argument("--years", required=True)
    p.add_argument("--limit", type=int)
    sub.add_parser("aila2019", help="AILA 2019 precedent & statute retrieval benchmark")
    sub.add_parser("il-pcsr", help="IL-PCSR retrieval benchmark (Hugging Face, gated)")
    p = sub.add_parser("open-india-law", help="open-india-law judgments and legislation (Hugging Face, gated)")
    p.add_argument("--files", nargs="*", help="parquet file stems, e.g. in_central_legislation")
    p.add_argument("--limit", type=int, help="maximum rows per file")
    p = sub.add_parser("embed", help="compute embeddings for paragraphs that have none")
    p.add_argument("--batch", type=int, default=256)
    p.add_argument("--limit", type=int)
    p.add_argument("--dataset", help="only this dataset, e.g. sc_judgments")
    p.add_argument("--kind", choices=["case", "statute", "provision"], help="only this kind of authority")
    p = sub.add_parser("evaluate", help="retrieval quality against benchmark relevance judgments")
    p.add_argument("--dataset", default="aila2019")
    p.add_argument("--task", choices=["precedent", "statute"], default="statute")
    p.add_argument("--k", type=int, default=10)
    p.add_argument("--limit", type=int)
    p.add_argument("--vectors", action="store_true", help="include vector similarity (needs embeddings)")
    args = parser.parse_args(argv)

    init_db()
    if args.cmd == "init":
        print("Database ready.")
    elif args.cmd == "status":
        _status()
    elif args.cmd == "sc-metadata":
        from .ingest import sc_judgments

        print(f"Loaded metadata for {sc_judgments.load_metadata(_years(args.years))} judgments.")
    elif args.cmd == "sc-text":
        from .ingest import sc_judgments

        print(f"Stored text for {sc_judgments.load_text(_years(args.years) or [], args.limit)} judgments.")
    elif args.cmd == "aila2019":
        from .ingest import aila2019

        aila2019.load()
    elif args.cmd == "il-pcsr":
        from .ingest import il_pcsr

        il_pcsr.load()
    elif args.cmd == "open-india-law":
        from .ingest import open_india_law

        open_india_law.load(args.files, args.limit)
    elif args.cmd == "embed":
        from .embed import embed_missing

        print(f"Embedded {embed_missing(args.batch, args.limit, args.dataset, args.kind)} paragraphs.")
    elif args.cmd == "evaluate":
        from .evaluate import evaluate

        print(evaluate(args.dataset, args.task, args.k, args.limit, args.vectors))
    else:  # pragma: no cover
        parser.print_help()
        sys.exit(2)
