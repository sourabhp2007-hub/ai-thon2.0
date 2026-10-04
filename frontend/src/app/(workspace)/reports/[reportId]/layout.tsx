import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { ReportDrawers } from "@/components/claims/report-drawers";
import { DemoBanner, PageContainer, PageHeader, ResponsibleUseNotice } from "@/components/layout/page";
import { ReportProvider } from "@/components/reports/report-context";
import { ExportReportModal } from "@/components/reports/export-report-modal";
import { ReportHeaderActions, ReportStatusTiles, ReportTabs } from "@/components/reports/report-chrome";
import { ReportStateBadge } from "@/components/reports/report-state";
import { DemoBadge, SectionHeader } from "@/components/ui/primitives";
import { Tooltip } from "@/components/ui/tooltip";
import { StatusBreakdownBar, SummaryMetrics } from "@/components/verification/overview";
import { DN_REPORT, TT_SOURCES_AS_OF } from "@/lib/domain/copy";
import { formatDate, formatDateTime } from "@/lib/domain/format";
import { DOCUMENT_TYPE_LABEL, FORMAT_LABEL } from "@/lib/domain/labels";
import { summarizeClaims } from "@/lib/domain/summary";
import { getReport } from "@/lib/services";
import { getScope } from "@/lib/server/preferences";

export async function generateMetadata({ params }: LayoutProps<"/reports/[reportId]">): Promise<Metadata> {
  const { reportId } = await params;
  const bundle = await getReport(reportId, await getScope());
  return { title: bundle?.document.name ?? "Report not found" };
}

/** Verification Report frame: header → overview → status breakdown → tabs. */
export default async function ReportLayout({ children, params }: LayoutProps<"/reports/[reportId]">) {
  const { reportId } = await params;
  const bundle = await getReport(reportId, await getScope());
  if (!bundle) notFound();
  if (bundle.report.state !== "complete") redirect(`/verify/${bundle.report.jobId}`);

  const { document, report } = bundle;
  const summary = summarizeClaims(bundle.claims);
  const meta = [
    DOCUMENT_TYPE_LABEL[document.type],
    FORMAT_LABEL[document.format],
    document.pageCount ? `${document.pageCount} pages` : null,
    `Uploaded ${formatDateTime(document.uploadedAt)}`,
    report.verifiedAt ? `Verified ${formatDateTime(report.verifiedAt)}` : null,
  ].filter(Boolean);

  return (
    <ReportProvider bundle={bundle}>
      <PageContainer wide>
        <PageHeader
          breadcrumbs={[{ label: "Reports", href: "/reports" }, { label: document.name }]}
          title={document.name}
          badges={
            <>
              {document.isDemo && <DemoBadge />}
              <ReportStateBadge state={report.state} />
            </>
          }
          meta={
            <>
              {meta.join(" · ")}
              {report.sourcesAsOf && (
                <>
                  {" · "}
                  <Tooltip content={TT_SOURCES_AS_OF}>
                    <span tabIndex={0} className="underline decoration-dotted underline-offset-2">
                      Sources as of {formatDate(report.sourcesAsOf)}
                    </span>
                  </Tooltip>
                </>
              )}
            </>
          }
          actions={<ReportHeaderActions />}
        />
        {document.isDemo && <DemoBanner>{DN_REPORT}</DemoBanner>}

        <section aria-labelledby="report-overview" className="mb-8 space-y-3">
          <SectionHeader id="report-overview" title="Verification overview" />
          <SummaryMetrics summary={summary} totalDescription="Propositions of law identified in this document" />
          <div className="rounded-card border border-border bg-surface px-5 py-4">
            <StatusBreakdownBar counts={summary.counts} />
          </div>
          <ReportStatusTiles />
        </section>

        <ReportTabs />
        {children}

        <ResponsibleUseNotice className="mt-10 border-t border-border pt-4" />
      </PageContainer>
      <ReportDrawers />
      <ExportReportModal />
    </ReportProvider>
  );
}
