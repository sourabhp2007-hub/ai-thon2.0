import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

export function Card({ className, ...props }: ComponentProps<"div">) {
  return <div className={cn("rounded-card border border-border bg-surface", className)} {...props} />;
}

export function SectionHeader({
  title,
  subtitle,
  action,
  as: Heading = "h2",
  id,
}: {
  title: string;
  subtitle?: ReactNode;
  action?: ReactNode;
  as?: "h2" | "h3";
  id?: string;
}) {
  return (
    <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0">
        <Heading id={id} className={cn("font-semibold text-ink", Heading === "h2" ? "text-[17px]" : "text-[15px]")}>
          {title}
        </Heading>
        {subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

type Tone = "neutral" | "primary" | "accent" | "supported" | "partial" | "unsupported" | "unverified" | "dark";

const TONE: Record<Tone, string> = {
  neutral: "bg-canvas text-muted border-border",
  primary: "bg-primary-soft text-primary border-primary/20",
  accent: "bg-accent-soft text-accent border-accent/20",
  supported: "bg-supported-bg text-supported border-supported/25",
  partial: "bg-partial-bg text-partial border-partial/25",
  unsupported: "bg-unsupported-bg text-unsupported border-unsupported/25",
  unverified: "bg-unverified-bg text-unverified border-unverified/25",
  dark: "bg-white/10 text-white/80 border-white/15",
};

export function Badge({ tone = "neutral", className, ...props }: ComponentProps<"span"> & { tone?: Tone }) {
  return (
    <span
      className={cn("inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium whitespace-nowrap", TONE[tone], className)}
      {...props}
    />
  );
}

export function DemoBadge({ className }: { className?: string }) {
  return (
    <Badge tone="accent" className={className}>
      Demo Data
    </Badge>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden="true" className={cn("animate-pulse rounded-md bg-ink/[0.06]", className)} />;
}

export function Kbd({ children }: { children: ReactNode }) {
  return <kbd className="rounded border border-border bg-canvas px-1.5 py-0.5 font-mono text-[11px] text-muted">{children}</kbd>;
}

export function VisuallyHidden({ children }: { children: ReactNode }) {
  return <span className="sr-only">{children}</span>;
}

/** Monospace citation text. */
export function CitationText({ children, className }: { children: ReactNode; className?: string }) {
  return <span className={cn("font-mono text-[12.5px] text-ink/80", className)}>{children}</span>;
}
