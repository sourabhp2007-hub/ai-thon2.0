import type { ReportBundle } from "@/lib/types/domain";
import { RU_EXPORT } from "./copy";
import { formatDate, slugify } from "./format";
import { FLAG_META } from "./labels";
import { claimAuthorityLabel, claimEvidenceSummary } from "./report";
import { STATUS_META } from "./status";
import { summarizeClaims } from "./summary";

export type ExportFormat = "pdf" | "csv" | "json";

export type ExportSection = "reasons" | "evidence" | "checks" | "legal_status" | "sources";

export const EXPORT_SECTIONS: { key: ExportSection; label: string }[] = [
  { key: "reasons", label: "Reasons for each status" },
  { key: "evidence", label: "Evidence excerpts" },
  { key: "checks", label: "Citation integrity checks" },
  { key: "legal_status", label: "Legal status of cited cases" },
  { key: "sources", label: "List of sources" },
];

export function exportFilename(bundle: ReportBundle, format: ExportFormat): string {
  const date = (bundle.report.verifiedAt ?? "").slice(0, 10);
  return `Verification-Report_${slugify(bundle.document.name)}_${date}.${format}`;
}

function csvCell(value: string | number): string {
  const s = String(value);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function reportToCsv(bundle: ReportBundle): string {
  const header = ["#", "Claim / Proposition", "Authority", "Status", "Evidence", "Flags", "Page"];
  const rows = bundle.claims.map((c) => [
    c.index,
    c.text,
    claimAuthorityLabel(bundle, c),
    STATUS_META[c.status].label,
    claimEvidenceSummary(bundle, c),
    c.flags.map((f) => FLAG_META[f].label).join("; "),
    c.location.page,
  ]);
  const disclaimer = [`# ${RU_EXPORT.replace("{date}", formatDate(bundle.report.sourcesAsOf ?? ""))}`];
  return [...disclaimer, header.join(","), ...rows.map((r) => r.map(csvCell).join(","))].join("\n");
}

export function reportToJson(bundle: ReportBundle): string {
  const { pages: _pages, ...document } = bundle.document;
  void _pages;
  return JSON.stringify(
    {
      notice: RU_EXPORT.replace("{date}", formatDate(bundle.report.sourcesAsOf ?? "")),
      isDemo: bundle.document.isDemo,
      report: bundle.report,
      document,
      summary: summarizeClaims(bundle.claims),
      claims: bundle.claims,
      citations: bundle.citations,
      evidence: bundle.evidence,
      authorities: bundle.authorities,
    },
    null,
    2,
  );
}
