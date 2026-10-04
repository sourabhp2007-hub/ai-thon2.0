import type {
  ActivityKind,
  AuthorityType,
  CheckKey,
  CheckResult,
  CitationCheck,
  ClaimFlag,
  DocumentFormat,
  DocumentType,
  EvidenceRelationship,
  ReportState,
  StageState,
  TreatmentKind,
  UnableReason,
} from "@/lib/types/domain";

export const DOCUMENT_TYPE_LABEL: Record<DocumentType, string> = {
  legal_brief: "Legal brief",
  legal_research: "Legal research document",
  ai_response: "AI-generated legal response",
  other: "Other legal document",
};

export const DOCUMENT_TYPES = Object.keys(DOCUMENT_TYPE_LABEL) as DocumentType[];

export const FORMAT_LABEL: Record<DocumentFormat, string> = {
  pdf: "PDF",
  docx: "DOCX",
  text: "Pasted text",
};

export const REPORT_STATE_LABEL: Record<ReportState, string> = {
  queued: "Queued",
  processing: "Processing",
  complete: "Complete",
  failed: "Failed",
  cancelled: "Cancelled",
};

export const STAGE_STATE_LABEL: Record<StageState, string> = {
  done: "Done",
  active: "In progress",
  waiting: "Waiting",
  failed: "Failed",
  skipped: "Skipped",
};

export const AUTHORITY_TYPE_LABEL: Record<AuthorityType, string> = {
  case: "Case law",
  constitutional_provision: "Constitutional provision",
  statutory_provision: "Statutory provision",
};

export const ACTIVITY_LABEL: Record<ActivityKind, string> = {
  verification_started: "Verification started",
  verification_completed: "Verification completed",
  verification_failed: "Verification failed",
  report_exported: "Report exported",
};

export const FLAG_META: Record<ClaimFlag, { label: string; tooltip: string }> = {
  quote_mismatch: { label: "Quote mismatch", tooltip: "Quoted words differ from the source text." },
  citation_details_mismatch: { label: "Citation details mismatch", tooltip: "The court, year or reference differs from the source." },
  citation_not_found: { label: "Citation not found", tooltip: "This citation could not be located in available sources." },
  source_not_available: { label: "Source not available", tooltip: "This type of source is not among the sources available to the platform." },
  contradicting_evidence: { label: "Contradicting evidence", tooltip: "Evidence in available sources points against this claim." },
  contradicting_authority: { label: "Contradicting authority", tooltip: "Evidence in available sources points against this claim." },
  overruled: { label: "Overruled", tooltip: "A cited case has later been overruled on this point." },
  distinguished: { label: "Distinguished", tooltip: "A cited case has later been distinguished. Review whether this affects the claim." },
  no_citation: { label: "No citation", tooltip: "The claim does not cite an authority." },
};

export const FLAG_ORDER = Object.keys(FLAG_META) as ClaimFlag[];

export const UNABLE_REASON_LABEL: Record<UnableReason, string> = {
  citation_not_found: "Citation not found in available sources",
  source_not_available: "Source type not available",
  no_citation: "No authority cited and none found",
  ambiguous_citation: "Citation is ambiguous",
  retrieval_incomplete: "Retrieval did not complete",
};

export const TREATMENT_META: Record<TreatmentKind, { label: string; tooltip: string; past: string }> = {
  followed: { label: "Followed", tooltip: "Later applied by another authority.", past: "Followed in" },
  distinguished: {
    label: "Distinguished",
    tooltip: "Later held not to apply to different facts. Review whether this affects the claim.",
    past: "Distinguished in",
  },
  modified: { label: "Modified", tooltip: "Later altered in part.", past: "Modified in" },
  reconsidered: { label: "Reconsidered", tooltip: "Later referred for, or subject to, reconsideration.", past: "Reconsidered in" },
  overruled: { label: "Overruled", tooltip: "Later held not to be good law on the point.", past: "Overruled by" },
};

export const RELATIONSHIP_META: Record<EvidenceRelationship, { chip: string; edge: string }> = {
  supports: { chip: "Supports this claim", edge: "Supports" },
  partially_supports: { chip: "Partially supports this claim", edge: "Partially supports" },
  contradicts: { chip: "Contradicts this claim", edge: "Contradicts" },
  context: { chip: "Context only", edge: "Context only" },
  supports_overruled: { chip: "States the claim (authority overruled)", edge: "Supports — authority overruled" },
};

export const CHECK_KEY_LABEL: Record<CheckKey, string> = {
  existence: "Case existence",
  case_name: "Case name",
  court: "Court",
  year: "Year",
  reference: "Citation reference",
  paragraph: "Paragraph existence",
  quote: "Quote verification",
  support: "Claim support",
  legal_status: "Legal status",
};

const CHECK_LABELS: Record<CheckKey, Partial<Record<CheckResult, string>>> = {
  existence: { pass: "Case found", fail: "Case not found", not_checked: "Not checked", not_applicable: "Not applicable" },
  case_name: { pass: "Case name matches", warn: "Case name differs slightly", fail: "Case name does not match", not_checked: "Not checked", not_applicable: "Not applicable" },
  court: { pass: "Correct court", fail: "Court does not match", not_checked: "Not checked", not_applicable: "Not applicable" },
  year: { pass: "Correct year", warn: "Year mismatch", not_checked: "Not checked", not_applicable: "Not applicable" },
  reference: { pass: "Reference matches", warn: "Reference partially matches", fail: "Reference does not match", not_checked: "Not checked", not_applicable: "Not applicable" },
  paragraph: { pass: "Paragraph found", warn: "Passage found at a different paragraph", fail: "Paragraph not found", not_checked: "Not checked", not_applicable: "Not applicable" },
  quote: { pass: "Quote matches source", warn: "Quote mismatch", fail: "Quote not found in source", not_checked: "Not checked", not_applicable: "No quotation in claim" },
  support: { pass: "Supports claim", warn: "Partial claim support", fail: "Does not support claim", not_checked: "Not checked" },
  legal_status: { pass: "No adverse treatment found", warn: "Later treatment found", fail: "Overruled", not_checked: "Not checked", not_applicable: "Not applicable" },
};

export function checkLabel(check: CitationCheck): string {
  return check.label ?? CHECK_LABELS[check.key][check.result] ?? "Not checked";
}

export const CHECK_RESULT_META: Record<CheckResult, { symbol: string; label: string; className: string }> = {
  pass: { symbol: "✓", label: "Pass", className: "text-supported" },
  warn: { symbol: "⚠", label: "Warning", className: "text-partial" },
  fail: { symbol: "✕", label: "Fail", className: "text-unsupported" },
  not_checked: { symbol: "–", label: "Not checked", className: "text-unverified" },
  not_applicable: { symbol: "N/A", label: "Not applicable", className: "text-muted" },
};

/** Display order for warnings-first checklists. */
export const CHECK_RESULT_PRIORITY: Record<CheckResult, number> = {
  fail: 0,
  warn: 1,
  pass: 2,
  not_checked: 3,
  not_applicable: 4,
};
