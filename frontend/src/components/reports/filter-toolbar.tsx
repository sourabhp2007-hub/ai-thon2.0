"use client";

import * as Dropdown from "@radix-ui/react-dropdown-menu";
import { Check, ChevronDown, Search, SlidersHorizontal } from "lucide-react";
import { forwardRef, type ReactNode } from "react";
import { Kbd } from "@/components/ui/primitives";
import { StatusIcon } from "@/components/verification/status";
import { STATUS_META, STATUS_ORDER } from "@/lib/domain/status";
import type { StatusCounts, VerificationStatus } from "@/lib/types/domain";
import { cn } from "@/lib/utils/cn";

export const SearchField = forwardRef<HTMLInputElement, { value: string; onChange: (v: string) => void; placeholder: string; shortcut?: string }>(
  function SearchField({ value, onChange, placeholder, shortcut }, ref) {
    return (
      <div className="relative w-full sm:max-w-xs">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-subtle" aria-hidden />
        <input
          ref={ref}
          type="search"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          aria-label={placeholder}
          className="h-9 w-full rounded-control border border-border-strong bg-surface pr-9 pl-9 text-sm placeholder:text-subtle focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none"
        />
        {shortcut && !value && (
          <span className="pointer-events-none absolute top-1/2 right-2.5 hidden -translate-y-1/2 sm:block">
            <Kbd>{shortcut}</Kbd>
          </span>
        )}
      </div>
    );
  },
);

/** Multi-select status chips with counts; horizontally scrollable on mobile. */
export function StatusChips({
  counts,
  total,
  selected,
  onChange,
}: {
  counts: StatusCounts;
  total: number;
  selected: VerificationStatus[];
  onChange: (next: VerificationStatus[]) => void;
}) {
  const chip = (active: boolean) =>
    cn(
      "inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full border px-3 text-[13px] font-medium transition-colors",
      active ? "border-white bg-white text-black" : "border-border-strong bg-surface text-ink hover:border-ink/40",
    );
  return (
    <div role="group" aria-label="Filter by status" className="relative scrollbar-none -mx-4 flex gap-2 overflow-x-auto px-4 md:mx-0 md:flex-wrap md:px-0">
      <button type="button" aria-pressed={selected.length === 0} onClick={() => onChange([])} className={chip(selected.length === 0)}>
        All <span className="tabular-nums opacity-70">{total}</span>
      </button>
      {STATUS_ORDER.map((s) => {
        const active = selected.includes(s);
        return (
          <button
            key={s}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(active ? selected.filter((x) => x !== s) : [...selected, s])}
            className={chip(active)}
          >
            <StatusIcon status={s} className={cn("size-3.5", active && "text-black")} />
            {STATUS_META[s].label} <span className="tabular-nums opacity-70">{counts[s]}</span>
          </button>
        );
      })}
    </div>
  );
}

export interface FilterGroup<T extends string> {
  label: string;
  options: { value: T; label: string }[];
  selected: T[];
  onChange: (next: T[]) => void;
}

/** "Filters" dropdown with checkbox groups. */
export function FilterMenu({ groups }: { groups: FilterGroup<string>[] }) {
  const activeCount = groups.reduce((n, g) => n + g.selected.length, 0);
  return (
    <Dropdown.Root>
      <Dropdown.Trigger asChild>
        <button
          type="button"
          className="inline-flex h-9 items-center gap-2 rounded-control border border-border-strong bg-surface px-3 text-sm text-ink hover:bg-canvas"
        >
          <SlidersHorizontal className="size-4 text-muted" aria-hidden />
          Filters
          {activeCount > 0 && <span className="rounded-full bg-white px-1.5 text-xs text-black tabular-nums">{activeCount}</span>}
          <ChevronDown className="size-3.5 text-muted" aria-hidden />
        </button>
      </Dropdown.Trigger>
      <Dropdown.Portal>
        <Dropdown.Content align="start" sideOffset={6} className="z-[60] max-h-[70vh] min-w-60 overflow-y-auto rounded-card border border-border bg-surface p-1 shadow-xl">
          {groups.map((group, gi) => (
            <Dropdown.Group key={group.label}>
              {gi > 0 && <Dropdown.Separator className="my-1 h-px bg-border" />}
              <Dropdown.Label className="px-2.5 py-1.5 text-xs font-semibold text-muted">{group.label}</Dropdown.Label>
              {group.options.map((option) => (
                <Dropdown.CheckboxItem
                  key={option.value}
                  checked={group.selected.includes(option.value)}
                  onSelect={(e) => e.preventDefault()}
                  onCheckedChange={(checked) =>
                    group.onChange(checked ? [...group.selected, option.value] : group.selected.filter((v) => v !== option.value))
                  }
                  className="flex cursor-pointer items-center gap-2 rounded-md px-2.5 py-1.5 text-sm text-ink outline-none data-[highlighted]:bg-canvas"
                >
                  <span className="flex size-4 items-center justify-center rounded border border-border-strong data-[state=checked]:border-primary">
                    <Dropdown.ItemIndicator>
                      <Check className="size-3 text-primary" aria-hidden />
                    </Dropdown.ItemIndicator>
                  </span>
                  {option.label}
                </Dropdown.CheckboxItem>
              ))}
            </Dropdown.Group>
          ))}
        </Dropdown.Content>
      </Dropdown.Portal>
    </Dropdown.Root>
  );
}

export function SortSelect<T extends string>({ value, options, onChange }: { value: T; options: { value: T; label: string }[]; onChange: (v: T) => void }) {
  return (
    <label className="flex items-center gap-2 text-[13px] text-muted">
      Sort by
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as T)}
        className="h-9 rounded-control border border-border-strong bg-surface px-2 text-sm text-ink focus:border-primary focus:outline-none"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

export function ResultCount({ shown, total, noun, onClear, filtered }: { shown: number; total: number; noun: string; onClear: () => void; filtered: boolean }): ReactNode {
  return (
    <p className="text-[13px] text-muted" aria-live="polite">
      Showing {shown} of {total} {noun}
      {filtered && (
        <>
          {" · "}
          <button type="button" onClick={onClear} className="font-medium text-primary hover:underline">
            Clear filters
          </button>
        </>
      )}
    </p>
  );
}
