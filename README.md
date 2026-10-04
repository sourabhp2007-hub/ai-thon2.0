# HACKMATRIX5.0_TECH-BLASTERS

**AI Legal Integrity & Verification Platform** — *From AI-generated answers to verifiable legal reasoning.*

A verification and trust layer for AI-assisted legal research: legal claims and citations are checked against available authoritative sources, and every result is shown as Claim → Authority → Evidence → Reason → Status.

- `frontend/` — Next.js prototype with demo data and a mock service layer ([README](frontend/README.md))
- `backend/` — FastAPI + PostgreSQL/pgvector data layer: Supreme Court judgments, central legislation, AILA 2019; hybrid search and citation checks ([README](backend/README.md))
- `docs/DATASETS.md` — datasets, licences, what is loaded and retrieval benchmarks
- `docs/IMPLEMENTATION_NOTES.md` — decisions, deviations and architecture

Quick start: `cd frontend && npm install && npm run dev`, then open http://localhost:3000.
