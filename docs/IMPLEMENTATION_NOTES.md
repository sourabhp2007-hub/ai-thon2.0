# Implementation Notes — Frontend Prototype

Source of truth: Frontend Content Specification v1.0, the approved Frontend Blueprint and the project requirements. The reference image was **not available** in the repository (D-01), so visual direction follows the blueprint and specification.

## Stack (locked)

Next.js 16 (App Router, Turbopack) · React 19 · TypeScript (strict) · Tailwind CSS 4 · Framer Motion · React Flow (`@xyflow/react`) for the Evidence Graph · Radix primitives (dialog, dropdown, tooltip) · lucide-react icons.
Backend integration boundary: FastAPI/Pydantic via `src/lib/services/http.ts` (set `NEXT_PUBLIC_API_MODE=http`, `NEXT_PUBLIC_API_BASE_URL`).

## Decisions applied (recommended defaults from spec §18)

| ID | Decision | Applied |
|---|---|---|
| D-01 | Reference image | Not available; blueprint/spec followed |
| D-02 | Dashboard overview scope | Default "All completed reports (2)" → 25 claims, 88% coverage; selecting the writ petition shows 20 / 17 / 85% |
| D-03 | "Verified" vs "Assessed" | **Assessed** (as listed in the implementation brief), with tooltip "Assessed does not mean correct." |
| D-04 | Real provisions + fictional cases | Mixed: Article 21 quoted; BSA s. 63 and DPDP s. 8 shown as "Illustrative summary — not the official text"; all cases, courts and the DLR reporter fictional (Northbridge) |
| D-05/06/07 | Upload/paste limits, OCR | 25 MB, PDF/DOCX, text-based only (no OCR); paste 200–50,000 characters |
| D-08/09 | Jurisdiction, quote strictness | Omitted from UI |
| D-10 | Legal status toggle | Shown in New Verification options and Settings, default on; turning it off marks the stage "Skipped" |
| D-11 | Auth/profile/account | Not implemented; static "Demo user" avatar |
| D-12 | Theme | Light workspace only; theme control hidden |
| D-13 | Email notifications | Not implemented; in-app completion toast only |
| D-14 | Deletion / retention | Delete actions **not implemented** (no destructive actions in the prototype) |
| D-15 | Open Judgment | Disabled with tooltip for demo data (no `sourceUrl`) |
| D-16 | Legal status for statutes | Case law only; provisions show "Not applicable" |
| D-17/18 | Reviewer workflow, flag extraction | Not implemented (Phase 2) |
| D-19 | Global search scope | Reports, claims and authorities in the workspace (⌘K) |
| D-20 | First-run acknowledgment | Not required; persistent disclaimers |
| D-21 | Cancel / retry | Cancel stops the simulated job; Retry starts a new job from the beginning |
| D-22 | Date format | `DD Mon YYYY, HH:mm`, formatted deterministically (no locale/timezone drift) |
| D-23 | Demo uploads | Files are not analysed; the simulated pipeline ends at the demo report, with DN-UPLOAD / DN-PROCESSING notices |
| D-24 | Citation not found | Unable to Verify + "Citation not found" flag |
| D-25 | Treatment in graph | Edges between case nodes ("Overruled by", "Followed in", …) |
| D-26 | Short name | "AI Legal Integrity" |

## Deviations from the specification (and why)

1. **PDF export** opens a print-ready view (`/print/reports/[id]`) and the browser's "Save as PDF", rather than generating a PDF file in-app (no PDF library added). Toast reads: "Print view opened. Choose “Save as PDF” to download {filename}." CSV and JSON download directly as specified.
2. **Cancelled verifications** are not added to the Reports list in mock mode (the mock cannot persist server-side state); the cancel modal copy follows the spec and is correct once the backend persists jobs.
3. **Claim 15 flag** is labelled "Citation details mismatch" (the spec's filter taxonomy). The specific "2020 ≠ 2021" year mismatch is shown in the Citations tab and the integrity checklist.
4. **Evidence Graph default focus** is the first claim with contradicting authority (Claim 9) instead of an empty canvas; the "Select a claim…" empty state still appears when the picker is cleared.
5. **Mobile Evidence Graph** shows the indented "Evidence chain" for the selected claim; "All claims" mode is available on desktop only.
6. **Uploaded page count** is unknown client-side, so the file card shows format and size; the backend can return `pageCount`.

## Architecture

- `src/lib/types/domain.ts` — the typed contract (Document, Verification, Claim, Citation, Authority/Source, Evidence, CitationCheck, Report, ProcessingStage, ActivityEvent, …).
- `src/lib/services/` — `VerificationApi` interface; `index.ts` selects mock or HTTP adapter. Components never import fixtures.
- `src/lib/mock/` — demo fixtures in a compact authoring format; `build.ts` derives citation checks from authority records and claim locations from the document text, so no fact is entered twice. `simulation.ts` computes pipeline progress as a pure function of elapsed time.
- `src/lib/domain/` — status config (single source of truth), derived summaries (`summarize`: total, assessed, coverage, largest-remainder percentages), labels, copy (spec IDs), graph builder, export serialisers.
- Report screens: the report layout fetches the bundle once and provides it through context; tabs, drawers (`?claim=`, `?citation=`) and the export modal (`?export=1`) are URL-driven and shareable.
- Preferences (Settings) are stored in a cookie so server components can scope data (e.g. hide demo content → empty states).

## Data consistency (all derived, verified in the running app)

Writ petition report: 20 claims = 12 Supported + 3 Partially Supported + 2 Unsupported + 3 Unable to Verify; Assessed 17; Verification Coverage 85%; 20 citations, 18 located; later treatment for 3 cases. Research memo: 5 claims (3 / 2 / 0 / 0), 100%. Workspace: 25 claims, 22 assessed, 88%.

## Known limitations

- Mock job state lives in the browser session (sessionStorage); a hard refresh keeps jobs, a new browser session does not.
- `npm audit` reports advisories in dev-only tooling dependencies; production dependencies report 0 vulnerabilities.
