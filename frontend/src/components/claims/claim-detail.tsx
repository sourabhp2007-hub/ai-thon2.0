"use client";

import { Ban, CircleHelp, SearchX } from "lucide-react";
import Link from "next/link";
import { useMemo, type ReactNode } from "react";
import { CitationCard, CitationChecklist, LegalStatusPanel } from "@/components/citations/citation-parts";
import { EvidenceCard, QuoteComparison } from "@/components/evidence/evidence-card";
import { EmptyState, Notice } from "@/components/feedback/states";
import { EvidenceChainTree, EvidenceGraphCanvas } from "@/components/graph/graph-panels";
import { ButtonLink } from "@/components/ui/button";
import { Badge } from "@/components/ui/primitives";
import { StatusBadge } from "@/components/verification/status";
import { useMediaQuery } from "@/hooks/use-media-query";
import { EMPTY, RU_STATUS } from "@/lib/domain/copy";
import { formatDate } from "@/lib/domain/format";
import { buildClaimGraph } from "@/lib/domain/graph";
import { UNABLE_REASON_LABEL } from "@/lib/domain/labels";
import { claimCitations, claimEvidence, claimRelated, findAuthority, findParagraph, sourceHref } from "@/lib/domain/report";
import { STATUS_META } from "@/lib/domain/status";
import type { Authority, Claim, ReportBundle } from "@/lib/types/domain";
import { cn } from "@/lib/utils/cn";

function ChainStep({ step, label, question, children, last }: { step: number; label: string; question: string; children: ReactNode; last?: boolean }) {
  return (
    <section aria-labelledby={`step-${step}`} className="relative grid grid-cols-[28px_minmax(0,1fr)] gap-x-4">
      <div className="flex flex-col items-center">
        <span className="flex size-7 items-center justify-center rounded-full bg-white text-xs font-semibold text-black" aria-hidden>
          {step}
        </span>
        {!last && <span className="mt-1 w-px flex-1 bg-border" aria-hidden />}
      </div>
      <div className={cn("min-w-0", !last && "pb-8")}>
        <h3 id={`step-${step}`} className="flex flex-wrap items-baseline gap-x-2 pt-1">
          <span className="text-xs font-bold tracking-[0.12em] text-ink uppercase">{label}</span>
          <span className="text-[13px] text-muted">{question}</span>
        </h3>
        <div className="mt-3">{children}</div>
      </div>
    </section>
  );
}

function SecondaryPanel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <details open className="group rounded-card border border-border bg-surface [&_summary::-webkit-details-marker]:hidden">
      <summary className="flex cursor-pointer items-center justify-between px-4 py-3 text-sm font-semibold text-ink">
        {title}
        <span className="text-xs font-normal text-muted group-open:hidden">Show</span>
        <span className="hidden text-xs font-normal text-muted group-open:inline">Hide</span>
      </summary>
      <div className="border-t border-border px-4 py-3">{children}</div>
    </details>
  );
}

function AuthorityLink({ authority, note, href, className }: { authority: Authority; note: string; href: string; className?: string }) {
  return (
    <li className={cn("flex flex-wrap items-start justify-between gap-2 py-2.5", className)}>
      <div className="min-w-0">
        <p className="font-serif text-[15px] font-semibold text-ink">{authority.title}</p>
        <p className="text-[13px] text-muted">
          {authority.type === "case" ? `${authority.citation} · ` : ""}
          {note}
        </p>
      </div>
      <ButtonLink href={href} variant="secondary" size="sm">
        View Source
      </ButtonLink>
    </li>
  );
}

/**
 * Claim Detail (spec §6). The fixed order Claim → Authority → Evidence →
 * Reason → Status answers: what was claimed, what was cited, what the source
 * says, and why the status was assigned.
 */
export function ClaimDetail({ bundle, claim }: { bundle: ReportBundle; claim: Claim }) {
  const reportId = bundle.report.id;
  const citations = claimCitations(bundle, claim);
  const evidence = claimEvidence(bundle, claim);
  const related = claimRelated(bundle, claim);
  const meta = STATUS_META[claim.status];
  const isDesktop = useMediaQuery("(min-width: 768px)");
  const graph = useMemo(() => buildClaimGraph(bundle, claim), [bundle, claim]);
  const casesCited = citations.map((c) => findAuthority(bundle, c.authorityId)).filter((a): a is Authority => Boolean(a));
  const asOf = bundle.report.sourcesAsOf ? formatDate(bundle.report.sourcesAsOf) : "";
  const authorityCount = new Set(evidence.map((e) => e.authorityId)).size;

  return (
    <div className="space-y-8">
      <div>
        <ChainStep step={1} label="Claim" question="What the document states">
          <blockquote className="rounded-card border-l-[3px] border-ink bg-canvas px-4 py-3 text-[15px] leading-relaxed text-ink">{claim.text}</blockquote>
          <p className="mt-2 flex flex-wrap items-center gap-x-3 text-[13px] text-muted">
            <span>
              Page {claim.location.page} · Paragraph {claim.location.paragraph}
            </span>
            <Link href={`/reports/${reportId}/document?page=${claim.location.page}&focus=${claim.index}`} className="font-medium text-primary hover:underline">
              View in document
            </Link>
          </p>
        </ChainStep>

        <ChainStep step={2} label="Authority" question="What the document cites">
          {citations.length === 0 ? (
            <Notice title="No authority cited" icon={<CircleHelp className="size-4 text-unverified" />}>
              The document does not cite an authority for this claim. No sufficiently relevant authority was found in available sources.
            </Notice>
          ) : (
            <div className="space-y-5">
              {citations.map((citation) => {
                const authority = findAuthority(bundle, citation.authorityId);
                return (
                  <div key={citation.id} className="space-y-3">
                    {citations.length > 1 && <p className="eyebrow">Citation {citation.index}</p>}
                    <p className="text-[13px] text-muted">
                      As written: <span className="font-mono text-[12.5px] text-ink/85">{citation.rawText}</span>
                    </p>
                    {authority && <CitationCard authority={authority} citation={citation} />}
                    {citation.resolution === "not_found" && (
                      <Notice tone="danger" title="Citation could not be located" icon={<SearchX className="size-4 text-unsupported" />}>
                        No case matching “{citation.parsed.caseName}” or the reference “{citation.parsed.reference}” was found in available sources. The
                        citation may be incorrect, incomplete, or outside the sources available to the platform. Confirm it independently before relying on it.
                      </Notice>
                    )}
                    {citation.resolution === "source_not_available" && (
                      <Notice title="Source not available" icon={<Ban className="size-4 text-unverified" />}>
                        Tribunal orders are not among the sources available to the platform. This citation could not be checked.
                      </Notice>
                    )}
                    <div>
                      <p className="mb-1 text-[13px] font-semibold text-ink">Citation integrity</p>
                      <CitationChecklist checks={citation.checks} />
                    </div>
                    <Link href={`/reports/${reportId}/citations?citation=${citation.index}`} className="inline-block text-[13px] font-medium text-primary hover:underline">
                      View citation details
                    </Link>
                  </div>
                );
              })}
            </div>
          )}
        </ChainStep>

        <ChainStep step={3} label="Evidence" question="What the source says">
          {evidence.length === 0 ? (
            <div className="rounded-card border border-dashed border-border-strong">
              <EmptyState
                compact
                title="No evidence found"
                body={
                  claim.unableReason === "citation_not_found"
                    ? "The cited authority could not be located, so there is no source text to show."
                    : claim.unableReason === "source_not_available"
                      ? "The cited source is not available to the platform, so there is no source text to show."
                      : "No passage in available sources bears on this claim."
                }
              />
            </div>
          ) : (
            <div className="space-y-3">
              {evidence.map((e, i) => {
                const authority = findAuthority(bundle, e.authorityId);
                return authority ? (
                  <EvidenceCard key={e.id} evidence={e} authority={authority} position={i + 1} total={evidence.length} reportId={reportId} claimIndex={claim.index} />
                ) : null;
              })}
              {claim.quoteComparison && <QuoteComparison {...claim.quoteComparison} />}
            </div>
          )}
        </ChainStep>

        <ChainStep step={4} label="Reason" question="Why this status">
          <div className="rounded-card border border-border bg-surface p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-[15px] font-semibold text-ink">Why {meta.label}?</p>
              <Badge tone="primary">System-generated reasoning</Badge>
            </div>
            <ul className="mt-3 space-y-2">
              {claim.reason.map((sentence, i) => (
                <li key={i} className="text-sm leading-relaxed text-ink/90">
                  {sentence.text}{" "}
                  {sentence.evidenceIds.length === 0 ? (
                    <Badge className="align-middle">No linked evidence</Badge>
                  ) : (
                    sentence.evidenceIds.map((id) => {
                      const e = bundle.evidence.find((x) => x.id === id);
                      const a = findAuthority(bundle, e?.authorityId);
                      const label = findParagraph(a, e?.paragraphId)?.label ?? "";
                      const showName = new Set(evidence.map((x) => x.authorityId)).size > 1;
                      return (
                        <a
                          key={id}
                          href={`#evidence-${id}`}
                          className="mr-1 inline-flex items-center rounded border border-border bg-canvas px-1.5 align-middle font-mono text-[11.5px] text-ink/80 hover:border-primary hover:text-primary"
                        >
                          {showName ? `${a?.shortTitle} ${label}` : label}
                        </a>
                      );
                    })
                  )}
                </li>
              ))}
            </ul>
            {claim.unableReason && (
              <div className="mt-4 border-t border-border pt-3 text-sm">
                <p className="text-[13px] text-muted">Reason: {UNABLE_REASON_LABEL[claim.unableReason]}</p>
                {claim.whatYouCanDo && (
                  <p className="mt-1">
                    <span className="font-semibold text-ink">What you can do: </span>
                    {claim.whatYouCanDo}
                  </p>
                )}
              </div>
            )}
          </div>
        </ChainStep>

        <ChainStep step={5} label="Status" question="The verification outcome" last>
          <div className={cn("rounded-card border p-4", meta.border, meta.bg)}>
            <StatusBadge status={claim.status} size="lg" withTooltip={false} />
            <p className="mt-2 text-sm text-ink">{meta.definition}</p>
            <p className="mt-2 text-[13px] text-muted">
              Based on {authorityCount} {authorityCount === 1 ? "authority" : "authorities"} · {evidence.length} {evidence.length === 1 ? "passage" : "passages"}
              {asOf && ` · Sources as of ${asOf}`}
            </p>
            <p className="mt-2 text-[13px] font-medium text-ink/80">{RU_STATUS}</p>
          </div>
        </ChainStep>
      </div>

      <div className="space-y-3">
        <SecondaryPanel title="Legal status">
          {casesCited.length === 0 ? (
            <p className="text-sm text-muted">– Not checked: requires a located case.</p>
          ) : (
            <div className="space-y-5">
              {casesCited.map((a) => (
                <LegalStatusPanel key={a.id} authority={a} bundle={bundle} sourcesAsOf={bundle.report.sourcesAsOf} />
              ))}
            </div>
          )}
        </SecondaryPanel>

        <SecondaryPanel title="Contradicting authorities">
          {claim.contradictions.length === 0 ? (
            <p className="text-sm text-muted">{EMPTY.contra}</p>
          ) : (
            <ul className="divide-y divide-border">
              {claim.contradictions.map((c) => {
                const a = findAuthority(bundle, c.authorityId);
                if (!a) return null;
                return (
                  <AuthorityLink
                    key={c.authorityId}
                    className="border-l-[3px] border-unsupported pl-3"
                    authority={a}
                    note={`${findParagraph(a, c.paragraphId)?.label} · ${c.summary}`}
                    href={sourceHref(a.id, { paragraphId: c.paragraphId, reportId, claimIndex: claim.index })}
                  />
                );
              })}
            </ul>
          )}
        </SecondaryPanel>

        <SecondaryPanel title="Related authorities">
          {related.length === 0 ? (
            <p className="text-sm text-muted">{EMPTY.related}</p>
          ) : (
            <ul className="divide-y divide-border">
              {related.map((r) => {
                const a = findAuthority(bundle, r.authorityId);
                return a ? <AuthorityLink key={r.authorityId} authority={a} note={r.note} href={sourceHref(a.id, { reportId, claimIndex: claim.index })} /> : null;
              })}
            </ul>
          )}
        </SecondaryPanel>

        <SecondaryPanel title="Evidence graph">
          {isDesktop ? (
            <div className="h-72 overflow-hidden rounded-md border border-border bg-canvas">
              <EvidenceGraphCanvas model={graph} mode="mini" label={`Evidence graph for claim ${claim.index}`} />
            </div>
          ) : (
            <EvidenceChainTree bundle={bundle} claim={claim} />
          )}
          <Link href={`/reports/${reportId}/graph?focus=${claim.index}`} className="mt-3 inline-block text-[13px] font-medium text-primary hover:underline">
            Open in Evidence Graph
          </Link>
        </SecondaryPanel>
      </div>
    </div>
  );
}
