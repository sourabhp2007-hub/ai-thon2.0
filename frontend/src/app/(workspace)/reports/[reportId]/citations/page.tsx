import { ReportPageReady } from "@/components/reports/report-context";
import { CitationsView } from "@/components/citations/citations-view";

export default function CitationsTabPage() {
  return (
    <>
      <CitationsView />
      <ReportPageReady />
    </>
  );
}
