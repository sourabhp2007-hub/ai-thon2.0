import { Tooltip } from "@/components/ui/tooltip";
import { CHECK_RESULT_META } from "@/lib/domain/labels";
import { STATUS_META } from "@/lib/domain/status";
import type { CheckResult, VerificationStatus } from "@/lib/types/domain";
import { cn } from "@/lib/utils/cn";

/**
 * Distinct shape per status so meaning never depends on colour alone:
 * filled check · half-filled circle · x-octagon · dashed circle with "?".
 */
export function StatusIcon({ status, className }: { status: VerificationStatus; className?: string }) {
  const common = { className: cn("size-4 shrink-0", STATUS_META[status].text, className), viewBox: "0 0 16 16", "aria-hidden": true } as const;
  switch (status) {
    case "supported":
      return (
        <svg {...common}>
          <circle cx="8" cy="8" r="7" fill="currentColor" />
          <path d="M4.8 8.2 7 10.3l4.2-4.6" fill="none" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case "partially_supported":
      return (
        <svg {...common}>
          <circle cx="8" cy="8" r="6.25" fill="none" stroke="currentColor" strokeWidth="1.5" />
          <path d="M8 1.75a6.25 6.25 0 0 1 0 12.5Z" fill="currentColor" />
        </svg>
      );
    case "unsupported":
      return (
        <svg {...common}>
          <path d="M5.1 1.5h5.8l3.6 3.6v5.8l-3.6 3.6H5.1l-3.6-3.6V5.1Z" fill="currentColor" />
          <path d="m5.7 5.7 4.6 4.6m0-4.6-4.6 4.6" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
      );
    case "unable_to_verify":
      return (
        <svg {...common}>
          <circle cx="8" cy="8" r="6.25" fill="none" stroke="currentColor" strokeWidth="1.5" strokeDasharray="2.4 1.8" />
          <path d="M6.3 6.4a1.8 1.8 0 1 1 2.4 1.7c-.5.2-.7.5-.7 1v.3" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
          <circle cx="8" cy="11.3" r=".85" fill="currentColor" />
        </svg>
      );
  }
}

/** Icon + label + colour, with the status definition as a tooltip. */
export function StatusBadge({
  status,
  size = "md",
  withTooltip = true,
  className,
}: {
  status: VerificationStatus;
  size?: "sm" | "md" | "lg";
  withTooltip?: boolean;
  className?: string;
}) {
  const meta = STATUS_META[status];
  const badge = (
    <span
      tabIndex={withTooltip ? 0 : undefined}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border font-medium whitespace-nowrap",
        meta.bg,
        meta.text,
        meta.border,
        size === "sm" && "px-2 py-0.5 text-xs",
        size === "md" && "px-2.5 py-0.5 text-[13px]",
        size === "lg" && "px-3 py-1 text-sm",
        className,
      )}
    >
      <StatusIcon status={status} className={size === "lg" ? "size-[18px]" : undefined} />
      <span>
        <span className="sr-only">Status: </span>
        {meta.label}
      </span>
    </span>
  );
  return withTooltip ? <Tooltip content={meta.definition}>{badge}</Tooltip> : badge;
}

/** ✓ ⚠ ✕ – N/A, always paired with a text label. */
export function CheckSymbol({ result, className }: { result: CheckResult; className?: string }) {
  const meta = CHECK_RESULT_META[result];
  return (
    <span className={cn("inline-flex w-7 shrink-0 justify-center font-semibold", meta.className, result === "not_applicable" && "text-[10px] tracking-tight", className)} aria-hidden>
      {meta.symbol}
    </span>
  );
}

export function CheckCell({ result, text, tooltip }: { result: CheckResult; text?: string; tooltip?: string }) {
  const meta = CHECK_RESULT_META[result];
  const content = (
    <span className="inline-flex items-center gap-0.5 text-[13px]" tabIndex={tooltip ? 0 : undefined}>
      <CheckSymbol result={result} className="w-5" />
      <span className="sr-only">{meta.label}: </span>
      {text && <span className={cn(result === "pass" ? "text-ink/80" : meta.className)}>{text}</span>}
    </span>
  );
  return tooltip ? <Tooltip content={tooltip}>{content}</Tooltip> : content;
}
