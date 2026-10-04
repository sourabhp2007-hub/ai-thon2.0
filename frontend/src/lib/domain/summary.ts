import type { ClaimSummary, StatusCounts, VerificationStatus } from "@/lib/types/domain";
import { STATUS_ORDER } from "./status";

export function emptyCounts(): StatusCounts {
  return { supported: 0, partially_supported: 0, unsupported: 0, unable_to_verify: 0 };
}

export function countStatuses(items: { status: VerificationStatus }[]): StatusCounts {
  const counts = emptyCounts();
  for (const item of items) counts[item.status] += 1;
  return counts;
}

export function addCounts(a: StatusCounts, b: StatusCounts): StatusCounts {
  const sum = emptyCounts();
  for (const s of STATUS_ORDER) sum[s] = a[s] + b[s];
  return sum;
}

/** Largest-remainder rounding so percentages always total exactly 100. */
export function percentagesOf(counts: StatusCounts): StatusCounts {
  const total = STATUS_ORDER.reduce((n, s) => n + counts[s], 0);
  const result = emptyCounts();
  if (total === 0) return result;
  const raw = STATUS_ORDER.map((s) => ({ s, exact: (counts[s] / total) * 100 }));
  let assigned = 0;
  for (const r of raw) {
    result[r.s] = Math.floor(r.exact);
    assigned += result[r.s];
  }
  const byRemainder = [...raw].sort((x, y) => y.exact - Math.floor(y.exact) - (x.exact - Math.floor(x.exact)));
  for (let i = 0; i < 100 - assigned; i++) result[byRemainder[i % byRemainder.length].s] += 1;
  return result;
}

/**
 * Derives every aggregate figure shown in the UI. Assessed = all claims
 * except Unable to Verify; coverage = assessed ÷ total, rounded.
 */
export function summarize(counts: StatusCounts): ClaimSummary {
  const total = STATUS_ORDER.reduce((n, s) => n + counts[s], 0);
  const assessed = total - counts.unable_to_verify;
  return {
    total,
    assessed,
    coverage: total === 0 ? 0 : Math.round((assessed / total) * 100),
    counts,
    percentages: percentagesOf(counts),
  };
}

export function summarizeClaims(claims: { status: VerificationStatus }[]): ClaimSummary {
  return summarize(countStatuses(claims));
}
