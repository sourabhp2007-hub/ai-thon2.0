import type {
  ActivityEvent,
  Authority,
  Claim,
  ClaimListItem,
  Citation,
  DashboardData,
  DocumentFormat,
  Evidence,
  ReportBundle,
  ReportListItem,
  SearchEntry,
  SourceCoverage,
  SourceListItem,
  StartVerificationInput,
  Verification,
} from "@/lib/types/domain";

export interface ScopeOptions {
  /** Whether demo workspace content is included (Settings › Data). */
  includeDemo: boolean;
}

export interface UploadResult {
  uploadId: string;
  name: string;
  sizeBytes: number;
  format: DocumentFormat;
  pageCount: number | null;
}

export interface SourceDetail {
  authority: Authority;
  /** Authorities referenced by `related` and treatments. */
  linked: Authority[];
  /** Claims (in visible reports) that cite this authority or rely on it as evidence. */
  citedBy: ClaimListItem[];
  citations: Citation[];
  evidence: Evidence[];
  /** Date of the sources used, for legal-status wording. */
  sourcesAsOf: string | null;
}

/**
 * The contract between the UI and the backend. The mock adapter implements it
 * in-process; the HTTP adapter maps it onto the FastAPI routes.
 */
export interface VerificationApi {
  getDashboard(scope: ScopeOptions): Promise<DashboardData>;
  getReports(scope: ScopeOptions): Promise<ReportListItem[]>;
  getReport(reportId: string, scope: ScopeOptions): Promise<ReportBundle | null>;
  getClaims(reportId: string, scope: ScopeOptions): Promise<Claim[]>;
  getClaim(reportId: string, claimIndex: number, scope: ScopeOptions): Promise<Claim | null>;
  getCitations(reportId: string, scope: ScopeOptions): Promise<Citation[]>;
  getSources(scope: ScopeOptions): Promise<{ items: SourceListItem[]; coverage: SourceCoverage | null }>;
  getSource(authorityId: string, scope: ScopeOptions): Promise<SourceDetail | null>;
  getActivity(scope: ScopeOptions): Promise<ActivityEvent[]>;
  getSearchIndex(scope: ScopeOptions): Promise<SearchEntry[]>;
  uploadDocument(file: File, onProgress: (percent: number) => void): Promise<UploadResult>;
  startVerification(input: StartVerificationInput): Promise<{ jobId: string }>;
  getVerification(jobId: string): Promise<Verification | null>;
  cancelVerification(jobId: string): Promise<void>;
}
