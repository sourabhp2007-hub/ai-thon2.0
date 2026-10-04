"use client";

import Link from "next/link";
import { useDeferredValue, useMemo, useState } from "react";
import { EmptyState } from "@/components/feedback/states";
import { ResultCount, SearchField, SortSelect } from "@/components/reports/filter-toolbar";
import { ButtonLink } from "@/components/ui/button";
import { Select } from "@/components/ui/form";
import { Card, DemoBadge } from "@/components/ui/primitives";
import { EMPTY } from "@/lib/domain/copy";
import { yearOf } from "@/lib/domain/format";
import { AUTHORITY_TYPE_LABEL, TREATMENT_META } from "@/lib/domain/labels";
import type { AuthorityType, SourceListItem } from "@/lib/types/domain";

type Sort = "name" | "recent" | "cited";

function legalStatus(item: SourceListItem) {
  const a = item.authority;
  if (a.type !== "case") return "Not applicable";
  if (a.treatments.length) return a.treatments.map((t) => TREATMENT_META[t.kind].label).join(", ");
  return a.treatmentDataAvailable ? "No adverse treatment found" : "No treatment data available";
}

export function SourcesTable({ items }: { items: SourceListItem[] }) {
  const [query, setQuery] = useState("");
  const deferred = useDeferredValue(query);
  const [type, setType] = useState<AuthorityType | "all">("all");
  const [sort, setSort] = useState<Sort>("name");

  const rows = useMemo(() => {
    const q = deferred.trim().toLowerCase();
    const list = items.filter((i) => (type === "all" || i.authority.type === type) && (!q || `${i.authority.title} ${i.authority.citation}`.toLowerCase().includes(q)));
    return list.sort((a, b) => {
      if (sort === "recent") return (b.authority.decidedOn ?? "").localeCompare(a.authority.decidedOn ?? "");
      if (sort === "cited") return b.citedInClaims - a.citedInClaims;
      return a.authority.title.localeCompare(b.authority.title);
    });
  }, [items, deferred, type, sort]);

  const filtered = query.trim() !== "" || type !== "all";

  return (
    <div>
      <div className="mb-3 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-1 flex-wrap items-center gap-2">
          <SearchField value={query} onChange={setQuery} placeholder="Search sources by name or citation" />
          <label htmlFor="source-type" className="sr-only">
            Type
          </label>
          <Select id="source-type" value={type} onChange={(e) => setType(e.target.value as AuthorityType | "all")} className="w-auto">
            <option value="all">Type: All</option>
            {(Object.keys(AUTHORITY_TYPE_LABEL) as AuthorityType[]).map((t) => (
              <option key={t} value={t}>
                {AUTHORITY_TYPE_LABEL[t]}
              </option>
            ))}
          </Select>
        </div>
        <SortSelect
          value={sort}
          onChange={setSort}
          options={[
            { value: "name", label: "Name (A–Z)" },
            { value: "recent", label: "Most recent" },
            { value: "cited", label: "Most cited in reports" },
          ]}
        />
      </div>
      <div className="mb-3">
        <ResultCount
          shown={rows.length}
          total={items.length}
          noun="sources"
          filtered={filtered}
          onClear={() => {
            setQuery("");
            setType("all");
          }}
        />
      </div>
      {rows.length === 0 ? (
        <Card>
          <EmptyState body={query.trim() ? `No sources match “${query.trim()}”.` : EMPTY.filter.body} />
        </Card>
      ) : (
        <Card className="relative overflow-x-auto">
          <table className="w-full min-w-[860px] text-sm">
            <caption className="sr-only">Available sources</caption>
            <thead>
              <tr className="border-b border-border bg-canvas text-left text-xs text-muted">
                {["Authority", "Type", "Court", "Year", "Citation", "Cited in", "Legal status"].map((h) => (
                  <th key={h} scope="col" className="px-4 py-2.5 font-medium">
                    {h}
                  </th>
                ))}
                <th scope="col" className="px-4 py-2.5">
                  <span className="sr-only">Action</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((item) => {
                const a = item.authority;
                return (
                  <tr key={a.id} className="border-b border-border last:border-0 hover:bg-canvas/60">
                    <td className="px-4 py-3">
                      <Link href={`/sources/${a.id}`} className="font-serif text-[15px] font-semibold text-ink hover:text-primary hover:underline">
                        {a.title}
                      </Link>
                      {a.isDemo && <DemoBadge className="ml-2" />}
                    </td>
                    <td className="px-4 py-3 text-[13px] text-muted">{AUTHORITY_TYPE_LABEL[a.type]}</td>
                    <td className="px-4 py-3 text-[13px] text-muted">{a.court ?? "—"}</td>
                    <td className="px-4 py-3 text-[13px] text-muted tabular-nums">{yearOf(a.decidedOn) || "—"}</td>
                    <td className="px-4 py-3 font-mono text-[12.5px]">{a.citation}</td>
                    <td className="px-4 py-3 text-[13px] text-muted">{item.citedInClaims} {item.citedInClaims === 1 ? "claim" : "claims"}</td>
                    <td className="px-4 py-3 text-[13px] text-muted">{legalStatus(item)}</td>
                    <td className="px-4 py-3 text-right">
                      <ButtonLink href={`/sources/${a.id}`} variant="secondary" size="sm">
                        View Source
                      </ButtonLink>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
