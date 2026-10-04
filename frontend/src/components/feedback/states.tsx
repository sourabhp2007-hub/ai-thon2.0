import { CircleAlert, Inbox } from "lucide-react";
import type { ReactNode } from "react";
import { Skeleton } from "@/components/ui/primitives";
import { cn } from "@/lib/utils/cn";

export function EmptyState({
  title,
  body,
  action,
  icon,
  compact,
}: {
  title?: string;
  body: string;
  action?: ReactNode;
  icon?: ReactNode;
  compact?: boolean;
}) {
  return (
    <div className={cn("flex flex-col items-center text-center", compact ? "px-4 py-6" : "px-6 py-14")}>
      {!compact && (
        <div className="mb-3 flex size-10 items-center justify-center rounded-full bg-canvas text-muted" aria-hidden>
          {icon ?? <Inbox className="size-5" />}
        </div>
      )}
      {title && <p className="text-[15px] font-semibold text-ink">{title}</p>}
      <p className={cn("max-w-md text-sm text-muted", title && "mt-1")}>{body}</p>
      {action && <div className="mt-4 flex flex-wrap justify-center gap-2">{action}</div>}
    </div>
  );
}

/** Inline error region; the rest of the page keeps working. */
export function ErrorState({ title, body, action }: { title?: string; body: string; action?: ReactNode }) {
  return (
    <div role="alert" className="flex flex-col items-center px-6 py-12 text-center">
      <div className="mb-3 flex size-10 items-center justify-center rounded-full bg-unsupported-bg text-unsupported" aria-hidden>
        <CircleAlert className="size-5" />
      </div>
      {title && <p className="text-[15px] font-semibold text-ink">{title}</p>}
      <p className={cn("max-w-md text-sm text-muted", title && "mt-1")}>{body}</p>
      {action && <div className="mt-4 flex flex-wrap justify-center gap-2">{action}</div>}
    </div>
  );
}

/** Skeleton block with a screen-reader loading message. */
export function LoadingState({ label, rows = 5, visible = false }: { label: string; rows?: number; visible?: boolean }) {
  return (
    <div role="status" aria-live="polite" className="space-y-3">
      <span className={visible ? "text-sm text-muted" : "sr-only"}>{label}</span>
      {Array.from({ length: rows }, (_, i) => (
        <Skeleton key={i} className={cn("h-12 w-full", i === 0 && "h-16")} />
      ))}
    </div>
  );
}

export function Notice({
  tone = "neutral",
  title,
  children,
  icon,
  className,
}: {
  tone?: "neutral" | "accent" | "warning" | "danger";
  title?: string;
  children: ReactNode;
  icon?: ReactNode;
  className?: string;
}) {
  const tones = {
    neutral: "border-border bg-canvas text-ink",
    accent: "border-accent/25 bg-accent-soft text-ink",
    warning: "border-partial/30 bg-partial-bg text-ink",
    danger: "border-unsupported/30 bg-unsupported-bg text-ink",
  };
  return (
    <div className={cn("flex gap-3 rounded-card border px-4 py-3 text-sm", tones[tone], className)}>
      {icon && <span className="mt-0.5 shrink-0" aria-hidden>{icon}</span>}
      <div className="min-w-0">
        {title && <p className="font-semibold">{title}</p>}
        <div className={cn("text-ink/80", title && "mt-0.5")}>{children}</div>
      </div>
    </div>
  );
}
