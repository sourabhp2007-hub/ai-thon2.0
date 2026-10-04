import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";
import { Card } from "@/components/ui/primitives";
import { InfoTip } from "@/components/ui/tooltip";
import { TT_ASSESSED, TT_COVERAGE, TT_FULL_COVERAGE } from "@/lib/domain/copy";
import { STATUS_META, STATUS_ORDER } from "@/lib/domain/status";
import type { ClaimSummary, StatusCounts, VerificationStatus } from "@/lib/types/domain";
import { cn } from "@/lib/utils/cn";
import { StatusIcon } from "./status";

export function MetricCard({
  label,
  value,
  description,
  tooltip,
}: {
  label: string;
  value: ReactNode;
  description: ReactNode;
  tooltip?: string;
}) {
  return (
    <Card className="px-5 py-4">
      <div className="flex items-center gap-1.5">
        <p className="eyebrow">{label}</p>
        {tooltip && <InfoTip content={tooltip} label={`About ${label}`} />}
      </div>
      <p className="mt-2 text-[28px] leading-none font-semibold tracking-tight text-ink tabular-nums">{value}</p>
      <p className="mt-2 text-[13px] text-muted">{description}</p>
    </Card>
  );
}

/** Total · Assessed · Coverage. All values derive from one ClaimSummary. */
export function SummaryMetrics({ summary, totalDescription }: { summary: ClaimSummary; totalDescription: string }) {
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      <MetricCard label="Total Claims" value={summary.total} description={totalDescription} tooltip="Propositions of law identified in the documents." />
      <MetricCard label="Assessed" value={summary.assessed} description="Claims that could be assessed" tooltip={TT_ASSESSED} />
      <MetricCard
        label="Verification Coverage"
        value={`${summary.coverage}%`}
        description={`${summary.assessed} of ${summary.total} claims assessed against available sources`}
        tooltip={summary.coverage === 100 ? `${TT_COVERAGE} ${TT_FULL_COVERAGE}` : TT_COVERAGE}
      />
    </div>
  );
}

export function breakdownAriaLabel(counts: StatusCounts, total: number) {
  return `Status breakdown: ${counts.supported} supported, ${counts.partially_supported} partially supported, ${counts.unsupported} unsupported, ${counts.unable_to_verify} unable to verify, of ${total} claims.`;
}

/** Stacked bar, labelled directly. */
export function StatusBreakdownBar({
  counts,
  showLegend = true,
  thin = false,
  className,
}: {
  counts: StatusCounts;
  showLegend?: boolean;
  thin?: boolean;
  className?: string;
}) {
  const total = STATUS_ORDER.reduce((n, s) => n + counts[s], 0);
  return (
    <div className={className}>
      <div
        role="img"
        aria-label={breakdownAriaLabel(counts, total)}
        className={cn("flex w-full gap-0.5 overflow-hidden rounded-full bg-canvas", thin ? "h-1.5" : "h-2.5")}
      >
        {STATUS_ORDER.filter((s) => counts[s] > 0).map((s) => (
          <span
            key={s}
            className={cn(STATUS_META[s].fill, "h-full origin-left motion-safe:animate-[grow_600ms_ease-out]")}
            style={{ width: `${(counts[s] / total) * 100}%` }}
          />
        ))}
      </div>
      {showLegend && (
        <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5 text-[13px]" aria-hidden>
          {STATUS_ORDER.map((s) => (
            <li key={s} className="flex items-center gap-1.5 text-muted">
              <StatusIcon status={s} className="size-3.5" />
              <span className="text-ink">{STATUS_META[s].label}</span>
              <span className="font-semibold text-ink tabular-nums">{counts[s]}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** Four status cards; each links to a filtered view. */
export function StatusTiles({
  summary,
  hrefFor,
  active,
  ctaLabel,
  variant = "report",
}: {
  summary: ClaimSummary;
  hrefFor: (status: VerificationStatus) => string;
  active?: VerificationStatus | null;
  ctaLabel?: string;
  variant?: "report" | "dashboard";
}) {
  return (
    <ul className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {STATUS_ORDER.map((s) => {
        const meta = STATUS_META[s];
        const isActive = active === s;
        return (
          <li key={s}>
            <Link
              href={hrefFor(s)}
              scroll={false}
              aria-current={isActive ? "true" : undefined}
              className={cn(
                "group flex h-full flex-col rounded-card border bg-surface px-4 py-3.5 transition-colors hover:border-border-strong",
                isActive ? cn(meta.border, "ring-2 ring-offset-0", meta.bg) : "border-border",
              )}
              style={isActive ? ({ "--tw-ring-color": `color-mix(in srgb, ${meta.color} 35%, transparent)` } as CSSProperties) : undefined}
            >
              <span className="flex items-center gap-1.5">
                <StatusIcon status={s} />
                <span className={cn("text-[13px] font-medium", meta.text)}>{meta.label}</span>
                {isActive && <span className="ml-auto text-[11px] font-medium text-muted">Filtered</span>}
              </span>
              <span className="mt-2 flex items-baseline gap-2">
                <span className="text-2xl font-semibold text-ink tabular-nums">{summary.counts[s]}</span>
                <span className="text-[13px] text-muted tabular-nums">
                  {summary.percentages[s]}%{variant === "report" ? " of claims" : ""}
                </span>
              </span>
              {variant === "dashboard" && <span className="mt-1 text-[13px] text-muted">{meta.short}</span>}
              {ctaLabel && <span className="mt-2 text-[13px] font-medium text-primary group-hover:underline">{ctaLabel}</span>}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
