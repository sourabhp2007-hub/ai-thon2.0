import Link from "next/link";
import { ButtonLink } from "@/components/ui/button";
import { Card, DemoBadge } from "@/components/ui/primitives";
import { Tooltip } from "@/components/ui/tooltip";
import { StatusBreakdownBar } from "@/components/verification/overview";
import { TT_FULL_COVERAGE } from "@/lib/domain/copy";
import { formatDate } from "@/lib/domain/format";
import { DOCUMENT_TYPE_LABEL } from "@/lib/domain/labels";
import { summarize } from "@/lib/domain/summary";
import type { ReportListItem } from "@/lib/types/domain";
import { ReportStateBadge } from "./report-state";
import { RetryVerificationButton } from "./report-actions";

export function reportHref(item: ReportListItem) {
  return item.report.state === "complete" ? `/reports/${item.report.id}` : `/verify/${item.report.jobId}`;
}

/** Metadata line, e.g. "Legal brief · 14 pages · Verified 02 Oct 2026". */
export function documentMeta(item: ReportListItem): string {
  const { document, report } = item;
  const parts = [DOCUMENT_TYPE_LABEL[document.type]];
  if (document.format === "text") parts.push("Pasted text");
  else if (document.pageCount) parts.push(`${document.pageCount} pages`);
  if (report.state === "complete" && report.verifiedAt) parts.push(`Verified ${formatDate(report.verifiedAt)}`);
  else if (report.state === "processing") parts.push(`Started ${formatDate(document.uploadedAt)}`);
  else parts.push(formatDate(document.uploadedAt));
  return parts.join(" · ");
}

export function DocumentCard({ item }: { item: ReportListItem }) {
  const { document, report, statusCounts } = item;
  const summary = statusCounts ? summarize(statusCounts) : null;

  return (
    <Card className="flex h-full flex-col p-4">
      <div className="flex items-start justify-between gap-3">
        <Link href={reportHref(item)} className="min-w-0 text-[15px] leading-snug font-semibold text-ink hover:text-primary hover:underline">
          {document.name}
        </Link>
        <ReportStateBadge state={report.state} />
      </div>
      <p className="mt-1 text-[13px] text-muted">{documentMeta(item)}</p>
      {document.isDemo && <DemoBadge className="mt-2 self-start" />}

      <div className="mt-4 flex-1">
        {summary && statusCounts && (
          <>
            <StatusBreakdownBar counts={statusCounts} showLegend={false} thin />
            <p className="mt-2 text-[13px] text-muted">
              {summary.total} claims ·{" "}
              {summary.coverage === 100 ? (
                <Tooltip content={TT_FULL_COVERAGE}>
                  <span tabIndex={0} className="underline decoration-dotted underline-offset-2">
                    {summary.coverage}% coverage
                  </span>
                </Tooltip>
              ) : (
                `${summary.coverage}% coverage`
              )}
            </p>
          </>
        )}
        {report.state === "processing" && <p className="text-[13px] text-muted">{report.progressLabel ?? "Verification in progress"}</p>}
        {report.state === "failed" && <p className="text-[13px] text-unsupported">{report.error}</p>}
      </div>

      <div className="mt-4">
        {report.state === "complete" && (
          <ButtonLink href={`/reports/${report.id}`} variant="secondary" size="sm">
            Open Report
          </ButtonLink>
        )}
        {report.state === "processing" && (
          <ButtonLink href={`/verify/${report.jobId}`} variant="secondary" size="sm">
            View Progress
          </ButtonLink>
        )}
        {report.state === "failed" && (
          <RetryVerificationButton name={document.name} documentType={document.type} inputKind={document.format === "text" ? "text" : "file"} />
        )}
      </div>
    </Card>
  );
}
