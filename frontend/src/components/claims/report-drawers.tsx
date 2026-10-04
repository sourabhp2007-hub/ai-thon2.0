"use client";

import { ChevronLeft, ChevronRight, Maximize2, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { CitationDetail } from "@/components/citations/citation-detail";
import { useReport, useReportReady } from "@/components/reports/report-context";
import { DialogClose, Sheet } from "@/components/ui/dialog";
import { OverflowMenu } from "@/components/ui/menu";
import { DemoBadge } from "@/components/ui/primitives";
import { useToast } from "@/components/ui/toast";
import { Tooltip } from "@/components/ui/tooltip";
import { StatusBadge } from "@/components/verification/status";
import { useUrlState } from "@/hooks/use-url-state";
import { SUCCESS } from "@/lib/domain/copy";
import type { Claim } from "@/lib/types/domain";
import { ClaimDetail } from "./claim-detail";

function isTyping(target: EventTarget | null) {
  return target instanceof HTMLElement && Boolean(target.closest("input, textarea, select, [contenteditable=true]"));
}

/** J/K claim navigation (spec keyboard shortcuts). */
export function useClaimKeys(onPrevious: () => void, onNext: () => void, enabled: boolean) {
  useEffect(() => {
    if (!enabled) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || isTyping(e.target)) return;
      if (e.key === "j" || e.key === "J") onNext();
      if (e.key === "k" || e.key === "K") onPrevious();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [enabled, onNext, onPrevious]);
}

export function ClaimNavButtons({ onPrevious, onNext, hasPrevious, hasNext }: { onPrevious: () => void; onNext: () => void; hasPrevious: boolean; hasNext: boolean }) {
  const cls = "inline-flex size-8 items-center justify-center rounded-md border border-border-strong text-ink hover:bg-canvas disabled:opacity-40";
  return (
    <div className="flex gap-1">
      <Tooltip content="Previous claim (K)">
        <button type="button" aria-label="Previous claim, K" onClick={onPrevious} disabled={!hasPrevious} className={cls}>
          <ChevronLeft className="size-4" aria-hidden />
        </button>
      </Tooltip>
      <Tooltip content="Next claim (J)">
        <button type="button" aria-label="Next claim, J" onClick={onNext} disabled={!hasNext} className={cls}>
          <ChevronRight className="size-4" aria-hidden />
        </button>
      </Tooltip>
    </div>
  );
}

function ClaimDrawerHeader({ claim, total, onMove }: { claim: Claim; total: number; onMove: (delta: number) => void }) {
  const bundle = useReport();
  const toast = useToast();
  const router = useRouter();
  const { update } = useUrlState();
  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-border px-5 py-3">
      <p className="text-[15px] font-semibold text-ink">
        Claim {claim.index} of {total}
      </p>
      <StatusBadge status={claim.status} size="sm" />
      {bundle.document.isDemo && <DemoBadge />}
      <div className="ml-auto flex items-center gap-1.5">
        <ClaimNavButtons onPrevious={() => onMove(-1)} onNext={() => onMove(1)} hasPrevious={claim.index > 1} hasNext={claim.index < total} />
        <Tooltip content="Open full page">
          <Link
            href={`/reports/${bundle.report.id}/claims/${claim.index}`}
            aria-label="Open full page"
            className="hidden size-8 items-center justify-center rounded-md border border-border-strong text-ink hover:bg-canvas sm:inline-flex"
          >
            <Maximize2 className="size-4" aria-hidden />
          </Link>
        </Tooltip>
        <OverflowMenu
          label="More claim actions"
          items={[
            {
              label: "Copy link to claim",
              onSelect: () => {
                navigator.clipboard
                  .writeText(`${window.location.origin}/reports/${bundle.report.id}?claim=${claim.index}`)
                  .then(() => toast({ message: SUCCESS.link }))
                  .catch(() => toast({ message: "The link could not be copied.", tone: "error" }));
              },
            },
            { label: "Open full page", onSelect: () => router.push(`/reports/${bundle.report.id}/claims/${claim.index}`) },
            { label: "Export Report", onSelect: () => update({ claim: null, export: "1" }) },
          ]}
        />
        <DialogClose aria-label="Close claim details, Esc" className="inline-flex size-8 items-center justify-center rounded-md text-muted hover:bg-ink/5 hover:text-ink">
          <X className="size-4" aria-hidden />
        </DialogClose>
      </div>
    </div>
  );
}

/** Claim and citation drawers, driven by ?claim= and ?citation=. */
export function ReportDrawers() {
  const bundle = useReport();
  const { searchParams, update } = useUrlState();
  const hydrated = useReportReady();
  const claim = hydrated ? bundle.claims.find((c) => String(c.index) === searchParams.get("claim")) : undefined;
  const citation = hydrated ? bundle.citations.find((c) => String(c.index) === searchParams.get("citation")) : undefined;
  const total = bundle.claims.length;

  const move = (delta: number) => {
    if (!claim) return;
    const next = Math.min(Math.max(claim.index + delta, 1), total);
    if (next !== claim.index) update({ claim: String(next) });
  };
  useClaimKeys(() => move(-1), () => move(1), Boolean(claim));

  return (
    <>
      <Sheet
        open={Boolean(claim)}
        onOpenChange={(o) => !o && update({ claim: null })}
        title={claim ? `Claim ${claim.index} of ${total}` : "Claim details"}
        header={claim && <ClaimDrawerHeader claim={claim} total={total} onMove={move} />}
      >
        {claim && (
          <div className="px-5 py-6">
            <ClaimDetail key={claim.id} bundle={bundle} claim={claim} />
          </div>
        )}
      </Sheet>

      <Sheet
        open={Boolean(citation)}
        onOpenChange={(o) => !o && update({ citation: null })}
        title={citation ? citation.rawText : "Citation details"}
        widthClass="md:max-w-[600px]"
        header={
          citation && (
            <div className="flex items-start gap-3 border-b border-border px-5 py-3">
              <div className="min-w-0 flex-1">
                <p className="font-mono text-[13px] leading-snug font-semibold text-ink">{citation.rawText}</p>
                <p className="mt-0.5 text-[13px] text-muted">
                  Citation {citation.index} of {bundle.citations.length} · Used in Claim {bundle.claims.find((c) => c.id === citation.claimId)?.index}
                </p>
              </div>
              <DialogClose aria-label="Close citation details, Esc" className="inline-flex size-8 items-center justify-center rounded-md text-muted hover:bg-ink/5 hover:text-ink">
                <X className="size-4" aria-hidden />
              </DialogClose>
            </div>
          )
        }
      >
        {citation && (
          <div className="px-5 py-5">
            <CitationDetail bundle={bundle} citation={citation} />
          </div>
        )}
      </Sheet>
    </>
  );
}
