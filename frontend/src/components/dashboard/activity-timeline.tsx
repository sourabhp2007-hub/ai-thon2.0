import { CheckCircle2, CircleAlert, Download, PlayCircle } from "lucide-react";
import Link from "next/link";
import { EmptyState } from "@/components/feedback/states";
import { Card } from "@/components/ui/primitives";
import { EMPTY } from "@/lib/domain/copy";
import { formatDateTime } from "@/lib/domain/format";
import { ACTIVITY_LABEL } from "@/lib/domain/labels";
import { summarize } from "@/lib/domain/summary";
import type { ActivityEvent, ReportListItem } from "@/lib/types/domain";

const ICON = {
  verification_started: { icon: PlayCircle, className: "text-primary" },
  verification_completed: { icon: CheckCircle2, className: "text-supported" },
  verification_failed: { icon: CircleAlert, className: "text-unsupported" },
  report_exported: { icon: Download, className: "text-muted" },
};

function detailFor(event: ActivityEvent, item: ReportListItem | undefined): string {
  const name = item?.document.name ?? "";
  if (event.kind === "verification_completed" && item?.statusCounts) {
    const s = summarize(item.statusCounts);
    return `${name} · ${s.total} claims · ${s.coverage}% coverage`;
  }
  return event.detail ? `${name} · ${event.detail}` : name;
}

export function ActivityTimeline({ events, reports }: { events: ActivityEvent[]; reports: ReportListItem[] }) {
  if (events.length === 0) {
    return (
      <Card>
        <EmptyState compact body={EMPTY.activity} />
      </Card>
    );
  }
  return (
    <Card className="px-4 py-2">
      <ol>
        {events.map((event, i) => {
          const item = reports.find((r) => r.report.id === event.reportId);
          const { icon: Icon, className } = ICON[event.kind];
          const href = item ? (item.report.state === "complete" ? `/reports/${item.report.id}` : `/verify/${item.report.jobId}`) : undefined;
          return (
            <li key={event.id} className="relative flex gap-3 py-3">
              {i < events.length - 1 && <span className="absolute top-9 bottom-0 left-[9px] w-px bg-border" aria-hidden />}
              <Icon className={`mt-0.5 size-[18px] shrink-0 ${className}`} aria-hidden />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-ink">{ACTIVITY_LABEL[event.kind]}</p>
                {href ? (
                  <Link href={href} className="block truncate text-[13px] text-muted hover:text-ink hover:underline">
                    {detailFor(event, item)}
                  </Link>
                ) : (
                  <p className="truncate text-[13px] text-muted">{detailFor(event, item)}</p>
                )}
              </div>
              <time dateTime={event.at} className="shrink-0 text-xs text-subtle">
                {formatDateTime(event.at)}
              </time>
            </li>
          );
        })}
      </ol>
    </Card>
  );
}
