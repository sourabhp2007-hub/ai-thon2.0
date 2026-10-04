import { Badge } from "@/components/ui/primitives";
import { REPORT_STATE_LABEL } from "@/lib/domain/labels";
import type { ReportState } from "@/lib/types/domain";

const TONE = {
  queued: "neutral",
  processing: "primary",
  complete: "supported",
  failed: "unsupported",
  cancelled: "unverified",
} as const;

export function ReportStateBadge({ state }: { state: ReportState }) {
  return (
    <Badge tone={TONE[state]}>
      {state === "processing" && <span className="size-1.5 rounded-full bg-primary motion-safe:animate-pulse-dot" aria-hidden />}
      {REPORT_STATE_LABEL[state]}
    </Badge>
  );
}
