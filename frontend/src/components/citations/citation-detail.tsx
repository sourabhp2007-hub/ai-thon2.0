"use client";

import Link from "next/link";
import { CitationCard, CitationCheckTable, checkSummary, LegalStatusPanel } from "@/components/citations/citation-parts";
import { Notice } from "@/components/feedback/states";
import { ButtonLink } from "@/components/ui/button";
import { StatusBadge } from "@/components/verification/status";
import { findAuthority, sourceHref } from "@/lib/domain/report";
import type { Citation, ReportBundle } from "@/lib/types/domain";

/** Citation Detail (spec §7.2): existence and accuracy of one citation. */
export function CitationDetail({ bundle, citation }: { bundle: ReportBundle; citation: Citation }) {
  const authority = findAuthority(bundle, citation.authorityId);
  const claim = bundle.claims.find((c) => c.id === citation.claimId)!;
  const reportId = bundle.report.id;

  return (
    <div className="space-y-6">
      <section aria-labelledby="located-heading">
        <h3 id="located-heading" className="eyebrow mb-2">
          Located authority
        </h3>
        {authority ? (
          <CitationCard authority={authority} citation={citation} />
        ) : citation.resolution === "not_found" ? (
          <Notice tone="danger" title="Citation could not be located">
            No case matching “{citation.parsed.caseName}” or the reference “{citation.parsed.reference}” was found in available sources. The citation may be
            incorrect, incomplete, or outside the sources available to the platform. Confirm it independently before relying on it.
          </Notice>
        ) : (
          <Notice title="Source not available">Tribunal orders are not among the sources available to the platform. This citation could not be checked.</Notice>
        )}
      </section>

      <section aria-labelledby="integrity-heading">
        <h3 id="integrity-heading" className="eyebrow mb-1">
          Citation integrity
        </h3>
        <p className="mb-2 text-[13px] text-muted">{checkSummary(citation.checks)}</p>
        <CitationCheckTable checks={citation.checks} />
      </section>

      <section aria-labelledby="status-heading">
        <h3 id="status-heading" className="eyebrow mb-2">
          Legal status
        </h3>
        {authority ? (
          <LegalStatusPanel authority={authority} bundle={bundle} sourcesAsOf={bundle.report.sourcesAsOf} />
        ) : (
          <p className="text-sm text-muted">– Not checked: requires a located case.</p>
        )}
      </section>

      <section aria-labelledby="used-heading">
        <h3 id="used-heading" className="eyebrow mb-2">
          Used in claims
        </h3>
        <Link
          href={`/reports/${reportId}?claim=${claim.index}`}
          className="flex items-center justify-between gap-3 rounded-card border border-border px-4 py-3 hover:border-border-strong"
        >
          <span className="min-w-0">
            <span className="text-[13px] font-semibold text-ink">Claim {claim.index}</span>
            <span className="mt-0.5 line-clamp-2 block text-[13px] text-muted">{claim.text}</span>
          </span>
          <StatusBadge status={claim.status} size="sm" withTooltip={false} />
        </Link>
      </section>

      <div className="flex flex-wrap gap-2 border-t border-border pt-4">
        {authority && (
          <ButtonLink href={sourceHref(authority.id, { paragraphId: citation.paragraphId, reportId, claimIndex: claim.index })} variant="secondary">
            View Source
          </ButtonLink>
        )}
        <ButtonLink href={`/reports/${reportId}?claim=${claim.index}`} variant="ghost">
          Go to Claim {claim.index}
        </ButtonLink>
      </div>
    </div>
  );
}
