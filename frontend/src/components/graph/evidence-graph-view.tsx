"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { HighlightedText, RelationshipChip } from "@/components/evidence/evidence-card";
import { EmptyState } from "@/components/feedback/states";
import { useReport } from "@/components/reports/report-context";
import { Button, ButtonLink } from "@/components/ui/button";
import { Select } from "@/components/ui/form";
import { Card, SectionHeader } from "@/components/ui/primitives";
import { StatusBadge } from "@/components/verification/status";
import { useMediaQuery } from "@/hooks/use-media-query";
import { useUrlState } from "@/hooks/use-url-state";
import {
  buildClaimGraph,
  buildReportGraph,
  graphCounts,
  NODE_KIND_LABEL,
  RELATIONSHIP_FILTER_LABEL,
  type GraphNodeModel,
  type RelationshipFilter,
} from "@/lib/domain/graph";
import { formatDate } from "@/lib/domain/format";
import { TREATMENT_META } from "@/lib/domain/labels";
import { claimCitations, findAuthority, findParagraph, sourceHref } from "@/lib/domain/report";
import { STATUS_META } from "@/lib/domain/status";
import type { ReportBundle } from "@/lib/types/domain";
import { cn } from "@/lib/utils/cn";
import { EvidenceChainTree, EvidenceGraphCanvas, GraphLegend } from "./graph-panels";

const ALL_FILTERS = Object.keys(RELATIONSHIP_FILTER_LABEL) as RelationshipFilter[];

function NodeDetails({
  node,
  bundle,
  expanded,
  onToggleExpand,
  extraCount,
  canExpand,
}: {
  node: GraphNodeModel;
  bundle: ReportBundle;
  expanded: boolean;
  onToggleExpand: () => void;
  extraCount: number;
  canExpand: boolean;
}) {
  const reportId = bundle.report.id;
  const { data } = node;
  const kind = <p className="eyebrow">{NODE_KIND_LABEL[data.kind]}</p>;

  if (data.kind === "claim" && data.claimIndex) {
    const claim = bundle.claims.find((c) => c.index === data.claimIndex)!;
    return (
      <div className="space-y-3">
        {kind}
        <p className="text-sm font-semibold text-ink">Claim {claim.index}</p>
        <StatusBadge status={claim.status} size="sm" />
        <p className="text-sm text-ink/85">{claim.text}</p>
        <ButtonLink href={`/reports/${reportId}/graph?focus=${claim.index}&claim=${claim.index}`} variant="secondary" size="sm">
          Open Claim
        </ButtonLink>
      </div>
    );
  }

  if ((data.kind === "case" || data.kind === "provision") && data.authorityId) {
    const a = findAuthority(bundle, data.authorityId)!;
    return (
      <div className="space-y-3">
        {kind}
        <p className="font-serif text-[15px] font-semibold text-ink">{a.title}</p>
        <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-[13px]">
          <dt className="text-muted">Citation</dt>
          <dd className="font-mono text-[12.5px]">{a.citation}</dd>
          {a.court && (
            <>
              <dt className="text-muted">Court</dt>
              <dd>{a.court}</dd>
            </>
          )}
          {a.decidedOn && (
            <>
              <dt className="text-muted">Decided</dt>
              <dd>{formatDate(a.decidedOn)}</dd>
            </>
          )}
          {a.type === "case" && (
            <>
              <dt className="text-muted">Legal status</dt>
              <dd>
                {a.treatments.length
                  ? a.treatments.map((t) => `${TREATMENT_META[t.kind].label} (${t.date.slice(0, 4)})`).join(", ")
                  : a.treatmentDataAvailable
                    ? "No adverse treatment found"
                    : "No treatment data available"}
              </dd>
            </>
          )}
        </dl>
        <div className="flex flex-wrap gap-2">
          <ButtonLink href={sourceHref(a.id, { reportId })} variant="secondary" size="sm">
            View Source
          </ButtonLink>
          {canExpand && (
            <Button variant="ghost" size="sm" onClick={onToggleExpand} aria-expanded={expanded}>
              {expanded ? "Collapse connections" : "Expand connections"}
            </Button>
          )}
        </div>
        {expanded && extraCount > 0 && <p className="text-xs text-muted">+{extraCount} connected nodes</p>}
      </div>
    );
  }

  if (data.kind === "paragraph" && data.authorityId) {
    const a = findAuthority(bundle, data.authorityId);
    return (
      <div className="space-y-3">
        {kind}
        <p className="text-sm font-semibold text-ink">{node.data.tooltip}</p>
        <ButtonLink href={sourceHref(data.authorityId, { paragraphId: data.paragraphId, reportId })} variant="secondary" size="sm">
          View in source
        </ButtonLink>
        {a && <p className="text-xs text-muted">{a.citation}</p>}
      </div>
    );
  }

  if (data.kind === "evidence" && data.evidenceId) {
    const e = bundle.evidence.find((x) => x.id === data.evidenceId)!;
    const a = findAuthority(bundle, e.authorityId);
    const p = findParagraph(a, e.paragraphId);
    const claim = bundle.claims.find((c) => c.id === e.claimId)!;
    return (
      <div className="space-y-3">
        {kind}
        <p className="text-[13px] text-muted">
          {a?.shortTitle} · {p?.label}
        </p>
        <p className="eyebrow">Source text</p>
        <blockquote className="source-text border-l-[3px] border-border-strong pl-3 text-[15px]">
          <HighlightedText text={p?.text ?? ""} highlight={e.highlight} />
        </blockquote>
        <RelationshipChip relationship={e.relationship} />
        <div>
          <ButtonLink href={`/reports/${reportId}/graph?focus=${claim.index}&claim=${claim.index}`} variant="secondary" size="sm">
            Open Claim
          </ButtonLink>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {kind}
      <p className="text-sm font-semibold text-ink">{data.label}</p>
      <p className="text-[13px] text-muted">{data.sublabel}</p>
      <p className="text-[13px] text-muted">{data.tooltip}</p>
    </div>
  );
}

/** Evidence Graph tab (spec §8). */
export function EvidenceGraphView() {
  const bundle = useReport();
  const { searchParams, update } = useUrlState();
  const isDesktop = useMediaQuery("(min-width: 1024px)");
  const [mode, setMode] = useState<"focused" | "report">("focused");
  const [filters, setFilters] = useState<Set<RelationshipFilter>>(new Set(ALL_FILTERS));
  const [selected, setSelected] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string[]>([]);
  const [resetCount, setResetCount] = useState(0);
  const [showLegend, setShowLegend] = useState(true);

  const defaultClaim = bundle.claims.find((c) => c.contradictions.length > 0) ?? bundle.claims[0];
  const focusParam = searchParams.get("focus");
  const claim = focusParam === "none" ? undefined : bundle.claims.find((c) => String(c.index) === focusParam) ?? defaultClaim;

  const model = useMemo(() => {
    if (mode === "report") return buildReportGraph(bundle);
    return claim ? buildClaimGraph(bundle, claim, { expanded }) : null;
  }, [bundle, claim, mode, expanded]);

  const baseModel = useMemo(() => (mode === "focused" && claim ? buildClaimGraph(bundle, claim) : null), [bundle, claim, mode]);
  const counts = graphCounts(bundle);
  const selectedNode = model?.nodes.find((n) => n.id === selected) ?? null;
  const selectedAuthority = selectedNode?.data.authorityId;
  const canExpand = mode === "focused" && Boolean(selectedAuthority && findAuthority(bundle, selectedAuthority)?.treatments.length);
  const extraCount = model && baseModel ? model.nodes.length - baseModel.nodes.length : 0;
  const noConnections = mode === "focused" && claim && claimCitations(bundle, claim).length === 0;
  const allFiltered = filters.size === 0;

  const changeClaim = (value: string) => {
    setSelected(null);
    setExpanded([]);
    update({ focus: value || "none" });
  };

  const toggleFilter = (f: RelationshipFilter) => {
    setFilters((prev) => {
      const next = new Set(prev);
      if (next.has(f)) next.delete(f);
      else next.add(f);
      return next;
    });
  };

  return (
    <section aria-labelledby="graph-heading">
      <SectionHeader id="graph-heading" title="Evidence Graph" subtitle="How each claim connects to its authorities, evidence and later treatment." />

      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-3">
          {isDesktop && (
            <div role="group" aria-label="Graph mode" className="inline-flex rounded-control border border-border-strong bg-surface p-0.5">
              {(["focused", "report"] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  aria-pressed={mode === m}
                  onClick={() => {
                    setMode(m);
                    setSelected(null);
                  }}
                  className={cn("h-8 rounded-[5px] px-3 text-[13px] font-medium", mode === m ? "bg-white text-black" : "text-ink hover:bg-white/8")}
                >
                  {m === "focused" ? "Focused claim" : "All claims"}
                </button>
              ))}
            </div>
          )}
          {(mode === "focused" || !isDesktop) && (
            <div className="flex items-center gap-2">
              <label htmlFor="graph-claim" className="text-[13px] text-muted">
                Claim
              </label>
              <Select id="graph-claim" value={claim ? String(claim.index) : ""} onChange={(e) => changeClaim(e.target.value)} className="h-8 w-auto max-w-[min(30rem,80vw)] text-[13px]">
                <option value="">Select a claim</option>
                {bundle.claims.map((c) => (
                  <option key={c.id} value={c.index}>
                    Claim {c.index} · {STATUS_META[c.status].label} · {c.text.slice(0, 60)}
                    {c.text.length > 60 ? "…" : ""}
                  </option>
                ))}
              </Select>
            </div>
          )}
          {mode === "report" && isDesktop && (
            <p className="text-[13px] text-muted">
              {counts.claims} claims · {counts.located} located authorities · {counts.unresolved} unresolved citations
            </p>
          )}
        </div>
        {isDesktop && (
          <Button variant="ghost" size="sm" onClick={() => setShowLegend((s) => !s)} aria-expanded={showLegend}>
            {showLegend ? "Hide legend" : "Show legend"}
          </Button>
        )}
      </div>

      {isDesktop && (
        <fieldset className="mb-4 flex flex-wrap items-center gap-2">
          <legend className="sr-only">Relationships</legend>
          <span className="mr-1 text-[13px] text-muted" aria-hidden>
            Relationships:
          </span>
          {ALL_FILTERS.map((f) => (
            <label
              key={f}
              className={cn(
                "flex h-8 cursor-pointer items-center gap-2 rounded-full border px-3 text-[13px]",
                filters.has(f) ? "border-ink/30 bg-surface text-ink" : "border-border bg-canvas text-subtle line-through",
              )}
            >
              <input type="checkbox" checked={filters.has(f)} onChange={() => toggleFilter(f)} className="size-3.5 accent-primary" />
              {RELATIONSHIP_FILTER_LABEL[f]}
            </label>
          ))}
        </fieldset>
      )}

      {!isDesktop ? (
        <Card className="p-4">
          {claim ? <EvidenceChainTree bundle={bundle} claim={claim} /> : <EmptyState compact body="Select a claim to see its evidence graph." />}
        </Card>
      ) : !model || (mode === "focused" && !claim) ? (
        <Card>
          <EmptyState body="Select a claim to see its evidence graph." />
        </Card>
      ) : noConnections ? (
        <Card>
          <EmptyState body={`Claim ${claim!.index} has no cited or retrieved authority, so there are no connections to show.`} />
        </Card>
      ) : (
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
          <div className="overflow-hidden rounded-card border border-border bg-surface">
          <div className="relative h-[600px]">
            {allFiltered ? (
              <EmptyState
                body="No connections match the selected relationships."
                action={
                  <Button variant="secondary" onClick={() => setFilters(new Set(ALL_FILTERS))}>
                    Show all relationships
                  </Button>
                }
              />
            ) : (
              <EvidenceGraphCanvas
                key={`${mode}-${claim?.id}-${expanded.join(",")}-${resetCount}`}
                model={model}
                mode={mode}
                filters={filters}
                selected={selected}
                onSelect={setSelected}
                onReset={() => {
                  setSelected(null);
                  setResetCount((n) => n + 1);
                }}
                label={mode === "report" ? "Evidence graph for all claims" : `Evidence graph for claim ${claim?.index}`}
              />
            )}
          </div>
            {showLegend && !allFiltered && (
              <div className="border-t border-border bg-canvas/60 px-4 py-3">
                <p className="eyebrow mb-1.5">Legend</p>
                <GraphLegend />
              </div>
            )}
          </div>
          <Card className="h-fit p-4" aria-live="polite">
            <p className="mb-3 text-sm font-semibold text-ink">Details</p>
            {selectedNode ? (
              <NodeDetails
                node={selectedNode}
                bundle={bundle}
                expanded={Boolean(selectedAuthority && expanded.includes(selectedAuthority))}
                canExpand={canExpand}
                extraCount={extraCount}
                onToggleExpand={() =>
                  selectedAuthority &&
                  setExpanded((list) => (list.includes(selectedAuthority) ? list.filter((x) => x !== selectedAuthority) : [...list, selectedAuthority]))
                }
              />
            ) : (
              <p className="text-[13px] text-muted">
                Select a node to inspect it. Selecting highlights its connections; Esc clears the selection.
                {mode === "focused" && claim && (
                  <>
                    {" "}
                    <Link href={`/reports/${bundle.report.id}/graph?focus=${claim.index}&claim=${claim.index}`} className="font-medium text-primary hover:underline">
                      Open Claim {claim.index}
                    </Link>
                  </>
                )}
              </p>
            )}
          </Card>
        </div>
      )}
    </section>
  );
}
