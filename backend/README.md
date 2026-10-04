# Backend — data layer and API

Python · FastAPI · PostgreSQL 16 + pgvector. Loads open Indian legal datasets and serves sources, hybrid search and citation checks to the verification pipeline and the frontend.

## Setup

```bash
# PostgreSQL 16 with pgvector (Debian/Ubuntu: apt install postgresql-16 postgresql-16-pgvector)
sudo -u postgres psql -c "CREATE ROLE legal LOGIN PASSWORD 'legal'" -c "CREATE DATABASE legal_integrity OWNER legal"
sudo -u postgres psql -d legal_integrity -c "CREATE EXTENSION vector; CREATE EXTENSION pg_trgm"

python -m venv .venv && . .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
python -m legal_data init
```

Load data as described in [../docs/DATASETS.md](../docs/DATASETS.md), then:

```bash
uvicorn app.main:app --reload --port 8000     # interactive docs at http://localhost:8000/docs
python -m pytest -q
```

## API

| Method | Route | Purpose |
|---|---|---|
| GET | `/api/v1/health` | Database reachable |
| GET | `/api/v1/datasets` | Each dataset's status, licence and counts |
| GET | `/api/v1/data/sources?q=&dataset=&kind=&year_from=&year_to=` | Find authorities by title, party or citation |
| GET | `/api/v1/data/sources/{id}` | One authority with its paragraphs (the Source Viewer) |
| GET | `/api/v1/search?q=` | Hybrid paragraph search (full-text + vectors, RRF) |
| POST | `/api/v1/citations/check` | Parse every citation in a passage and check existence, case name, court, year and reference |

`/citations/check` returns checks in the frontend's vocabulary (`pass`, `warn`, `fail`, `not_checked`, `not_applicable`) so results can fill the Citation Integrity checklist directly.

## Layout

```
legal_data/
  schema.sql        tables: datasets, authorities, paragraphs (tsvector + vector), citation_index, eval_*
  citations.py      INSC / SCR / SCC / AIR parsing and normalisation
  text.py           PDF → numbered paragraphs
  ingest/           one loader per dataset
  embed.py          fastembed (ONNX, CPU) → pgvector
  search.py         hybrid retrieval
  verify.py         citation checks
  evaluate.py       Recall@k / MRR against benchmark judgments
  cli.py            python -m legal_data …
app/main.py         FastAPI routes
```

The report and verification endpoints the frontend's HTTP adapter expects (`/dashboard`, `/reports`, `/verifications`) belong to the verification pipeline. The pipeline is the next step and will be built on these modules.
