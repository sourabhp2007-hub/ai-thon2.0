import { Plus } from "lucide-react";
import type { Metadata } from "next";
import { PageContainer, PageHeader } from "@/components/layout/page";
import { ReportsTable } from "@/components/reports/reports-table";
import { ButtonLink } from "@/components/ui/button";
import { getReports } from "@/lib/services";
import { getScope } from "@/lib/server/preferences";

export const metadata: Metadata = { title: "Reports" };

export default async function ReportsPage() {
  const items = await getReports(await getScope());
  return (
    <PageContainer wide>
      <PageHeader
        title="Reports"
        subtitle="Every verification in this workspace."
        actions={
          <ButtonLink href="/verify/new" icon={<Plus className="size-4" aria-hidden />}>
            New Verification
          </ButtonLink>
        }
      />
      <ReportsTable items={items} />
    </PageContainer>
  );
}
