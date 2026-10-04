import { PIPELINE_STAGES } from "@/lib/domain/pipeline";
import { casesWithLaterTreatment } from "@/lib/domain/report";
import { summarizeClaims } from "@/lib/domain/summary";
import type {
  DiscoveredClaim,
  ProcessingStage,
  ReportBundle,
  StageKey,
  StartVerificationInput,
  Verification,
} from "@/lib/types/domain";

/**
 * Simulated verification pipeline. Progress is a pure function of elapsed
 * time, so polling behaves like a real job without a server. Simulated jobs
 * always resolve to the demo report (spec D-23).
 */

/** Simulated duration of each stage, in milliseconds. */
const DURATION_MS: Record<StageKey, number> = {
  uploaded: 600,
  extract_text: 1400,
  identify_claims: 2200,
  extract_citations: 1400,
  search_authorities: 1800,
  verify_evidence: 3200,
  check_legal_status: 1400,
  generate_report: 1000,
};

export const STAGES = PIPELINE_STAGES.map((s) => ({ ...s, durationMs: DURATION_MS[s.key] }));

export interface SimulatedJob extends StartVerificationInput {
  id: string;
  startedAtMs: number;
  /** ISO-like local time for display. */
  startedAt: string;
  cancelled?: boolean;
  /** Fixed failure at a stage index, for the failed demo job. */
  failAt?: { stageIndex: number; error: string };
}

function stageResult(key: StageKey, job: SimulatedJob, demo: ReportBundle): string {
  const summary = summarizeClaims(demo.claims);
  const located = demo.citations.filter((c) => c.resolution === "located").length;
  switch (key) {
    case "uploaded":
      return job.pageCount ? `${job.name} · ${job.pageCount} pages` : job.name;
    case "extract_text":
      return `Text extracted from ${demo.document.pageCount} pages`;
    case "identify_claims":
      return `${summary.total} claims identified`;
    case "extract_citations":
      return `${demo.citations.length} citations extracted`;
    case "search_authorities":
      return `${located} of ${demo.citations.length} citations located`;
    case "verify_evidence":
      return `${summary.assessed} of ${summary.total} claims assessed`;
    case "check_legal_status":
      return `Later treatment found for ${casesWithLaterTreatment(demo)} cases`;
    case "generate_report":
      return "Report ready";
  }
}

export function computeVerification(job: SimulatedJob, demo: ReportBundle, nowMs: number): Verification {
  const elapsed = Math.max(0, nowMs - job.startedAtMs);
  let cursor = 0;
  let currentStageIndex = STAGES.length;
  let stageProgress = 1;

  for (let i = 0; i < STAGES.length; i++) {
    const duration = STAGES[i].key === "check_legal_status" && !job.checkLegalStatus ? 0 : STAGES[i].durationMs;
    if (elapsed < cursor + duration) {
      currentStageIndex = i;
      stageProgress = (elapsed - cursor) / duration;
      break;
    }
    cursor += duration;
  }

  const failed = job.failAt && currentStageIndex >= job.failAt.stageIndex;
  if (failed) currentStageIndex = job.failAt!.stageIndex;
  const complete = !failed && currentStageIndex >= STAGES.length;

  const stages: ProcessingStage[] = STAGES.map((def, i) => {
    const base = { key: def.key, label: def.label, activeDescription: def.activeDescription };
    if (def.key === "check_legal_status" && !job.checkLegalStatus && (i < currentStageIndex || complete)) {
      return { ...base, state: "skipped" };
    }
    if (failed && i === currentStageIndex) return { ...base, state: "failed", error: job.failAt!.error };
    if (i < currentStageIndex || complete) return { ...base, state: "done", result: stageResult(def.key, job, demo) };
    if (i === currentStageIndex && !job.cancelled) return { ...base, state: "active" };
    return { ...base, state: "waiting" };
  });

  const discoveredClaims = failed ? [] : discover(demo, currentStageIndex, stageProgress, complete);

  return {
    id: job.id,
    documentName: job.name,
    documentType: job.documentType,
    inputKind: job.inputKind,
    pageCount: job.pageCount ?? null,
    state: job.cancelled ? "cancelled" : failed ? "failed" : complete ? "complete" : "processing",
    stages,
    currentStageIndex: Math.min(currentStageIndex, STAGES.length - 1),
    startedAt: job.startedAt,
    completedAt: complete ? job.startedAt : undefined,
    reportId: complete ? demo.report.id : undefined,
    error: failed ? job.failAt!.error : undefined,
    discoveredClaims,
    isSimulated: true,
  };
}

const IDENTIFY = STAGES.findIndex((s) => s.key === "identify_claims");
const VERIFY = STAGES.findIndex((s) => s.key === "verify_evidence");

function discover(demo: ReportBundle, stageIndex: number, progress: number, complete: boolean): DiscoveredClaim[] {
  const total = demo.claims.length;
  let visible = 0;
  if (complete || stageIndex > IDENTIFY) visible = total;
  else if (stageIndex === IDENTIFY) visible = Math.floor(progress * total);

  let assessed = 0;
  if (complete || stageIndex > VERIFY) assessed = total;
  else if (stageIndex === VERIFY) assessed = Math.floor(progress * total);

  return demo.claims.slice(0, visible).map((c, i) => ({
    index: c.index,
    page: c.location.page,
    text: c.text,
    status: i < assessed ? c.status : null,
    phase: i < assessed ? "assessed" : stageIndex === VERIFY && i === assessed ? "verifying" : "awaiting",
  }));
}

/** Elapsed time that places a job at the start of a given stage. */
export function offsetForStage(stageIndex: number): number {
  return STAGES.slice(0, stageIndex).reduce((n, s) => n + s.durationMs, 0);
}
