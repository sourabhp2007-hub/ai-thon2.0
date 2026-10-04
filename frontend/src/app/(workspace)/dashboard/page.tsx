import { Plus } from "lucide-react";
import type { Metadata } from "next";
import { ActivityTimeline } from "@/components/dashboard/activity-timeline";
import { RecentClaims } from "@/components/dashboard/recent-claims";
import { ScopeSelect } from "@/components/dashboard/scope-select";
import { EmptyState } from "@/components/feedback/states";
import { DemoBanner, PageContainer, PageHeader } from "@/components/layout/page";
import { DocumentCard } from "@/components/reports/document-card";
import { ButtonLink } from "@/components/ui/button";
import { Card, SectionHeader } from "@/components/ui/primitives";
import { StatusBreakdownBar, StatusTiles, SummaryMetrics } from "@/components/verification/overview";
import { EMPTY } from "@/lib/domain/copy";
import { STATUS_SEVERITY, isStatus } from "@/lib/domain/status";
import { addCounts, emptyCounts, summarize } from "@/lib/domain/summary";
import { getDashboard } from "@/lib/services";
import { getScope } from "@/lib/server/preferences";

export const metadata: Metadata = { title: "Dashboard" };

export default async function DashboardPage({ searchParams }: PageProps<"/dashboard">) {
  const params = await searchParams;
  const scope = await getScope();
  const data = await getDashboard(scope);

  const header = (
    <PageHeader
      title="Dashboard"
      subtitle="Your verification workspace at a glance."
      actions={
        <ButtonLink href="/verify/new" icon={<Plus className="size-4" aria-hidden />}>
          New Verification
        </ButtonLink>
      }
    />
  );

  if (data.recentReports.length === 0) {
    return (
      <PageContainer>
        {header}
        <Card>
          <EmptyState
            title={EMPTY.dash.title}
            body={EMPTY.dash.body}
            action={
              <>
                <ButtonLink href="/verify/new">New Verification</ButtonLink>
                <ButtonLink href="/settings#data" variant="secondary">
                  Explore Demo
                </ButtonLink>
              </>
            }
          />
        </Card>
      </PageContainer>
    );
  }

  // Scope: all completed reports (default, D-02) or a single report.
  const scopeId = typeof params.scope === "string" && data.completedReports.some((r) => r.report.id === params.scope) ? params.scope : "all";
  const inScope = scopeId === "all" ? data.completedReports : data.completedReports.filter((r) => r.report.id === scopeId);
  const summary = summarize(inScope.reduce((acc, r) => (r.statusCounts ? addCounts(acc, r.statusCounts) : acc), emptyCounts()));

  const status = typeof params.status === "string" && isStatus(params.status) ? params.status : null;
  const tab = params.claims === "all" || status ? "all" : "review";
  const expanded = params.show === "all";

  const claimItems = data.claims
    .filter((c) => scopeId === "all" || c.report.id === scopeId)
    .filter((c) => (status ? c.claim.status === status : tab === "all" || c.claim.status !== "supported"))
    .sort((a, b) => STATUS_SEVERITY[a.claim.status] - STATUS_SEVERITY[b.claim.status] || a.claim.index - b.claim.index);

  const baseParams = { scope: scopeId === "all" ? null : scopeId, status, claims: params.claims === "all" ? "all" : null, show: expanded ? "all" : null };
  const hrefWith = (changes: Record<string, string | null>) => {
    const merged = { ...baseParams, ...changes };
    const qs = new URLSearchParams(Object.entries(merged).filter((e): e is [string, string] => Boolean(e[1])));
    return `/dashboard${qs.size ? `?${qs}` : ""}#recent-claims`;
  };

  const reportCount = data.completedReports.length;
  const scopeOptions = [
    { value: "all", label: `All completed reports (${reportCount})` },
    ...data.completedReports.map((r) => ({ value: r.report.id, label: r.document.name })),
  ];

  return (
    <PageContainer>
      {header}
      {scope.includeDemo && <DemoBanner />}

      <section aria-labelledby="overview-heading" className="mb-8">
        <SectionHeader id="overview-heading" title="Verification overview" action={<ScopeSelect options={scopeOptions} value={scopeId} />} />
        <SummaryMetrics
          summary={summary}
          totalDescription={scopeId === "all" ? `Across ${reportCount} completed ${reportCount === 1 ? "report" : "reports"}` : "Propositions of law identified in this document"}
        />
      </section>

      <section aria-labelledby="breakdown-heading" className="mb-8">
        <SectionHeader id="breakdown-heading" title="Status breakdown" />
        <Card className="mb-3 px-5 py-4">
          <StatusBreakdownBar counts={summary.counts} />
        </Card>
        <StatusTiles
          summary={summary}
          variant="dashboard"
          active={status}
          ctaLabel="Show claims"
          hrefFor={(s) => hrefWith({ status: status === s ? null : s, show: null })}
        />
      </section>

      <section aria-labelledby="documents-heading" className="mb-8">
        <SectionHeader
          id="documents-heading"
          title="Recent documents"
          subtitle="Latest verifications in this workspace."
          action={
            <ButtonLink href="/reports" variant="link" size="sm">
              View all reports
            </ButtonLink>
          }
        />
        <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {data.recentReports.slice(0, 4).map((item) => (
            <li key={item.report.id}>
              <DocumentCard item={item} />
            </li>
          ))}
        </ul>
      </section>

      <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_380px]">
        <section id="recent-claims" aria-labelledby="claims-heading" className="min-w-0 scroll-mt-20">
          <SectionHeader id="claims-heading" title="Recent claims" subtitle="Claims from recent reports that may need review." />
          <RecentClaims items={claimItems} tab={tab} status={status} expanded={expanded} hrefWith={hrefWith} />
        </section>
        <section aria-labelledby="activity-heading" className="min-w-0">
          <SectionHeader id="activity-heading" title="Recent verification activity" />
          <ActivityTimeline events={data.activity} reports={data.recentReports} />
        </section>
      </div>
    </PageContainer>
  );
}
