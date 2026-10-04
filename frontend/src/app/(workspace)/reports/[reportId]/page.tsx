import { ReportPageReady } from "@/components/reports/report-context";
import { ClaimsView } from "@/components/claims/claims-view";

export default function ClaimsTabPage() {
  return (
    <>
      <ClaimsView />
      <ReportPageReady />
    </>
  );
}
