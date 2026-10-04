# Datasets

The platform verifies claims against **available sources**. These are the open datasets the backend loads, what each one is used for, and its licence. All loaders live in `backend/legal_data/ingest/`.

| Dataset | Licence | Access | Loaded in this repo's dev database | Used for |
|---|---|---|---|---|
| [Indian Supreme Court Judgments](https://registry.opendata.aws/indian-supreme-court-judgments/) (AWS Open Data) | CC-BY-4.0 | Open | Metadata for **38,366 judgments (1950–2026)**, 68,962 citation keys; full text for **782 judgments (2024)**, 40,213 paragraphs | Citation existence / court / year / reference checks; judgment text as evidence |
| [open-india-law](https://github.com/Vaquill-AI/open-india-law) (Vaquill) | CC-BY-4.0 | Open mirror (`oss-data-in.vaquill.ai`); Hugging Face copy is gated | **Central legislation: 1,568 Acts, 74,484 provisions** (incl. Bharatiya Sakshya Adhiniyam 2023, DPDP Act 2023, BNS 2023) | Statutory text (e.g. BSA s. 63); High Court judgments available on demand |
| [AILA 2019](https://zenodo.org/records/4063986) (FIRE) | CC-BY-4.0 | Open | **2,914 prior cases, 197 statutes, 50 queries, 155,554 relevance judgments** | Benchmark for "Searching authorities" |
| [IL-PCSR](https://huggingface.co/datasets/Exploration-Lab/IL-PCSR) (EMNLP 2025) | CC-BY-NC-SA-4.0 (non-commercial) | Gated: accept terms on Hugging Face, set `HF_TOKEN` | Not loaded (needs a token) | Larger precedent + statute retrieval benchmark |

Not included:
- **CourtListener Citation Lookup** covers US case law only and needs an API token. It's a reference design for hallucinated-citation detection, not an Indian source.
- **Indian Kanoon**'s terms restrict scraping. Use its paid API if needed.
- **SCC and AIR** reporters have no open dataset. Citations in those formats are recognised but returned as `not_checked`, never as a false "not found".

## Loading

```bash
cd backend && python -m venv .venv && . .venv/bin/activate && pip install -r requirements.txt
cp .env.example .env            # set DATABASE_URL (PostgreSQL 16 + pgvector)
python -m legal_data init
python -m legal_data sc-metadata                     # all years, ~2 min
python -m legal_data sc-text --years 2024            # ~400 MB download per year
python -m legal_data open-india-law                  # central legislation (default)
python -m legal_data open-india-law --files in_delhi_judgments --limit 50000   # large files stream in row groups
python -m legal_data aila2019
HF_TOKEN=... python -m legal_data il-pcsr
python -m legal_data embed --dataset sc_judgments    # CPU, ~8 paragraphs/s on 4 cores
python -m legal_data status
```

## Retrieval quality (AILA 2019, statute task, 50 queries)

| Retrieval | Recall@10 | MRR |
|---|---|---|
| Full-text (PostgreSQL, length-normalised `ts_rank`) | 0.111 | 0.173 |
| Hybrid (full-text + bge-small embeddings, RRF) | **0.186** | **0.296** |

Reproduce with `python -m legal_data evaluate --task statute [--vectors]`.

## Embedding coverage

Embedding all ~182,000 paragraphs on CPU takes several hours. Search is hybrid, so paragraphs without a vector are still found by full-text search. Run `python -m legal_data embed` (optionally `--dataset` / `--kind`) on a larger machine to complete coverage.
