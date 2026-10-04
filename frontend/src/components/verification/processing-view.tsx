"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Check, Minus, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { EmptyState, ErrorState, LoadingState, Notice } from "@/components/feedback/states";
import { Breadcrumbs, PageContainer } from "@/components/layout/page";
import { RetryVerificationButton } from "@/components/reports/report-actions";
import { Button, ButtonLink } from "@/components/ui/button";
import { Modal } from "@/components/ui/dialog";
import { Card } from "@/components/ui/primitives";
import { useToast } from "@/components/ui/toast";
import { Tooltip } from "@/components/ui/tooltip";
import { DN_PROCESSING, EMPTY, ERROR, SUCCESS } from "@/lib/domain/copy";
import { DOCUMENT_TYPE_LABEL, FORMAT_LABEL, STAGE_STATE_LABEL } from "@/lib/domain/labels";
import { STATUS_META, STATUS_ORDER } from "@/lib/domain/status";
import { summarizeClaims } from "@/lib/domain/summary";
import { cancelVerification, getVerification } from "@/lib/services";
import type { ProcessingStage, Verification } from "@/lib/types/domain";
import { cn } from "@/lib/utils/cn";
import { watchJobInBackground } from "./background-jobs";
import { StatusBadge, StatusIcon } from "./status";

const POLL_MS = 400;

function StageIcon({ stage }: { stage: ProcessingStage }) {
  const base = "flex size-7 shrink-0 items-center justify-center rounded-full border-2";
  switch (stage.state) {
    case "done":
      return (
        <span className={cn(base, "border-supported bg-supported text-black")}>
          <Check className="size-4" strokeWidth={3} aria-hidden />
        </span>
      );
    case "active":
      return (
        <span className={cn(base, "border-primary bg-primary-soft")}>
          <span className="size-2.5 rounded-full bg-primary motion-safe:animate-pulse-dot" />
        </span>
      );
    case "failed":
      return (
        <span className={cn(base, "border-unsupported bg-unsupported text-black")}>
          <X className="size-4" strokeWidth={3} aria-hidden />
        </span>
      );
    case "skipped":
      return (
        <span className={cn(base, "border-border-strong bg-canvas text-muted")}>
          <Minus className="size-4" aria-hidden />
        </span>
      );
    default:
      return <span className={cn(base, "border-border-strong bg-surface")} />;
  }
}

function Pipeline({ job }: { job: Verification }) {
  return (
    <ol aria-label="Verification pipeline">
      {job.stages.map((stage, i) => (
        <li key={stage.key} className="relative flex gap-4 pb-5 last:pb-0" aria-current={stage.state === "active" ? "step" : undefined}>
          {i < job.stages.length - 1 && (
            <span aria-hidden className={cn("absolute top-8 bottom-1 left-[13px] w-0.5", stage.state === "done" ? "bg-supported/50" : "bg-border")} />
          )}
          <StageIcon stage={stage} />
          <div className="min-w-0 pt-0.5">
            <p className={cn("text-sm font-medium", stage.state === "waiting" ? "text-muted" : "text-ink")}>
              {stage.label}
              <span className="sr-only"> — {STAGE_STATE_LABEL[stage.state]}</span>
            </p>
            <p className={cn("mt-0.5 text-[13px]", stage.state === "failed" ? "text-unsupported" : "text-muted")}>
              {stage.state === "done" && stage.result}
              {stage.state === "active" && stage.activeDescription}
              {stage.state === "waiting" && "Waiting"}
              {stage.state === "failed" && `This step could not be completed. ${stage.error ?? ""}`}
              {stage.state === "skipped" && "Legal status check turned off for this verification."}
            </p>
          </div>
        </li>
      ))}
    </ol>
  );
}

function DiscoveryFeed({ job }: { job: Verification }) {
  const reduce = useReducedMotion();
  return (
    <Card className="flex max-h-[640px] flex-col">
      <div className="border-b border-border px-4 py-3">
        <h2 className="text-[15px] font-semibold text-ink">Claims identified</h2>
        <p className="text-[13px] text-muted">Claims appear as they are found. Statuses are assigned after evidence is verified.</p>
      </div>
      {job.discoveredClaims.length === 0 ? (
        <EmptyState compact body={EMPTY.feed} />
      ) : (
        <ul className="flex-1 divide-y divide-border overflow-y-auto" aria-live="polite" aria-relevant="additions">
          <AnimatePresence initial={false}>
            {job.discoveredClaims.map((c) => (
              <motion.li
                key={c.index}
                initial={reduce ? false : { opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
                className="px-4 py-3"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-muted">
                    Claim {c.index} · Page {c.page}
                  </span>
                  {c.status ? (
                    <StatusBadge status={c.status} size="sm" withTooltip={false} />
                  ) : (
                    <span className={cn("rounded-full border px-2 py-0.5 text-xs", c.phase === "verifying" ? "border-primary/30 bg-primary-soft text-primary" : "border-border bg-canvas text-muted")}>
                      {c.phase === "verifying" ? "Verifying…" : "Awaiting verification"}
                    </span>
                  )}
                </div>
                <p className="mt-1 line-clamp-2 text-[13px] text-ink/85">{c.text}</p>
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>
      )}
    </Card>
  );
}

/** Processing (spec §3.4): live pipeline for one verification job. */
export function ProcessingView({ jobId }: { jobId: string }) {
  const router = useRouter();
  const toast = useToast();
  const [job, setJob] = useState<Verification | null | undefined>(undefined);
  const [loadError, setLoadError] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);

  useEffect(() => {
    let active = true;
    let timer: number | undefined;
    const poll = async () => {
      try {
        const next = await getVerification(jobId);
        if (!active) return;
        setJob(next);
        setLoadError(false);
        if (next && (next.state === "processing" || next.state === "queued")) timer = window.setTimeout(poll, POLL_MS);
      } catch {
        if (active) setLoadError(true);
      }
    };
    void poll();
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [jobId]);

  if (loadError) {
    return (
      <PageContainer>
        <ErrorState
          body={ERROR.load}
          action={
            <Button variant="secondary" onClick={() => window.location.reload()}>
              Try again
            </Button>
          }
        />
      </PageContainer>
    );
  }
  if (job === undefined) {
    return (
      <PageContainer>
        <LoadingState label="Loading verification…" rows={6} />
      </PageContainer>
    );
  }
  if (job === null) {
    return (
      <PageContainer>
        <ErrorState title="Verification not found" body="This verification may have expired or been removed." action={<ButtonLink href="/reports" variant="secondary">View all reports</ButtonLink>} />
      </PageContainer>
    );
  }

  const current = job.stages[job.currentStageIndex];
  const running = job.state === "processing" || job.state === "queued";
  const summary = job.state === "complete" ? summarizeClaims(job.discoveredClaims.map((c) => ({ status: c.status! }))) : null;

  const cancel = async () => {
    await cancelVerification(job.id);
    setConfirmCancel(false);
    toast({ message: SUCCESS.cancelled });
    router.push("/reports");
  };

  return (
    <PageContainer>
      <Breadcrumbs items={[{ label: "Reports", href: "/reports" }, { label: job.documentName }, { label: "Verifying" }]} />
      <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-[24px] font-semibold tracking-tight text-ink md:text-[28px]">Verifying document</h1>
          <p className="mt-1.5 text-[15px] text-muted">
            {job.documentName} · {DOCUMENT_TYPE_LABEL[job.documentType]}
            {job.pageCount ? ` · ${job.pageCount} pages` : job.inputKind === "text" ? ` · ${FORMAT_LABEL.text}` : ""}
          </p>
        </div>
        {running && (
          <div className="flex flex-wrap gap-2">
            <Tooltip content="Verification keeps running. You’ll be notified when the report is ready.">
              <Button
                variant="secondary"
                onClick={() => {
                  watchJobInBackground(job.id);
                  router.push("/dashboard");
                }}
              >
                Continue in background
              </Button>
            </Tooltip>
            <Button variant="ghost" onClick={() => setConfirmCancel(true)}>
              Cancel verification
            </Button>
          </div>
        )}
      </header>

      {job.isSimulated && <Notice tone="accent" className="mb-6" title="Demo mode">{DN_PROCESSING}</Notice>}

      {running && (
        <div className="mb-6">
          <p className="mb-2 text-sm font-medium text-ink">
            Step {job.currentStageIndex + 1} of {job.stages.length} · {current.label}
          </p>
          <div
            role="progressbar"
            aria-label={`Verification progress: step ${job.currentStageIndex + 1} of ${job.stages.length}`}
            aria-valuemin={0}
            aria-valuemax={job.stages.length}
            aria-valuenow={job.currentStageIndex + 1}
            className="h-1.5 overflow-hidden rounded-full bg-border"
          >
            <div className="h-full rounded-full bg-primary transition-[width] duration-500" style={{ width: `${((job.currentStageIndex + 0.5) / job.stages.length) * 100}%` }} />
          </div>
        </div>
      )}

      {job.state === "complete" && summary && (
        <Card className="mb-6 border-supported/30 p-6">
          <h2 className="text-[19px] font-semibold text-ink">Verification complete</h2>
          <p className="mt-1 text-sm text-muted">
            {summary.total} claims identified. {summary.assessed} of {summary.total} could be assessed against available sources ({summary.coverage}% Verification Coverage).
          </p>
          <ul className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm">
            {STATUS_ORDER.map((s) => (
              <li key={s} className="flex items-center gap-1.5">
                <StatusIcon status={s} />
                {STATUS_META[s].label} <span className="font-semibold tabular-nums">{summary.counts[s]}</span>
              </li>
            ))}
          </ul>
          <ButtonLink href={`/reports/${job.reportId}`} className="mt-5">
            Open Report
          </ButtonLink>
        </Card>
      )}

      {job.state === "failed" && (
        <Card className="mb-6 border-unsupported/30">
          <ErrorState
            title="Verification could not be completed"
            body={job.error ?? "Verification stopped unexpectedly."}
            action={
              <>
                <RetryVerificationButton name={job.documentName} documentType={job.documentType} inputKind={job.inputKind} variant="primary" size="md" />
                <ButtonLink href="/verify/new" variant="secondary">
                  Try another file
                </ButtonLink>
              </>
            }
          />
        </Card>
      )}

      {job.state === "cancelled" && (
        <Card className="mb-6">
          <EmptyState title="Verification cancelled" body="This verification was cancelled before it completed." action={<ButtonLink href="/verify/new">New Verification</ButtonLink>} />
        </Card>
      )}

      {(running || job.state === "failed") && (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <Card className="p-5 md:p-6">
            <h2 className="mb-5 text-[15px] font-semibold text-ink">Verification pipeline</h2>
            <Pipeline job={job} />
          </Card>
          {running && <DiscoveryFeed job={job} />}
        </div>
      )}

      <Modal
        open={confirmCancel}
        onOpenChange={setConfirmCancel}
        title="Cancel this verification?"
        description="Progress so far will be discarded. The document will be listed in Reports as Cancelled."
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirmCancel(false)}>
              Keep verifying
            </Button>
            <Button variant="destructive" onClick={cancel}>
              Cancel verification
            </Button>
          </>
        }
      />
    </PageContainer>
  );
}
