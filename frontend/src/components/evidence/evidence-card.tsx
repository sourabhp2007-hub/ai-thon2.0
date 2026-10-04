"use client";

import { Copy, ExternalLink } from "lucide-react";
import { useState } from "react";
import { ButtonLink, Button } from "@/components/ui/button";
import { DemoBadge } from "@/components/ui/primitives";
import { useToast } from "@/components/ui/toast";
import { Tooltip } from "@/components/ui/tooltip";
import { SUCCESS } from "@/lib/domain/copy";
import { RELATIONSHIP_META } from "@/lib/domain/labels";
import { findParagraph, sourceHref } from "@/lib/domain/report";
import type { Authority, Evidence, EvidenceRelationship } from "@/lib/types/domain";
import { cn } from "@/lib/utils/cn";

export const RELATIONSHIP_STYLE: Record<EvidenceRelationship, { chip: string; rail: string }> = {
  supports: { chip: "bg-supported-bg text-supported border-supported/25", rail: "border-supported" },
  partially_supports: { chip: "bg-partial-bg text-partial border-partial/25", rail: "border-partial" },
  contradicts: { chip: "bg-unsupported-bg text-unsupported border-unsupported/25", rail: "border-unsupported" },
  context: { chip: "bg-unverified-bg text-unverified border-unverified/25", rail: "border-unverified" },
  supports_overruled: { chip: "bg-unverified-bg text-unverified border-unverified/25 line-through decoration-1", rail: "border-unverified border-dashed" },
};

export function RelationshipChip({ relationship }: { relationship: EvidenceRelationship }) {
  return (
    <span className={cn("inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium", RELATIONSHIP_STYLE[relationship].chip)}>
      {RELATIONSHIP_META[relationship].chip}
    </span>
  );
}

/** Paragraph text with the evidence span emphasised. */
export function HighlightedText({ text, highlight, className }: { text: string; highlight?: string; className?: string }) {
  const at = highlight ? text.indexOf(highlight) : -1;
  if (!highlight || at < 0) return <span className={className}>{text}</span>;
  return (
    <span className={className}>
      {text.slice(0, at)}
      <mark className="rounded-sm bg-highlight px-0.5 font-semibold text-highlight-text">{highlight}</mark>
      {text.slice(at + highlight.length)}
    </span>
  );
}

function sourceLine(authority: Authority) {
  return authority.type === "case" ? [authority.title, authority.citation, authority.court].filter(Boolean).join(" · ") : authority.title;
}

/**
 * Evidence View (spec §6.4). Source text is serif and labelled "Source text";
 * the system relevance note is sans and labelled "System note".
 */
export function EvidenceCard({
  evidence,
  authority,
  position,
  total,
  reportId,
  claimIndex,
}: {
  evidence: Evidence;
  authority: Authority;
  position: number;
  total: number;
  reportId: string;
  claimIndex: number;
}) {
  const toast = useToast();
  const [showContext, setShowContext] = useState(false);
  const paragraph = findParagraph(authority, evidence.paragraphId);
  const index = authority.paragraphs.findIndex((p) => p.id === evidence.paragraphId);
  const previous = index > 0 ? authority.paragraphs[index - 1] : undefined;
  const next = index >= 0 ? authority.paragraphs[index + 1] : undefined;
  const paragraphHeading = paragraph?.label.startsWith("¶") ? `Paragraph ${evidence.paragraphId}` : paragraph?.label;

  const copyExcerpt = async () => {
    const citation = authority.type === "case" ? `${authority.title}, ${authority.citation}, ${paragraph?.label}` : authority.title;
    try {
      await navigator.clipboard.writeText(`“${evidence.highlight}” — ${citation}`);
      toast({ message: SUCCESS.excerpt });
    } catch {
      toast({ message: "The excerpt could not be copied.", tone: "error" });
    }
  };

  return (
    <article id={`evidence-${evidence.id}`} className="scroll-mt-24 rounded-card border border-border bg-surface">
      <header className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-2.5">
        <p className="text-[13px] font-semibold text-ink">
          Evidence {position} of {total}
        </p>
        <RelationshipChip relationship={evidence.relationship} />
      </header>
      <div className="px-4 py-3">
        <p className="text-[13px] text-muted">{sourceLine(authority)}</p>
        <div className="mt-1 flex flex-wrap items-center gap-2">
          <p className="text-[13px] font-medium text-ink">{paragraphHeading}</p>
          {authority.isDemo && <DemoBadge />}
          {authority.textNature === "illustrative_summary" && <span className="text-xs text-muted">Illustrative summary — not the official text</span>}
        </div>

        <figure className={cn("mt-3 border-l-[3px] pl-4", RELATIONSHIP_STYLE[evidence.relationship].rail)}>
          <figcaption className="eyebrow mb-1.5">Source text</figcaption>
          {showContext && previous && (
            <p className="source-text mb-2 text-ink/60">
              <span className="mr-1.5 font-mono text-xs">{previous.label}</span>
              {previous.text}
            </p>
          )}
          <blockquote className="source-text">
            <HighlightedText text={paragraph?.text ?? ""} highlight={evidence.highlight} />
          </blockquote>
          {showContext && next && (
            <p className="source-text mt-2 text-ink/60">
              <span className="mr-1.5 font-mono text-xs">{next.label}</span>
              {next.text}
            </p>
          )}
          <p className="mt-2 text-xs text-muted">Highlighted: passage relevant to the claim</p>
        </figure>

        <div className="mt-3 rounded-md bg-canvas px-3 py-2">
          <p className="eyebrow">System note</p>
          <p className="mt-0.5 text-[13px] text-ink/80">{evidence.note}</p>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <ButtonLink href={sourceHref(authority.id, { paragraphId: evidence.paragraphId, reportId, claimIndex })} variant="secondary" size="sm">
            View Source
          </ButtonLink>
          {authority.sourceUrl ? (
            <ButtonLink href={authority.sourceUrl} target="_blank" rel="noreferrer" variant="ghost" size="sm" icon={<ExternalLink className="size-3.5" aria-hidden />}>
              Open Judgment
            </ButtonLink>
          ) : (
            <Tooltip content={authority.isDemo ? "The original judgment is not available for demo data." : "The original judgment is not available."}>
              <span tabIndex={0}>
                <Button variant="ghost" size="sm" disabled icon={<ExternalLink className="size-3.5" aria-hidden />}>
                  Open Judgment
                </Button>
              </span>
            </Tooltip>
          )}
          <Button variant="ghost" size="sm" onClick={copyExcerpt} icon={<Copy className="size-3.5" aria-hidden />}>
            Copy excerpt
          </Button>
          {(previous || next) && (
            <Button variant="link" size="sm" onClick={() => setShowContext((s) => !s)} aria-expanded={showContext}>
              {showContext ? "Hide surrounding paragraphs" : "Show surrounding paragraphs"}
            </Button>
          )}
        </div>
      </div>
    </article>
  );
}

/** "As quoted in document" vs "Text in source", differences highlighted. */
export function QuoteComparison({ asQuoted, inSource, quotedDiff, sourceDiff }: { asQuoted: string; inSource: string; quotedDiff: string; sourceDiff: string }) {
  const mark = (text: string, word: string, tone: string) => {
    const at = text.indexOf(word);
    if (at < 0) return text;
    return (
      <>
        {text.slice(0, at)}
        <mark className={cn("rounded-sm px-0.5 font-semibold", tone)}>{word}</mark>
        {text.slice(at + word.length)}
      </>
    );
  };
  return (
    <div className="rounded-card border border-partial/30 bg-partial-bg/40 p-4">
      <p className="text-[13px] font-semibold text-ink">Quote comparison</p>
      <dl className="mt-3 grid gap-3 sm:grid-cols-2">
        <div>
          <dt className="eyebrow">As quoted in document</dt>
          <dd className="source-text mt-1 text-[15px]">…{mark(asQuoted, quotedDiff, "bg-unsupported-bg text-unsupported")}…</dd>
        </div>
        <div>
          <dt className="eyebrow">Text in source</dt>
          <dd className="source-text mt-1 text-[15px]">…{mark(inSource, sourceDiff, "bg-supported-bg text-supported")}…</dd>
        </div>
      </dl>
      <p className="mt-3 text-xs text-muted">Differences are highlighted.</p>
      <p className="mt-1 flex items-center gap-1 text-[13px] font-medium text-partial">
        <span aria-hidden>⚠</span> Quote mismatch: the quoted words do not appear in the source.
      </p>
    </div>
  );
}
