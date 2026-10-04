"use client";

import dynamic from "next/dynamic";
import { LoadingState } from "@/components/feedback/states";
import { StatusBadge } from "@/components/verification/status";
import { LOADING } from "@/lib/domain/copy";
import { yearOf } from "@/lib/domain/format";
import { RELATIONSHIP_META, TREATMENT_META } from "@/lib/domain/labels";
import { claimCitations, claimEvidence, findAuthority, findParagraph } from "@/lib/domain/report";
import type { Claim, ReportBundle } from "@/lib/types/domain";
import { edgeStyle, LEGEND } from "./graph-style";

/** The React Flow canvas is client-only and loaded on demand. */
export const EvidenceGraphCanvas = dynamic(() => import("./evidence-graph-canvas"), {
  ssr: false,
  loading: () => (
    <div className="p-4">
      <LoadingState label={LOADING.graph} rows={3} visible />
    </div>
  ),
});

export function GraphLegend() {
  return (
    <ul className="grid grid-cols-1 gap-x-6 gap-y-1.5 text-xs text-muted sm:grid-cols-2 xl:grid-cols-4">
      {LEGEND.map(({ relation, label }) => {
        const s = edgeStyle(relation);
        return (
          <li key={relation} className="flex items-center gap-2">
            <svg width="28" height="8" aria-hidden>
              <line x1="0" y1="4" x2="28" y2="4" stroke={s.color} strokeWidth={s.width} strokeDasharray={s.dash} />
            </svg>
            {label}
          </li>
        );
      })}
    </ul>
  );
}

/** Mobile replacement for the canvas: the same chain as an indented list. */
export function EvidenceChainTree({ bundle, claim }: { bundle: ReportBundle; claim: Claim }) {
  const evidence = claimEvidence(bundle, claim);
  const citations = claimCitations(bundle, claim);
  const citedIds = new Set(citations.map((c) => c.authorityId).filter(Boolean));
  const shownEvidence = new Set<string>();

  const evidenceItems = (authorityId: string) =>
    evidence
      .filter((e) => e.authorityId === authorityId)
      .map((e) => {
        shownEvidence.add(e.id);
        const p = findParagraph(findAuthority(bundle, e.authorityId), e.paragraphId);
        return (
          <li key={e.id} className="mt-1.5">
            <span className="font-mono text-xs">{p?.label}</span>: Evidence ({RELATIONSHIP_META[e.relationship].edge})
          </li>
        );
      });

  return (
    <div className="text-sm text-ink">
      <p className="flex flex-wrap items-center gap-2 font-semibold">
        Claim {claim.index} <StatusBadge status={claim.status} size="sm" withTooltip={false} />
      </p>
      <ul className="mt-2 space-y-2 border-l border-border pl-4">
        {citations.map((c) => {
          const a = findAuthority(bundle, c.authorityId);
          if (!a) {
            return (
              <li key={c.id}>
                <span className="text-muted">Not located: </span>
                {c.rawText}
              </li>
            );
          }
          const interpreters = bundle.authorities.filter((x) => x.interprets.includes(a.id) && citedIds.has(x.id));
          const treatments = a.treatments.filter((t) => evidence.some((e) => e.authorityId === t.byAuthorityId));
          return (
            <li key={c.id}>
              <span className="text-muted">Cites: </span>
              {a.title}
              <ul className="border-l border-border pl-4 text-[13px]">
                {evidenceItems(a.id)}
                {interpreters.map((x) => (
                  <li key={x.id} className="mt-1.5">
                    <span className="text-muted">Interpreted in: </span>
                    {x.shortTitle} ({yearOf(x.decidedOn)})
                  </li>
                ))}
                {treatments.map((t) => {
                  const by = findAuthority(bundle, t.byAuthorityId);
                  return (
                    <li key={t.byAuthorityId} className="mt-1.5">
                      <span className="text-muted">{TREATMENT_META[t.kind].past}: </span>
                      {by?.shortTitle} ({yearOf(t.date)})
                      <ul className="border-l border-border pl-4">{evidenceItems(t.byAuthorityId)}</ul>
                    </li>
                  );
                })}
              </ul>
            </li>
          );
        })}
        {citations.length === 0 && <li className="text-muted">No authority cited</li>}
      </ul>
      {evidence.some((e) => !shownEvidence.has(e.id)) && <p className="mt-2 text-xs text-muted">Further evidence is listed in the claim details.</p>}
      <p className="mt-3 text-xs text-muted">The full graph is available on larger screens.</p>
    </div>
  );
}
