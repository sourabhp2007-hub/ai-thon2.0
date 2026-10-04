import { ReportPageReady } from "@/components/reports/report-context";
import { EvidenceGraphView } from "@/components/graph/evidence-graph-view";

export default function GraphTabPage() {
  return (
    <>
      <EvidenceGraphView />
      <ReportPageReady />
    </>
  );
}
