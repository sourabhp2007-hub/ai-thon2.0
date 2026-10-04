# AI Legal Integrity & Verification Platform — Frontend

*From AI-generated answers to verifiable legal reasoning.*

A verification and evidence-traceability interface for AI-assisted legal research. Every result follows the chain **Claim → Authority → Evidence → Reason → Status**. The prototype runs on demo data (fictional authorities, clearly labelled) through a mock service layer that can be swapped for the FastAPI backend.

## Run

```bash
cd frontend
npm install
npm run dev        # http://localhost:3000
```

Production: `npm run build && npm start`. Checks: `npm run lint`, `npx tsc --noEmit`.

## Connect the backend

```bash
NEXT_PUBLIC_API_MODE=http NEXT_PUBLIC_API_BASE_URL=http://localhost:8000/api/v1 npm run dev
```

The HTTP adapter (`src/lib/services/http.ts`) expects responses matching `src/lib/types/domain.ts`.

## Routes

| Route | Screen |
|---|---|
| `/` | Landing |
| `/dashboard` | Dashboard |
| `/verify/new` | New Verification (upload or paste) |
| `/verify/[jobId]` | Processing (8-stage pipeline) |
| `/reports` | Reports |
| `/reports/[reportId]` | Verification Report — Claims tab (`?claim=n` drawer, `?export=1` modal) |
| `/reports/[reportId]/document` | Document view |
| `/reports/[reportId]/citations` | Citations (`?citation=n` drawer) |
| `/reports/[reportId]/graph` | Evidence Graph |
| `/reports/[reportId]/claims/[claimId]` | Claim Detail (full page) |
| `/sources`, `/sources/[authorityId]` | Sources, Source Viewer |
| `/settings` | Settings |
| `/print/reports/[reportId]` | Print view for PDF export |

Keyboard: `J`/`K` next/previous claim · `Esc` close panel · `/` search claims · `⌘K` global search.

## Structure

```
src/
  app/            routes ((marketing), (workspace), print)
  components/     ui, layout, navigation, dashboard, verification, reports,
                  claims, citations, evidence, sources, graph, settings, marketing
  hooks/          URL state, media query
  lib/
    types/        domain model (backend contract)
    services/     API interface + mock/http adapters
    mock/         demo fixtures and pipeline simulation
    domain/       status system, derived summaries, labels, copy, graph, export
```

See `../docs/IMPLEMENTATION_NOTES.md` for decisions and deviations.

> The platform assists legal professionals by checking legal claims and citations against available sources. It does not provide legal advice; final legal judgment remains with the qualified legal professional.
