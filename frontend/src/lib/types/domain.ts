/**
 * Domain model shared by the UI, the mock service and the future FastAPI
 * adapter. Field names mirror the planned Pydantic response models so an
 * HTTP response can be mapped onto these types without touching components.
 */

export type VerificationStatus =
  | "supported"
  | "partially_supported"
  | "unsupported"
  | "unable_to_verify";

export type UnableReason =
  | "citation_not_found"
  | "source_not_available"
  | "no_citation"
  | "ambiguous_citation"
  | "retrieval_incomplete";

export type CheckResult = "pass" | "warn" | "fail" | "not_checked" | "not_applicable";

export type CheckKey =
  | "existence"
  | "case_name"
  | "court"
  | "year"
  | "reference"
  | "paragraph"
  | "quote"
  | "support"
  | "legal_status";

export type TreatmentKind = "followed" | "distinguished" | "modified" | "reconsidered" | "overruled";

export type EvidenceRelationship =
  | "supports"
  | "partially_supports"
  | "contradicts"
  | "context"
  | "supports_overruled";

export type AuthorityType = "case" | "constitutional_provision" | "statutory_provision";

export type DocumentType =
  | "legal_brief"
  | "legal_research"
  | "ai_response"
  | "other";

export type DocumentFormat = "pdf" | "docx" | "text";

export type ReportState = "queued" | "processing" | "complete" | "failed" | "cancelled";

export type StageState = "done" | "active" | "waiting" | "failed" | "skipped";

export type StageKey =
  | "uploaded"
  | "extract_text"
  | "identify_claims"
  | "extract_citations"
  | "search_authorities"
  | "verify_evidence"
  | "check_legal_status"
  | "generate_report";

export type ClaimFlag =
  | "quote_mismatch"
  | "citation_details_mismatch"
  | "citation_not_found"
  | "source_not_available"
  | "contradicting_evidence"
  | "contradicting_authority"
  | "overruled"
  | "distinguished"
  | "no_citation";

/* ------------------------------------------------------------------ */

export interface DocumentPage {
  number: number;
  /** Paragraph text in order. Section headings are prefixed with "## ". */
  paragraphs: string[];
}

export interface LegalDocument {
  id: string;
  name: string;
  type: DocumentType;
  format: DocumentFormat;
  pageCount: number | null;
  uploadedAt: string;
  isDemo: boolean;
  /** Extracted text. Absent until text extraction has completed. */
  pages?: DocumentPage[];
}

export interface Paragraph {
  /** Stable id within the authority, e.g. "43" or "art21". */
  id: string;
  /** Display label, e.g. "¶43", "Art. 21", "s. 63". */
  label: string;
  text: string;
}

export interface Treatment {
  kind: TreatmentKind;
  byAuthorityId: string;
  /** Paragraph of the treating authority. */
  paragraphId: string;
  date: string;
  note: string;
}

export interface RelatedAuthority {
  authorityId: string;
  note: string;
}

/** An authority as held in the platform's available sources. */
export interface Authority {
  id: string;
  type: AuthorityType;
  title: string;
  shortTitle: string;
  court: string | null;
  decidedOn: string | null;
  citation: string;
  jurisdiction: string;
  /** How the text is held: verbatim, judgment excerpts, or an illustrative summary. */
  textNature: "official_text" | "judgment_excerpt" | "illustrative_summary";
  isDemo: boolean;
  sourceUrl: string | null;
  paragraphs: Paragraph[];
  treatments: Treatment[];
  /** False when no treatment data exists, which differs from "none found". */
  treatmentDataAvailable: boolean;
  /** Provisions this authority interprets. */
  interprets: string[];
  related: RelatedAuthority[];
}

export type Source = Authority;

export interface CitationCheck {
  key: CheckKey;
  result: CheckResult;
  /** Overrides the default label for this key/result pair. */
  label?: string;
  asCited?: string;
  inSource?: string;
  /** Explains a warning, failure or N/A. */
  note?: string;
}

export interface ParsedCitation {
  caseName?: string;
  court?: string;
  year?: string;
  reference?: string;
  pinpoint?: string;
}

export interface Citation {
  id: string;
  reportId: string;
  claimId: string;
  /** 1-based order within the report. */
  index: number;
  rawText: string;
  parsed: ParsedCitation;
  resolution: "located" | "not_found" | "source_not_available";
  authorityId: string | null;
  paragraphId: string | null;
  isShortForm: boolean;
  checks: CitationCheck[];
}

export interface Evidence {
  id: string;
  claimId: string;
  authorityId: string;
  paragraphId: string;
  /** Exact substring of the paragraph text that bears on the claim. */
  highlight: string;
  relationship: EvidenceRelationship;
  /** Short system-generated relevance note. */
  note: string;
}

export interface ReasonSentence {
  text: string;
  /** Evidence ids this sentence relies on. Empty = no linked evidence. */
  evidenceIds: string[];
}

export interface Contradiction {
  authorityId: string;
  paragraphId: string;
  summary: string;
}

export interface QuoteComparison {
  asQuoted: string;
  inSource: string;
  /** Differing words, highlighted in each version. */
  quotedDiff: string;
  sourceDiff: string;
}

export interface Claim {
  id: string;
  reportId: string;
  /** 1-based position in document order. */
  index: number;
  text: string;
  location: { page: number; paragraph: number };
  status: VerificationStatus;
  citationIds: string[];
  evidenceIds: string[];
  reason: ReasonSentence[];
  flags: ClaimFlag[];
  unableReason?: UnableReason;
  whatYouCanDo?: string;
  contradictions: Contradiction[];
  related: RelatedAuthority[];
  quoteComparison?: QuoteComparison;
}

export interface ProcessingStage {
  key: StageKey;
  label: string;
  state: StageState;
  activeDescription: string;
  result?: string;
  error?: string;
}

export interface DiscoveredClaim {
  index: number;
  page: number;
  text: string;
  phase: "awaiting" | "verifying" | "assessed";
  status: VerificationStatus | null;
}

/** A verification job: one document passing through the pipeline. */
export interface Verification {
  id: string;
  documentName: string;
  documentType: DocumentType;
  inputKind: "file" | "text";
  pageCount: number | null;
  state: ReportState;
  stages: ProcessingStage[];
  /** 0-based index of the current stage. */
  currentStageIndex: number;
  startedAt: string;
  completedAt?: string;
  reportId?: string;
  error?: string;
  discoveredClaims: DiscoveredClaim[];
  isSimulated: boolean;
}

export interface Report {
  id: string;
  documentId: string;
  jobId: string;
  state: ReportState;
  verifiedAt: string | null;
  sourcesAsOf: string | null;
  /** Present for in-flight or failed reports. */
  progressLabel?: string;
  error?: string;
}

/** Everything the report screens need, in one response. */
export interface ReportBundle {
  report: Report;
  document: LegalDocument;
  claims: Claim[];
  citations: Citation[];
  evidence: Evidence[];
  /** Authorities referenced by this report, including treating/related ones. */
  authorities: Authority[];
}

export interface ReportListItem {
  report: Report;
  document: LegalDocument;
  /** Null until the report is complete. */
  statusCounts: StatusCounts | null;
}

export type StatusCounts = Record<VerificationStatus, number>;

export interface ClaimSummary {
  total: number;
  assessed: number;
  /** 0–100, whole number. */
  coverage: number;
  counts: StatusCounts;
  /** Largest-remainder percentages that always add up to 100. */
  percentages: StatusCounts;
}

export type ActivityKind =
  | "verification_started"
  | "verification_completed"
  | "verification_failed"
  | "report_exported";

export interface ActivityEvent {
  id: string;
  kind: ActivityKind;
  reportId: string;
  detail: string;
  at: string;
}

export interface ClaimListItem {
  claim: Claim;
  report: Report;
  document: LegalDocument;
  authorityLabel: string;
}

export interface DashboardData {
  completedReports: ReportListItem[];
  recentReports: ReportListItem[];
  /** Claims from completed reports, for status filtering on the dashboard. */
  claims: ClaimListItem[];
  activity: ActivityEvent[];
}

export interface SearchEntry {
  kind: "report" | "claim" | "authority";
  label: string;
  detail: string;
  href: string;
}

export interface SourceListItem {
  authority: Authority;
  citedInClaims: number;
}

export interface SourceCoverage {
  collections: { label: string; detail: string; available: boolean }[];
  updatedAt: string;
}

export interface Preferences {
  defaultDocumentType: DocumentType;
  checkLegalStatus: boolean;
  notifyOnComplete: boolean;
  showDemo: boolean;
}

export interface StartVerificationInput {
  name: string;
  documentType: DocumentType;
  inputKind: "file" | "text";
  checkLegalStatus: boolean;
  pageCount?: number | null;
}
