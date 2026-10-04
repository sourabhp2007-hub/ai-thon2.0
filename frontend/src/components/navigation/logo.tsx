import { PRODUCT_SHORT_NAME } from "@/lib/domain/copy";
import { cn } from "@/lib/utils/cn";

/** Wordmark: a claim bracket enclosing a check — verification of a claim. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 28 28" className={cn("size-7 shrink-0", className)} aria-hidden>
      <rect width="28" height="28" rx="7" fill="#fff" />
      <path d="M10 7H7.5v14H10M18 7h2.5v14H18" fill="none" stroke="#000" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="m10.8 14.2 2.3 2.3 4.2-4.6" fill="none" stroke="#2f8fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function Wordmark({ collapsed = false, tone = "dark" }: { collapsed?: boolean; tone?: "dark" | "light" }) {
  return (
    <span className="flex items-center gap-2.5">
      <LogoMark />
      {!collapsed && (
        <span className={cn("text-[15px] font-semibold tracking-tight max-[400px]:sr-only", tone === "dark" ? "text-white" : "text-ink")}>{PRODUCT_SHORT_NAME}</span>
      )}
    </span>
  );
}
