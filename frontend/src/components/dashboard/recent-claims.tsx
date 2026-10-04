import Link from "next/link";
import { EmptyState } from "@/components/feedback/states";
import { Card } from "@/components/ui/primitives";
import { StatusBadge } from "@/components/verification/status";
import { EMPTY } from "@/lib/domain/copy";
import { shortDocumentName } from "@/lib/domain/format";
import { claimHref } from "@/lib/domain/report";
import { STATUS_META } from "@/lib/domain/status";
import type { ClaimListItem, VerificationStatus } from "@/lib/types/domain";
import { cn } from "@/lib/utils/cn";

const PREVIEW = 6;

/** Dashboard "Recent claims", sorted most serious first. */
export function RecentClaims({
  items,
  tab,
  status,
  expanded,
  hrefWith,
}: {
  items: ClaimListItem[];
  tab: "review" | "all";
  status: VerificationStatus | null;
  expanded: boolean;
  hrefWith: (changes: Record<string, string | null>) => string;
}) {
  const shown = expanded ? items : items.slice(0, PREVIEW);

  return (
    <Card>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 pt-3">
        <div role="tablist" aria-label="Claims" className="flex gap-4">
          {(["review", "all"] as const).map((t) => (
            <Link
              key={t}
              role="tab"
              aria-selected={tab === t}
              href={hrefWith({ claims: t === "review" ? null : "all", show: null })}
              scroll={false}
              className={cn(
                "-mb-px border-b-2 pb-2.5 text-sm font-medium",
                tab === t ? "border-primary text-ink" : "border-transparent text-muted hover:text-ink",
              )}
            >
              {t === "review" ? "Needs review" : "All"}
            </Link>
          ))}
        </div>
        {status && (
          <p className="pb-2.5 text-[13px] text-muted">
            Filtered to {STATUS_META[status].label} ·{" "}
            <Link href={hrefWith({ status: null })} scroll={false} className="font-medium text-primary hover:underline">
              Clear filters
            </Link>
          </p>
        )}
      </div>

      {shown.length === 0 ? (
        <EmptyState compact body={status || tab === "all" ? EMPTY.filter.body : EMPTY.attention} />
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden md:block">
            <table className="w-full text-sm">
              <caption className="sr-only">Recent claims</caption>
              <thead>
                <tr className="border-b border-border text-left text-xs text-muted">
                  <th scope="col" className="px-4 py-2 font-medium">Claim</th>
                  <th scope="col" className="px-4 py-2 font-medium">Report</th>
                  <th scope="col" className="px-4 py-2 font-medium">Authority</th>
                  <th scope="col" className="px-4 py-2 font-medium">Status</th>
                  <th scope="col" className="px-4 py-2 font-medium"><span className="sr-only">Action</span></th>
                </tr>
              </thead>
              <tbody>
                {shown.map(({ claim, report, document, authorityLabel }) => (
                  <tr key={claim.id} className="border-b border-border last:border-0 hover:bg-canvas/60">
                    <td className="max-w-md px-4 py-3">
                      <p className="line-clamp-2 text-ink">{claim.text}</p>
                    </td>
                    <td className="px-4 py-3 text-[13px] whitespace-nowrap text-muted">
                      {shortDocumentName(document.name, document.isDemo)} · Claim {claim.index}
                    </td>
                    <td className="max-w-56 px-4 py-3 text-[13px] text-muted">
                      <span className="line-clamp-2">{authorityLabel}</span>
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={claim.status} size="sm" />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link href={claimHref(report.id, claim)} className="text-[13px] font-medium text-primary hover:underline">
                        Review<span className="sr-only"> claim {claim.index}</span>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {/* Mobile cards */}
          <ul className="divide-y divide-border md:hidden">
            {shown.map(({ claim, report, document }) => (
              <li key={claim.id}>
                <Link href={claimHref(report.id, claim)} className="block px-4 py-3">
                  <span className="flex items-center justify-between gap-2">
                    <span className="text-xs text-muted">
                      {shortDocumentName(document.name, document.isDemo)} · Claim {claim.index}
                    </span>
                    <StatusBadge status={claim.status} size="sm" withTooltip={false} />
                  </span>
                  <span className="mt-1.5 line-clamp-3 block text-sm text-ink">{claim.text}</span>
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}

      {!expanded && items.length > PREVIEW && (
        <div className="border-t border-border px-4 py-3">
          <Link href={hrefWith({ show: "all" })} scroll={false} className="text-[13px] font-medium text-primary hover:underline">
            {tab === "review" ? `View all claims needing review (${items.length})` : `View all claims (${items.length})`}
          </Link>
        </div>
      )}
    </Card>
  );
}
