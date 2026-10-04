"use client";

import * as RadixDialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

/** Centered modal (Export, confirmations). */
export function Modal({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  className,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: ReactNode;
  children?: ReactNode;
  footer?: ReactNode;
  className?: string;
}) {
  return (
    <RadixDialog.Root open={open} onOpenChange={onOpenChange}>
      <RadixDialog.Portal>
        <RadixDialog.Overlay className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm" />
        <RadixDialog.Content
          className={cn(
            "fixed top-1/2 left-1/2 z-50 flex max-h-[90dvh] w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 flex-col rounded-sheet bg-surface shadow-2xl",
            className,
          )}
        >
          <div className="flex items-start justify-between gap-4 border-b border-border px-5 py-4">
            <div>
              <RadixDialog.Title className="text-[17px] font-semibold text-ink">{title}</RadixDialog.Title>
              {description ? (
                <RadixDialog.Description className="mt-1 text-sm text-muted">{description}</RadixDialog.Description>
              ) : (
                <RadixDialog.Description className="sr-only">{title}</RadixDialog.Description>
              )}
            </div>
            <RadixDialog.Close aria-label="Close" className="rounded-md p-1 text-muted hover:bg-ink/5 hover:text-ink">
              <X className="size-4" aria-hidden />
            </RadixDialog.Close>
          </div>
          {children && <div className="overflow-y-auto px-5 py-4">{children}</div>}
          {footer && <div className="flex flex-wrap justify-end gap-2 border-t border-border px-5 py-3">{footer}</div>}
        </RadixDialog.Content>
      </RadixDialog.Portal>
    </RadixDialog.Root>
  );
}

/**
 * Side drawer on desktop, bottom sheet below the md breakpoint.
 * Header content is supplied by the caller so it can hold navigation.
 */
export function Sheet({
  open,
  onOpenChange,
  title,
  header,
  children,
  widthClass = "md:max-w-[640px]",
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  header: ReactNode;
  children: ReactNode;
  widthClass?: string;
}) {
  return (
    <RadixDialog.Root open={open} onOpenChange={onOpenChange}>
      <RadixDialog.Portal>
        <RadixDialog.Overlay className="fixed inset-0 z-40 bg-black/50" />
        <RadixDialog.Content
          aria-describedby={undefined}
          tabIndex={-1}
          onOpenAutoFocus={(e) => {
            // Focus the panel itself rather than its first control, so tooltips don't open on load.
            e.preventDefault();
            (e.currentTarget as HTMLElement | null)?.focus();
          }}
          className={cn(
            "fixed z-40 flex flex-col bg-surface shadow-2xl outline-none",
            "inset-x-0 bottom-0 max-h-[92dvh] rounded-t-sheet",
            "md:inset-y-0 md:right-0 md:left-auto md:max-h-none md:w-full md:rounded-none md:border-l md:border-border",
            "motion-safe:animate-[sheet-up_220ms_ease-out] md:motion-safe:animate-[sheet-left_220ms_ease-out]",
            widthClass,
          )}
        >
          <RadixDialog.Title className="sr-only">{title}</RadixDialog.Title>
          <div className="mx-auto mt-2 h-1 w-10 rounded-full bg-border-strong md:hidden" aria-hidden />
          {header}
          <div className="flex-1 overflow-y-auto overscroll-contain">{children}</div>
        </RadixDialog.Content>
      </RadixDialog.Portal>
    </RadixDialog.Root>
  );
}

export const DialogClose = RadixDialog.Close;
