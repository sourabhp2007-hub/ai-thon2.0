import { notFound } from "next/navigation";
import { ClaimPageView } from "@/components/claims/claim-page-view";
import { ReportPageReady } from "@/components/reports/report-context";
import { getClaim } from "@/lib/services";
import { getScope } from "@/lib/server/preferences";

/** Full-page Claim Detail; the drawer on the report shows the same content. */
export default async function ClaimPage({ params }: PageProps<"/reports/[reportId]/claims/[claimId]">) {
  const { reportId, claimId } = await params;
  const claim = await getClaim(reportId, Number(claimId), await getScope());
  if (!claim) notFound();
  return (
    <>
      <ClaimPageView claimIndex={claim.index} />
      <ReportPageReady />
    </>
  );
}
