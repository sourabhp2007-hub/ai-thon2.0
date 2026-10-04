"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { ErrorState, Notice } from "@/components/feedback/states";
import { Card, SectionHeader } from "@/components/ui/primitives";
import { Toggle } from "@/components/ui/form";
import { Tooltip } from "@/components/ui/tooltip";
import { StatusIcon } from "@/components/verification/status";
import { useUrlState } from "@/hooks/use-url-state";
import { ERROR } from "@/lib/domain/copy";
import { STATUS_META, STATUS_ORDER } from "@/lib/domain/status";
import { countStatuses } from "@/lib/domain/summary";
import type { Claim, VerificationStatus } from "@/lib/types/domain";
import { cn } from "@/lib/utils/cn";
import { StatusChips } from "./filter-toolbar";
import { useReport } from "./report-context";

/** Underline style per status, so highlights differ by shape as well as colour. */
const UNDERLINE: Record<VerificationStatus, string> = {
  supported: "decoration-supported decoration-solid bg-supported-bg/60",
  partially_supported: "decoration-partial decoration-dashed bg-partial-bg/70",
  unsupported: "decoration-unsupported decoration-wavy bg-unsupported-bg/70",
  unable_to_verify: "decoration-unverified decoration-dotted bg-unverified-bg/80",
};

function Legend() {
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1 text-[13px] text-muted" aria-label="Highlight legend">
      {STATUS_ORDER.map((s) => (
        <li key={s} className="flex items-center gap-1.5">
          <StatusIcon status={s} className="size-3.5" />
          <span className={cn("underline decoration-2 underline-offset-4", UNDERLINE[s])}>{STATUS_META[s].label}</span>
        </li>
      ))}
    </ul>
  );
}

/** Document View: extracted text with claims highlighted where they appear. */
export function DocumentView() {
  const bundle = useReport();
  const { searchParams, update } = useUrlState();
  const pages = bundle.document.pages ?? [];
  const pageCount = pages.length;
  const focus = Number(searchParams.get("focus")) || null;
  const page = Math.min(Math.max(Number(searchParams.get("page")) || 1, 1), Math.max(pageCount, 1));
  const [showHighlights, setShowHighlights] = useState(true);
  const [statuses, setStatuses] = useState<VerificationStatus[]>([]);

  const counts = useMemo(() => countStatuses(bundle.claims), [bundle.claims]);

  useEffect(() => {
    if (!focus) return;
    document.getElementById(`doc-claim-${focus}`)?.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [focus, page]);

  if (pageCount === 0) {
    return (
      <Card>
        <ErrorState body={ERROR.doc} />
      </Card>
    );
  }

  const current = pages[page - 1];
  const claimsOnPage = bundle.claims.filter((c) => c.location.page === page);

  const renderParagraph = (text: string, paragraphIndex: number): ReactNode => {
    const claims = claimsOnPage.filter((c) => c.location.paragraph === paragraphIndex + 1);
    if (!showHighlights || claims.length === 0) return text;
    const parts: ReactNode[] = [];
    let rest = text;
    let key = 0;
    for (const claim of claims) {
      const at = rest.indexOf(claim.text);
      if (at < 0) continue;
      parts.push(rest.slice(0, at));
      parts.push(<ClaimHighlight key={key++} claim={claim} dimmed={statuses.length > 0 && !statuses.includes(claim.status)} focused={focus === claim.index} onOpen={() => update({ claim: String(claim.index) }, { push: true })} />);
      rest = rest.slice(at + claim.text.length);
    }
    parts.push(rest);
    return parts;
  };

  const goTo = (p: number) => update({ page: String(p), focus: null });

  return (
    <section aria-labelledby="document-heading">
      <SectionHeader id="document-heading" title="Document" subtitle="Claims are highlighted where they appear in the document text. Select a highlight to see its verification." />
      <Notice className="mb-4">Showing extracted text. Layout may differ from the original file.</Notice>

      <div className="mb-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="w-52">
            <Toggle id="show-highlights" label="Show highlights" checked={showHighlights} onChange={setShowHighlights} />
          </div>
          <Legend />
        </div>
        <StatusChips counts={counts} total={bundle.claims.length} selected={statuses} onChange={setStatuses} />
      </div>

      <Card className="mx-auto max-w-3xl">
        <div className="flex items-center justify-between border-b border-border px-5 py-2.5">
          <button
            type="button"
            onClick={() => goTo(page - 1)}
            disabled={page <= 1}
            aria-label="Previous page"
            className="inline-flex size-8 items-center justify-center rounded-md text-ink hover:bg-canvas disabled:opacity-30"
          >
            <ChevronLeft className="size-4" aria-hidden />
          </button>
          <p className="text-[13px] text-muted" aria-live="polite">
            Page {page} of {pageCount}
          </p>
          <button
            type="button"
            onClick={() => goTo(page + 1)}
            disabled={page >= pageCount}
            aria-label="Next page"
            className="inline-flex size-8 items-center justify-center rounded-md text-ink hover:bg-canvas disabled:opacity-30"
          >
            <ChevronRight className="size-4" aria-hidden />
          </button>
        </div>
        <article className="space-y-4 px-6 py-8 md:px-12 md:py-10" aria-label={`Page ${page} of ${pageCount}`}>
          {current.paragraphs.map((text, i) => {
            return text.startsWith("## ") ? (
              <h3 key={i} className="pt-2 font-serif text-[17px] font-semibold text-ink">
                {text.slice(3)}
              </h3>
            ) : (
              <p key={i} className="font-serif text-[16px] leading-[1.9] text-ink/90">
                {renderParagraph(text, i)}
              </p>
            );
          })}
        </article>
        {claimsOnPage.length > 0 && (
          <p className="border-t border-border px-5 py-2.5 text-[13px] text-muted">
            Claims on this page: {claimsOnPage.map((c) => c.index).join(", ")}
          </p>
        )}
      </Card>
    </section>
  );
}

function ClaimHighlight({ claim, dimmed, focused, onOpen }: { claim: Claim; dimmed: boolean; focused: boolean; onOpen: () => void }) {
  const meta = STATUS_META[claim.status];
  return (
    <Tooltip content={`Claim ${claim.index} · ${meta.label} · Select to view verification`}>
      <button
        id={`doc-claim-${claim.index}`}
        type="button"
        onClick={onOpen}
        aria-label={`Claim ${claim.index}, ${meta.label}: ${claim.text}`}
        className={cn(
          "scroll-mt-28 rounded-sm px-0.5 text-left underline decoration-2 underline-offset-[5px] transition-opacity hover:brightness-95",
          UNDERLINE[claim.status],
          dimmed && "bg-transparent no-underline opacity-60",
          focused && "ring-2 ring-primary ring-offset-2",
        )}
      >
        {claim.text}
        <sup className="ml-0.5 inline-flex items-center gap-0.5 font-sans text-[11px] font-semibold text-ink/70 no-underline">
          [{claim.index}]
          <StatusIcon status={claim.status} className="size-3" />
        </sup>
      </button>
    </Tooltip>
  );
}
