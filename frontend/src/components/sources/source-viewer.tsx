"use client";

import { ArrowLeft, ChevronDown, ChevronUp, ExternalLink, Link2 } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { LegalStatusPanel } from "@/components/citations/citation-parts";
import { Notice } from "@/components/feedback/states";
import { Button, ButtonLink } from "@/components/ui/button";
import { Card, DemoBadge } from "@/components/ui/primitives";
import { useToast } from "@/components/ui/toast";
import { Tooltip } from "@/components/ui/tooltip";
import { StatusBadge } from "@/components/verification/status";
import { SUCCESS } from "@/lib/domain/copy";
import { formatDate } from "@/lib/domain/format";
import { AUTHORITY_TYPE_LABEL, TREATMENT_META } from "@/lib/domain/labels";
import { STATUS_META } from "@/lib/domain/status";
import type { SourceDetail } from "@/lib/services";
import type { Paragraph } from "@/lib/types/domain";
import { cn } from "@/lib/utils/cn";
import { SearchField } from "@/components/reports/filter-toolbar";

interface Marker {
  claimIndex: number;
  reportId: string;
  status: keyof typeof STATUS_META;
}

/** Splits text on search matches and an optional evidence span. */
function renderText(text: string, evidence: string | undefined, query: string, matchStart: number, activeMatch: number): { node: ReactNode; matches: number } {
  const ranges: { start: number; end: number; kind: "evidence" | "match"; n?: number }[] = [];
  if (evidence) {
    const at = text.indexOf(evidence);
    if (at >= 0) ranges.push({ start: at, end: at + evidence.length, kind: "evidence" });
  }
  let matches = 0;
  if (query) {
    const lower = text.toLowerCase();
    let from = 0;
    for (;;) {
      const at = lower.indexOf(query, from);
      if (at < 0) break;
      ranges.push({ start: at, end: at + query.length, kind: "match", n: matchStart + matches });
      matches++;
      from = at + query.length;
    }
  }
  if (ranges.length === 0) return { node: text, matches };
  // Search matches take precedence where they overlap the evidence span.
  const boundaries = [...new Set([0, text.length, ...ranges.flatMap((r) => [r.start, r.end])])].sort((a, b) => a - b);
  const parts: ReactNode[] = [];
  for (let i = 0; i < boundaries.length - 1; i++) {
    const [a, b] = [boundaries[i], boundaries[i + 1]];
    const slice = text.slice(a, b);
    const match = ranges.find((r) => r.kind === "match" && r.start <= a && r.end >= b);
    const ev = ranges.find((r) => r.kind === "evidence" && r.start <= a && r.end >= b);
    if (match) {
      parts.push(
        <mark key={i} data-match={match.n} className={cn("rounded-sm px-0.5", match.n === activeMatch ? "bg-primary text-white" : "bg-primary-soft text-ink")}>
          {slice}
        </mark>,
      );
    } else if (ev) {
      parts.push(
        <mark key={i} className="rounded-sm bg-highlight px-0.5 font-semibold text-highlight-text">
          {slice}
        </mark>,
      );
    } else parts.push(slice);
  }
  return { node: parts, matches };
}

/** Source Viewer (spec §9.2): reading an authority with evidence and claim connections. */
export function SourceViewer({
  detail,
  paragraphId,
  reportId,
  claimIndex,
}: {
  detail: SourceDetail;
  paragraphId: string | null;
  reportId: string | null;
  claimIndex: number | null;
}) {
  const { authority, linked, citedBy, citations, evidence } = detail;
  const toast = useToast();
  const [query, setQuery] = useState("");
  const [activeMatch, setActiveMatch] = useState(0);
  const [citedOnly, setCitedOnly] = useState(false);
  const q = query.trim().toLowerCase();

  const fromClaim = reportId && claimIndex ? citedBy.find((c) => c.report.id === reportId && c.claim.index === claimIndex) : undefined;
  const inReport = reportId ? citedBy.filter((c) => c.report.id === reportId) : citedBy;

  // Which claims mark each paragraph (via a pinpoint citation or an evidence span).
  const markers = useMemo(() => {
    const map = new Map<string, Marker[]>();
    for (const item of inReport) {
      const paras = new Set([
        ...citations.filter((c) => c.claimId === item.claim.id && c.paragraphId).map((c) => c.paragraphId!),
        ...evidence.filter((e) => e.claimId === item.claim.id).map((e) => e.paragraphId),
      ]);
      for (const p of paras) map.set(p, [...(map.get(p) ?? []), { claimIndex: item.claim.index, reportId: item.report.id, status: item.claim.status }]);
    }
    return map;
  }, [inReport, citations, evidence]);

  const selectedEvidence = fromClaim ? evidence.find((e) => e.claimId === fromClaim.claim.id && e.paragraphId === paragraphId) : undefined;

  const paragraphs = citedOnly ? authority.paragraphs.filter((p) => markers.has(p.id)) : authority.paragraphs;

  // Global match numbering: each paragraph's matches start after the previous paragraphs'.
  const matchCounts = paragraphs.map((p: Paragraph) => (q ? p.text.toLowerCase().split(q).length - 1 : 0));
  const offsets = matchCounts.map((_, i) => matchCounts.slice(0, i).reduce((n, c) => n + c, 0));
  const totalMatches = matchCounts.reduce((n, c) => n + c, 0);
  const rendered = paragraphs.map((p: Paragraph, i) => ({
    p,
    node: renderText(p.text, selectedEvidence?.paragraphId === p.id ? selectedEvidence.highlight : undefined, q, offsets[i], activeMatch).node,
  }));

  useEffect(() => {
    if (!paragraphId) return;
    document.getElementById(`para-${paragraphId}`)?.scrollIntoView({ block: "center" });
  }, [paragraphId]);

  useEffect(() => {
    if (totalMatches === 0) return;
    document.querySelector(`[data-match="${activeMatch}"]`)?.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [activeMatch, totalMatches, q]);

  const copyLink = async (id: string) => {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/sources/${authority.id}?para=${id}`);
      toast({ message: SUCCESS.paragraphLink });
    } catch {
      toast({ message: "The link could not be copied.", tone: "error" });
    }
  };

  const metaRows: [string, string][] =
    authority.type === "case"
      ? [
          ["Court", authority.court ?? ""],
          ["Decided", authority.decidedOn ? formatDate(authority.decidedOn) : ""],
          ["Citation", authority.citation],
          ["Jurisdiction", authority.jurisdiction],
          [
            "Legal status",
            authority.treatments.length
              ? authority.treatments.map((t) => TREATMENT_META[t.kind].label).join(", ")
              : authority.treatmentDataAvailable
                ? "No adverse treatment found"
                : "No treatment data available",
          ],
        ]
      : [
          ["Instrument", authority.title.split(",").slice(0, -1).join(",")],
          ["Provision", authority.citation],
          ["Source type", AUTHORITY_TYPE_LABEL[authority.type]],
          ["Note", authority.textNature === "illustrative_summary" ? "Illustrative summary, not the official text" : "Official text"],
        ];

  return (
    <div>
      <Link
        href={fromClaim ? `/reports/${fromClaim.report.id}?claim=${fromClaim.claim.index}` : "/sources"}
        className="mb-4 inline-flex items-center gap-1 text-[13px] font-medium text-primary hover:underline"
      >
        <ArrowLeft className="size-3.5" aria-hidden />
        {fromClaim ? `Back to Claim ${fromClaim.claim.index}` : "Back to Sources"}
      </Link>

      <header className="mb-6">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="font-serif text-[26px] leading-tight font-semibold text-ink md:text-[30px]">{authority.title}</h1>
          {authority.isDemo && <DemoBadge />}
          <span className="rounded-full border border-border bg-canvas px-2 py-0.5 text-xs text-muted">{AUTHORITY_TYPE_LABEL[authority.type]}</span>
        </div>
        <dl className="mt-4 grid gap-x-8 gap-y-2 text-sm sm:grid-cols-2 lg:grid-cols-5">
          {metaRows.map(([k, v]) => (
            <div key={k}>
              <dt className="eyebrow">{k}</dt>
              <dd className={cn("mt-0.5 text-ink", k === "Citation" && "font-mono text-[13px]")}>{v}</dd>
            </div>
          ))}
        </dl>
        <div className="mt-4 flex flex-wrap gap-2">
          {authority.sourceUrl ? (
            <ButtonLink href={authority.sourceUrl} target="_blank" rel="noreferrer" variant="secondary" size="sm" icon={<ExternalLink className="size-3.5" aria-hidden />}>
              Open Judgment
            </ButtonLink>
          ) : (
            <Tooltip content={authority.isDemo ? "The original judgment is not available for demo data." : "The original judgment is not available."}>
              <span tabIndex={0}>
                <Button variant="secondary" size="sm" disabled icon={<ExternalLink className="size-3.5" aria-hidden />}>
                  Open Judgment
                </Button>
              </span>
            </Tooltip>
          )}
        </div>
      </header>

      {authority.isDemo && (
        <Notice tone="accent" className="mb-6">
          {authority.type === "case" ? "Demo source: only selected paragraphs are included." : "Demo source: the provision is shown as a short excerpt for demonstration."}
        </Notice>
      )}

      <div className="grid gap-6 lg:grid-cols-[180px_minmax(0,1fr)_300px]">
        <nav aria-label="Paragraphs" className="min-w-0 lg:sticky lg:top-20 lg:h-fit">
          <p className="eyebrow mb-2">Paragraphs</p>
          <ul className="relative scrollbar-none -mx-4 flex gap-1 overflow-x-auto px-4 lg:mx-0 lg:flex-col lg:px-0">
            {authority.paragraphs.map((p) => {
              const m = markers.get(p.id);
              return (
                <li key={p.id}>
                  <Tooltip content={m ? m.map((x) => `Cited by Claim ${x.claimIndex} · ${STATUS_META[x.status].label}`).join("; ") : `Go to ${p.label}`} side="right">
                    <a
                      href={`#para-${p.id}`}
                      aria-current={p.id === paragraphId ? "location" : undefined}
                      className={cn(
                        "flex items-center gap-2 rounded-md px-2.5 py-1.5 font-mono text-[13px] whitespace-nowrap",
                        p.id === paragraphId ? "bg-primary-soft text-primary" : "text-ink hover:bg-canvas",
                      )}
                    >
                      {p.label}
                      {m && <span className="size-1.5 rounded-full bg-primary" aria-label="Cited in this report" />}
                    </a>
                  </Tooltip>
                </li>
              );
            })}
          </ul>
          {markers.size > 0 && (
            <label className="mt-3 flex items-center gap-2 text-[13px] text-muted">
              <input type="checkbox" checked={citedOnly} onChange={(e) => setCitedOnly(e.target.checked)} className="accent-primary" />
              Show cited paragraphs only
            </label>
          )}
        </nav>

        <div className="min-w-0">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <SearchField
              value={query}
              onChange={(v) => {
                setQuery(v);
                setActiveMatch(0);
              }}
              placeholder="Search within this source"
            />
            {q && (
              <div className="flex items-center gap-1 text-[13px] text-muted" aria-live="polite">
                {totalMatches === 0 ? (
                  "No matches in this source."
                ) : (
                  <>
                    {totalMatches} {totalMatches === 1 ? "match" : "matches"}
                    <button type="button" aria-label="Previous match" onClick={() => setActiveMatch((m) => (m - 1 + totalMatches) % totalMatches)} className="rounded p-1 hover:bg-canvas">
                      <ChevronUp className="size-4" aria-hidden />
                    </button>
                    <button type="button" aria-label="Next match" onClick={() => setActiveMatch((m) => (m + 1) % totalMatches)} className="rounded p-1 hover:bg-canvas">
                      <ChevronDown className="size-4" aria-hidden />
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
          <ul className="mb-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted" aria-label="Highlight legend">
            <li className="flex items-center gap-1.5">
              <span className="size-3 rounded-sm bg-highlight" aria-hidden /> Evidence for the selected claim
            </li>
            <li className="flex items-center gap-1.5">
              <span className="size-3 rounded-sm border-l-[3px] border-primary bg-primary-soft/40" aria-hidden /> Cited elsewhere in this report
            </li>
            <li className="flex items-center gap-1.5">
              <span className="size-3 rounded-sm bg-primary-soft" aria-hidden /> Search match
            </li>
          </ul>
          <Card className="divide-y divide-border">
            {rendered.map(({ p, node }) => {
              const m = markers.get(p.id);
              return (
                <section
                  key={p.id}
                  id={`para-${p.id}`}
                  aria-label={p.label}
                  className={cn("scroll-mt-24 px-5 py-5 md:px-7", p.id === paragraphId && "bg-highlight-row", m && "border-l-[3px] border-l-primary")}
                >
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <h2 className="font-mono text-[13px] font-semibold text-ink">{p.label}</h2>
                    {m?.map((x) => (
                      <Link
                        key={`${x.reportId}-${x.claimIndex}`}
                        href={`/reports/${x.reportId}?claim=${x.claimIndex}`}
                        className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface py-0.5 pr-1 pl-2 text-xs text-ink hover:border-primary"
                      >
                        Claim {x.claimIndex}
                        <StatusBadge status={x.status} size="sm" withTooltip={false} />
                      </Link>
                    ))}
                    <button
                      type="button"
                      onClick={() => copyLink(p.id)}
                      className="ml-auto inline-flex items-center gap-1 text-xs text-muted hover:text-ink"
                    >
                      <Link2 className="size-3.5" aria-hidden /> Copy paragraph link
                    </button>
                  </div>
                  <p className="source-text">{node}</p>
                </section>
              );
            })}
          </Card>
        </div>

        <aside className="space-y-4">
          <Card className="p-4">
            <h2 className="text-sm font-semibold text-ink">In this report</h2>
            {inReport.length === 0 ? (
              <p className="mt-2 text-[13px] text-muted">No claims in your reports cite this source.</p>
            ) : (
              <ul className="mt-2 space-y-2">
                {inReport.map((item) => {
                  const paras = [...markers.entries()].filter(([, ms]) => ms.some((x) => x.claimIndex === item.claim.index && x.reportId === item.report.id)).map(([id]) => authority.paragraphs.find((p) => p.id === id)?.label);
                  return (
                    <li key={item.claim.id}>
                      <Link href={`/reports/${item.report.id}?claim=${item.claim.index}`} className="block rounded-md border border-border px-3 py-2 hover:border-border-strong">
                        <span className="flex items-center justify-between gap-2 text-[13px] font-medium text-ink">
                          Claim {item.claim.index}
                          <StatusBadge status={item.claim.status} size="sm" withTooltip={false} />
                        </span>
                        {paras.length > 0 && <span className="mt-0.5 block font-mono text-xs text-muted">{paras.join(", ")}</span>}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
            {reportId && <p className="mt-3 text-xs text-muted">Claim connections are shown for the report you came from.</p>}
          </Card>

          <Card className="p-4">
            <h2 className="mb-3 text-sm font-semibold text-ink">Legal status</h2>
            <LegalStatusPanel authority={authority} bundle={{ authorities: [authority, ...linked] }} sourcesAsOf={detail.sourcesAsOf} />
          </Card>

          <Card className="p-4">
            <h2 className="text-sm font-semibold text-ink">Related authorities</h2>
            {authority.related.length === 0 ? (
              <p className="mt-2 text-[13px] text-muted">No related authorities found in available sources.</p>
            ) : (
              <ul className="mt-2 divide-y divide-border">
                {authority.related.map((r) => {
                  const a = linked.find((x) => x.id === r.authorityId);
                  if (!a) return null;
                  return (
                    <li key={r.authorityId} className="py-2.5">
                      <p className="font-serif text-[14px] font-semibold text-ink">{a.title}</p>
                      <p className="text-xs text-muted">{r.note}</p>
                      <Link href={`/sources/${a.id}`} className="mt-1 inline-block text-[13px] font-medium text-primary hover:underline">
                        View Source
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>
        </aside>
      </div>
    </div>
  );
}
