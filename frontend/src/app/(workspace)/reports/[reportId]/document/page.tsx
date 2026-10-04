import { ReportPageReady } from "@/components/reports/report-context";
import { DocumentView } from "@/components/reports/document-view";

export default function DocumentTabPage() {
  return (
    <>
      <DocumentView />
      <ReportPageReady />
    </>
  );
}
