"use client";

import * as Dropdown from "@radix-ui/react-dropdown-menu";
import { MoreHorizontal } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

export interface MenuItem {
  label: string;
  onSelect: () => void;
  destructive?: boolean;
}

/** Overflow ("More actions") menu. */
export function OverflowMenu({ label, items, trigger }: { label: string; items: MenuItem[]; trigger?: ReactNode }) {
  return (
    <Dropdown.Root>
      <Dropdown.Trigger asChild>
        {trigger ?? (
          <button
            type="button"
            aria-label={label}
            className="inline-flex size-9 items-center justify-center rounded-control border border-border-strong bg-surface text-muted hover:text-ink"
          >
            <MoreHorizontal className="size-4" aria-hidden />
          </button>
        )}
      </Dropdown.Trigger>
      <Dropdown.Portal>
        <Dropdown.Content
          align="end"
          sideOffset={6}
          className="z-[60] min-w-44 rounded-card border border-border bg-surface p-1 shadow-xl"
        >
          {items.map((item) => (
            <Dropdown.Item
              key={item.label}
              onSelect={item.onSelect}
              className={cn(
                "cursor-pointer rounded-md px-2.5 py-1.5 text-sm outline-none data-[highlighted]:bg-canvas",
                item.destructive ? "text-unsupported" : "text-ink",
              )}
            >
              {item.label}
            </Dropdown.Item>
          ))}
        </Dropdown.Content>
      </Dropdown.Portal>
    </Dropdown.Root>
  );
}
