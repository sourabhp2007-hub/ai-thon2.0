import type { Metadata } from "next";
import { EmptyState } from "@/components/feedback/states";
import { DemoBanner, PageContainer, PageHeader } from "@/components/layout/page";
import { SourcesTable } from "@/components/sources/sources-table";
import { Card, SectionHeader } from "@/components/ui/primitives";
import { EMPTY } from "@/lib/domain/copy";
import { formatDate } from "@/lib/domain/format";
import { getSources } from "@/lib/services";
import { getScope } from "@/lib/server/preferences";
import { cn } from "@/lib/utils/cn";

export const metadata: Metadata = { title: "Sources" };

export default async function SourcesPage() {
  const scope = await getScope();
  const { items, coverage } = await getSources(scope);
  return (
    <PageContainer wide>
      <PageHeader title="Sources" subtitle="Authorities available to the platform for verification." />
      {scope.includeDemo && <DemoBanner />}
      {items.length === 0 || !coverage ? (
        <Card>
          <EmptyState title={EMPTY.sources.title} body={EMPTY.sources.body} />
        </Card>
      ) : (
        <>
          <section aria-labelledby="coverage-heading" className="mb-8">
            <SectionHeader id="coverage-heading" title="Source coverage" subtitle={`Updated ${formatDate(coverage.updatedAt)}`} />
            <ul className="grid gap-3 sm:grid-cols-3">
              {coverage.collections.map((c) => (
                <li key={c.label}>
                  <Card className={cn("h-full px-4 py-3", !c.available && "border-dashed bg-canvas")}>
                    <p className="text-sm font-semibold text-ink">{c.label}</p>
                    <p className={cn("mt-1 text-[13px]", c.available ? "text-muted" : "text-unverified")}>{c.detail}</p>
                  </Card>
                </li>
              ))}
            </ul>
          </section>
          <section aria-labelledby="available-heading">
            <SectionHeader id="available-heading" title="Available sources" />
            <SourcesTable items={items} />
          </section>
        </>
      )}
    </PageContainer>
  );
}
