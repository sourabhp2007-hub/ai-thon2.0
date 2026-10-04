"use client";

import * as RadixDialog from "@radix-ui/react-dialog";
import { BookOpen, FileText, Quote, Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Kbd } from "@/components/ui/primitives";
import type { SearchEntry } from "@/lib/types/domain";
import { cn } from "@/lib/utils/cn";

const KIND_ICON = { report: FileText, claim: Quote, authority: BookOpen };
const KIND_LABEL = { report: "Reports", claim: "Claims", authority: "Authorities" };

/** ⌘K search across reports, claims and authorities in the workspace (D-19). */
export function GlobalSearch({ index }: { index: SearchEntry[] }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const router = useRouter();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return index.filter((e) => e.label.toLowerCase().includes(q) || e.detail.toLowerCase().includes(q)).slice(0, 12);
  }, [index, query]);

  const go = (entry: SearchEntry) => {
    setOpen(false);
    setQuery("");
    router.push(entry.href);
  };

  return (
    <RadixDialog.Root
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) setQuery("");
      }}
    >
      <RadixDialog.Trigger asChild>
        <button
          type="button"
          className="flex h-9 w-full max-w-md items-center gap-2 rounded-control border border-border bg-canvas px-3 text-left text-sm text-subtle hover:border-border-strong"
        >
          <Search className="size-4" aria-hidden />
          <span className="flex-1 truncate">Search reports, claims and authorities</span>
          <span className="hidden sm:inline">
            <Kbd>⌘K</Kbd>
          </span>
        </button>
      </RadixDialog.Trigger>
      <RadixDialog.Portal>
        <RadixDialog.Overlay className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm" />
        <RadixDialog.Content
          aria-describedby={undefined}
          className="fixed top-[12vh] left-1/2 z-50 w-[calc(100%-2rem)] max-w-xl -translate-x-1/2 overflow-hidden rounded-sheet bg-surface shadow-2xl"
        >
          <RadixDialog.Title className="sr-only">Global search</RadixDialog.Title>
          <div className="flex items-center gap-2 border-b border-border px-4">
            <Search className="size-4 text-muted" aria-hidden />
            <input
              autoFocus
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setActive(0);
              }}
              onKeyDown={(e) => {
                if (e.key === "ArrowDown") {
                  e.preventDefault();
                  setActive((a) => Math.min(a + 1, results.length - 1));
                } else if (e.key === "ArrowUp") {
                  e.preventDefault();
                  setActive((a) => Math.max(a - 1, 0));
                } else if (e.key === "Enter" && results[active]) {
                  go(results[active]);
                }
              }}
              placeholder="Search reports, claims and authorities"
              aria-label="Search reports, claims and authorities"
              aria-controls="global-search-results"
              aria-activedescendant={results[active] ? `gs-${active}` : undefined}
              role="combobox"
              aria-expanded={results.length > 0}
              className="h-12 flex-1 bg-transparent text-[15px] text-ink outline-none placeholder:text-subtle"
            />
            <Kbd>Esc</Kbd>
          </div>
          <div className="max-h-[50vh] overflow-y-auto p-2">
            {query.trim() && results.length === 0 && <p className="px-3 py-6 text-center text-sm text-muted">No results for “{query.trim()}”.</p>}
            {!query.trim() && <p className="px-3 py-6 text-center text-sm text-muted">Type to search document names, claim text and authorities.</p>}
            <ul id="global-search-results" role="listbox" aria-label="Search results">
              {results.map((entry, i) => {
                const Icon = KIND_ICON[entry.kind];
                return (
                  <li
                    key={`${entry.href}-${i}`}
                    id={`gs-${i}`}
                    role="option"
                    aria-selected={i === active}
                    onMouseEnter={() => setActive(i)}
                    onClick={() => go(entry)}
                    className={cn("flex cursor-pointer items-start gap-3 rounded-md px-3 py-2", i === active && "bg-canvas")}
                  >
                    <Icon className="mt-0.5 size-4 shrink-0 text-muted" aria-hidden />
                    <span className="min-w-0">
                      <span className="line-clamp-1 text-sm text-ink">{entry.label}</span>
                      <span className="line-clamp-1 text-xs text-muted">
                        {KIND_LABEL[entry.kind]} · {entry.detail}
                      </span>
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        </RadixDialog.Content>
      </RadixDialog.Portal>
    </RadixDialog.Root>
  );
}
