import { nowIso } from "@/lib/domain/format";
import { claimAuthorityLabel } from "@/lib/domain/report";
import { countStatuses } from "@/lib/domain/summary";
import type { ScopeOptions, VerificationApi } from "@/lib/services/types";
import type { Authority, ClaimListItem, ReportBundle, ReportListItem, SearchEntry } from "@/lib/types/domain";
import { authorities, sourcesAsOf } from "./data/authorities";
import { researchMemo } from "./data/report-research-memo";
import { writPetition, WRIT_REPORT_ID } from "./data/report-writ-petition";
import { activity, documents, FAILED_JOB_ID, PROCESSING_JOB_ID, reports } from "./data/workspace";
import { computeVerification, offsetForStage, STAGES, type SimulatedJob } from "./simulation";

/** In-process implementation of VerificationApi over the demo fixtures. */

const LATENCY_MS = 120;
const wait = (ms = LATENCY_MS) => new Promise((resolve) => setTimeout(resolve, ms));

const claimSets: Record<string, typeof writPetition> = {
  [WRIT_REPORT_ID]: writPetition,
  "rpt-research-memo": researchMemo,
};

function bundleFor(reportId: string): ReportBundle | null {
  const report = reports.find((r) => r.id === reportId);
  if (!report) return null;
  const document = documents.find((d) => d.id === report.documentId)!;
  const set = claimSets[reportId] ?? { claims: [], citations: [], evidence: [] };

  // Include cited authorities plus anything they link to (treatments, related).
  const ids = new Set<string>();
  for (const c of set.citations) if (c.authorityId) ids.add(c.authorityId);
  for (const e of set.evidence) ids.add(e.authorityId);
  for (const id of [...ids]) {
    const a = authorities.find((x) => x.id === id);
    a?.treatments.forEach((t) => ids.add(t.byAuthorityId));
    a?.related.forEach((r) => ids.add(r.authorityId));
    a?.interprets.forEach((p) => ids.add(p));
  }
  const progressLabel = report.jobId === PROCESSING_JOB_ID ? seededStageLabel(SEEDED_PROCESSING_STAGE) : undefined;
  return { report: { ...report, progressLabel }, document, ...set, authorities: authorities.filter((a) => ids.has(a.id)) };
}

function listItem(reportId: string): ReportListItem {
  const bundle = bundleFor(reportId)!;
  return {
    report: bundle.report,
    document: bundle.document,
    statusCounts: bundle.report.state === "complete" ? countStatuses(bundle.claims) : null,
  };
}

function visibleReports(scope: ScopeOptions) {
  return reports.filter((r) => scope.includeDemo || !documents.find((d) => d.id === r.documentId)?.isDemo);
}

function claimItems(scope: ScopeOptions): ClaimListItem[] {
  return visibleReports(scope)
    .filter((r) => r.state === "complete")
    .flatMap((r) => {
      const bundle = bundleFor(r.id)!;
      return bundle.claims.map((claim) => ({
        claim,
        report: bundle.report,
        document: bundle.document,
        authorityLabel: claimAuthorityLabel(bundle, claim),
      }));
    });
}

/* ---- simulated jobs ------------------------------------------------ */

/** The seeded in-progress demo job starts at "Searching authorities". */
const SEEDED_PROCESSING_STAGE = STAGES.findIndex((s) => s.key === "search_authorities");

function seededStageLabel(index: number) {
  return `Step ${index + 1} of ${STAGES.length} · ${STAGES[index].label}`;
}

const JOB_STORAGE_KEY = "li-jobs";
const jobs = new Map<string, SimulatedJob>();

function persistJobs() {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(JOB_STORAGE_KEY, JSON.stringify([...jobs.values()]));
  } catch {
    /* storage unavailable: jobs remain in memory for this page */
  }
}

function restoreJobs() {
  if (typeof window === "undefined" || jobs.size > 0) return;
  try {
    const raw = window.sessionStorage.getItem(JOB_STORAGE_KEY);
    for (const job of raw ? (JSON.parse(raw) as SimulatedJob[]) : []) jobs.set(job.id, job);
  } catch {
    /* ignore unreadable storage */
  }
}

/** Demo workspace jobs, created lazily so progress starts when first viewed. */
function seededJob(jobId: string): SimulatedJob | null {
  const now = Date.now();
  if (jobId === PROCESSING_JOB_ID) {
    return {
      id: jobId,
      name: "AI Response — Employee Monitoring (Demo)",
      documentType: "ai_response",
      inputKind: "text",
      checkLegalStatus: true,
      pageCount: null,
      startedAtMs: now - offsetForStage(SEEDED_PROCESSING_STAGE),
      startedAt: "2026-10-03T10:12:00",
    };
  }
  if (jobId === FAILED_JOB_ID) {
    return {
      id: jobId,
      name: "Appeal Brief Excerpt (Demo).pdf",
      documentType: "legal_brief",
      inputKind: "file",
      checkLegalStatus: true,
      pageCount: null,
      startedAtMs: now - offsetForStage(2),
      startedAt: "2026-10-01T11:19:00",
      failAt: {
        stageIndex: 1,
        error: "Text could not be extracted from Appeal Brief Excerpt (Demo).pdf. The file may be a scanned image or password-protected.",
      },
    };
  }
  return null;
}

function findJob(jobId: string): SimulatedJob | null {
  restoreJobs();
  const existing = jobs.get(jobId);
  if (existing) return existing;
  const seeded = seededJob(jobId);
  if (seeded) {
    jobs.set(jobId, seeded);
    persistJobs();
  }
  return seeded;
}

/* ---- API ------------------------------------------------------------ */

export const mockApi: VerificationApi = {
  async getDashboard(scope) {
    await wait();
    const visible = visibleReports(scope);
    return {
      completedReports: visible.filter((r) => r.state === "complete").map((r) => listItem(r.id)),
      recentReports: [...visible]
        .sort((a, b) => (documents.find((d) => d.id === b.documentId)!.uploadedAt > documents.find((d) => d.id === a.documentId)!.uploadedAt ? 1 : -1))
        .map((r) => listItem(r.id)),
      claims: claimItems(scope),
      activity: activity.filter((e) => visible.some((r) => r.id === e.reportId)),
    };
  },

  async getReports(scope) {
    await wait();
    return visibleReports(scope).map((r) => listItem(r.id));
  },

  async getReport(reportId, scope) {
    await wait();
    if (!visibleReports(scope).some((r) => r.id === reportId)) return null;
    return bundleFor(reportId);
  },

  async getClaims(reportId, scope) {
    return (await mockApi.getReport(reportId, scope))?.claims ?? [];
  },

  async getClaim(reportId, claimIndex, scope) {
    return (await mockApi.getReport(reportId, scope))?.claims.find((c) => c.index === claimIndex) ?? null;
  },

  async getCitations(reportId, scope) {
    return (await mockApi.getReport(reportId, scope))?.citations ?? [];
  },

  async getSources(scope) {
    await wait();
    if (!scope.includeDemo) return { items: [], coverage: null };
    const claims = claimItems(scope);
    const citations = Object.values(claimSets).flatMap((s) => s.citations);
    const items = authorities.map((authority) => ({
      authority,
      citedInClaims: new Set(citations.filter((c) => c.authorityId === authority.id && claims.some((ci) => ci.claim.id === c.claimId)).map((c) => c.claimId)).size,
    }));
    const cases = authorities.filter((a) => a.type === "case").length;
    return {
      items,
      coverage: {
        collections: [
          { label: "Case law", detail: `Demo corpus · ${cases} cases`, available: true },
          { label: "Constitutional & statutory provisions", detail: `Demo excerpts · ${authorities.length - cases} provisions`, available: true },
          { label: "Tribunal orders", detail: "Not available", available: false },
        ],
        updatedAt: sourcesAsOf,
      },
    };
  },

  async getSource(authorityId, scope) {
    await wait();
    if (!scope.includeDemo) return null;
    const authority = authorities.find((a) => a.id === authorityId);
    if (!authority) return null;
    const linkedIds = new Set([
      ...authority.related.map((r) => r.authorityId),
      ...authority.treatments.map((t) => t.byAuthorityId),
    ]);
    const citations = Object.values(claimSets).flatMap((s) => s.citations).filter((c) => c.authorityId === authorityId);
    const evidence = Object.values(claimSets).flatMap((s) => s.evidence).filter((e) => e.authorityId === authorityId);
    const citedBy = claimItems(scope).filter(
      (item) => citations.some((c) => c.claimId === item.claim.id) || evidence.some((e) => e.claimId === item.claim.id),
    );
    return { authority, linked: authorities.filter((a) => linkedIds.has(a.id)), citedBy, citations, evidence, sourcesAsOf };
  },

  async getActivity(scope) {
    await wait();
    const visible = visibleReports(scope);
    return activity.filter((e) => visible.some((r) => r.id === e.reportId));
  },

  async getSearchIndex(scope) {
    const entries: SearchEntry[] = [];
    for (const item of visibleReports(scope).map((r) => listItem(r.id))) {
      entries.push({ kind: "report", label: item.document.name, detail: "Report", href: `/reports/${item.report.id}` });
    }
    for (const item of claimItems(scope)) {
      entries.push({
        kind: "claim",
        label: item.claim.text,
        detail: `Claim ${item.claim.index} · ${item.document.name}`,
        href: `/reports/${item.report.id}?claim=${item.claim.index}`,
      });
    }
    if (scope.includeDemo) {
      for (const a of authorities as Authority[]) {
        entries.push({ kind: "authority", label: a.title, detail: a.citation, href: `/sources/${a.id}` });
      }
    }
    return entries;
  },

  uploadDocument(file, onProgress) {
    return new Promise((resolve) => {
      let percent = 0;
      const timer = setInterval(() => {
        percent = Math.min(100, percent + 18);
        onProgress(percent);
        if (percent === 100) {
          clearInterval(timer);
          const format = file.name.toLowerCase().endsWith(".docx") ? "docx" : "pdf";
          resolve({ uploadId: `upl-${Date.now().toString(36)}`, name: file.name, sizeBytes: file.size, format, pageCount: null });
        }
      }, 140);
    });
  },

  async startVerification(input) {
    await wait();
    restoreJobs();
    const id = `job-${Date.now().toString(36)}`;
    jobs.set(id, { ...input, id, startedAtMs: Date.now(), startedAt: nowIso() });
    persistJobs();
    return { jobId: id };
  },

  async getVerification(jobId) {
    const job = findJob(jobId);
    if (!job) return null;
    return computeVerification(job, bundleFor(WRIT_REPORT_ID)!, Date.now());
  },

  async cancelVerification(jobId) {
    await wait();
    const job = findJob(jobId);
    if (job) {
      job.cancelled = true;
      persistJobs();
    }
  },
};
