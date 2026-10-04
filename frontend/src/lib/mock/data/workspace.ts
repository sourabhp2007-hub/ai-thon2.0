import type { ActivityEvent, LegalDocument, Report } from "@/lib/types/domain";
import { sourcesAsOf } from "./authorities";
import { MEMO_REPORT_ID, researchMemoPages } from "./report-research-memo";
import { WRIT_REPORT_ID, writPetitionPages } from "./report-writ-petition";

/** DEMO DATA — documents, reports and activity in the demo workspace. */

export const PROCESSING_JOB_ID = "job-employee-monitoring";
export const FAILED_JOB_ID = "job-appeal-brief";

export const documents: LegalDocument[] = [
  {
    id: "doc-writ-petition",
    name: "Writ Petition Draft — Data Retention (Demo).pdf",
    type: "legal_brief",
    format: "pdf",
    pageCount: writPetitionPages.length,
    uploadedAt: "2026-10-02T16:31:00",
    isDemo: true,
    pages: writPetitionPages,
  },
  {
    id: "doc-research-memo",
    name: "Research Memo — Electronic Evidence (Demo).docx",
    type: "legal_research",
    format: "docx",
    pageCount: researchMemoPages.length,
    uploadedAt: "2026-09-28T15:02:00",
    isDemo: true,
    pages: researchMemoPages,
  },
  {
    id: "doc-employee-monitoring",
    name: "AI Response — Employee Monitoring (Demo)",
    type: "ai_response",
    format: "text",
    pageCount: null,
    uploadedAt: "2026-10-03T10:12:00",
    isDemo: true,
  },
  {
    id: "doc-appeal-brief",
    name: "Appeal Brief Excerpt (Demo).pdf",
    type: "legal_brief",
    format: "pdf",
    pageCount: null,
    uploadedAt: "2026-10-01T11:19:00",
    isDemo: true,
  },
];

export const reports: Report[] = [
  {
    id: WRIT_REPORT_ID,
    documentId: "doc-writ-petition",
    jobId: "job-writ-petition",
    state: "complete",
    verifiedAt: "2026-10-02T16:42:00",
    sourcesAsOf,
  },
  {
    id: MEMO_REPORT_ID,
    documentId: "doc-research-memo",
    jobId: "job-research-memo",
    state: "complete",
    verifiedAt: "2026-09-28T15:10:00",
    sourcesAsOf,
  },
  {
    id: "rpt-employee-monitoring",
    documentId: "doc-employee-monitoring",
    jobId: PROCESSING_JOB_ID,
    state: "processing",
    verifiedAt: null,
    sourcesAsOf: null,
  },
  {
    id: "rpt-appeal-brief",
    documentId: "doc-appeal-brief",
    jobId: FAILED_JOB_ID,
    state: "failed",
    verifiedAt: null,
    sourcesAsOf: null,
    error: "Text could not be extracted.",
  },
];

export const activity: ActivityEvent[] = [
  { id: "ev5", kind: "verification_started", reportId: "rpt-employee-monitoring", detail: "Pasted text", at: "2026-10-03T10:12:00" },
  { id: "ev4", kind: "report_exported", reportId: WRIT_REPORT_ID, detail: "PDF", at: "2026-10-02T17:05:00" },
  { id: "ev3", kind: "verification_completed", reportId: WRIT_REPORT_ID, detail: "", at: "2026-10-02T16:42:00" },
  { id: "ev2", kind: "verification_failed", reportId: "rpt-appeal-brief", detail: "Text could not be extracted", at: "2026-10-01T11:20:00" },
  { id: "ev1", kind: "verification_completed", reportId: MEMO_REPORT_ID, detail: "", at: "2026-09-28T15:10:00" },
];
