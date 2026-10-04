"use client";

import * as RadixTooltip from "@radix-ui/react-tooltip";
import type { ReactNode } from "react";

export function TooltipProvider({ children }: { children: ReactNode }) {
  return (
    <RadixTooltip.Provider delayDuration={250} skipDelayDuration={100}>
      {children}
    </RadixTooltip.Provider>
  );
}

/**
 * Tooltip for supplementary text. The trigger must already have an
 * accessible name; tooltip text is also exposed via aria-describedby.
 */
export function Tooltip({
  content,
  children,
  side = "top",
}: {
  content: ReactNode;
  children: ReactNode;
  side?: "top" | "right" | "bottom" | "left";
}) {
  return (
    <RadixTooltip.Root>
      <RadixTooltip.Trigger asChild>{children}</RadixTooltip.Trigger>
      <RadixTooltip.Portal>
        <RadixTooltip.Content
          side={side}
          sideOffset={6}
          collisionPadding={12}
          className="z-[70] max-w-xs rounded-md border border-white/10 bg-raised px-2.5 py-1.5 text-xs leading-relaxed text-white shadow-lg"
        >
          {content}
          <RadixTooltip.Arrow className="fill-navy-950" />
        </RadixTooltip.Content>
      </RadixTooltip.Portal>
    </RadixTooltip.Root>
  );
}

/** Small "i" trigger for definitions next to labels. */
export function InfoTip({ content, label }: { content: ReactNode; label: string }) {
  return (
    <Tooltip content={content}>
      <button
        type="button"
        aria-label={label}
        className="inline-flex size-4 items-center justify-center rounded-full border border-border-strong text-[10px] font-semibold text-muted hover:text-ink"
      >
        i
      </button>
    </Tooltip>
  );
}
