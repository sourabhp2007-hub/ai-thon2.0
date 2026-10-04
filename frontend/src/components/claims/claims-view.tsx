"use client";

import { useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { EmptyState } from "@/components/feedback/states";
import { useReport } from "@/components/reports/report-context";
import { FilterMenu, ResultCount, SearchField, SortSelect, StatusChips } from "@/components/reports/filter-toolbar";
import { Button } from "@/components/ui/button";
import { Card, SectionHeader } from "@/components/ui/primitives";
import { Tooltip } from "@/components/ui/tooltip";
import { StatusBadge } from "@/components/verification/status";
import { useUrlState } from "@/hooks/use-url-state";
import { EMPTY } from "@/lib/domain/copy";
import { FLAG_META, FLAG_ORDER } from "@/lib/domain/labels";
import { AUTHORITY_FILTER_LABEL, claimAuthorityLabel, claimAuthorityTypes, claimEvidenceSummary, type AuthorityFilter } from "@/lib/domain/report";
import { isStatus, STATUS_SEVERITY } from "@/lib/domain/status";
import { countStatuses } from "@/lib/domain/summary";
import type { Claim, ClaimFlag, VerificationStatus } from "@/lib/types/domain";

type Sort = "document" | "severity" | "authority";

const SORT_OPTIONS: { value: Sort; label: string }[] = [
  { value: "document", label: "Document order" },
  { value: "severity", label: "Most serious first" },
  { value: "authority", label: "Authority (A–Z)" },
];

export function FlagList({ flags }: { flags: ClaimFlag[] }) {
  if (flags.length === 0) return <span className="text-subtle">—</span>;
  return (
    <ul className="flex flex-wrap gap-1">
      {flags.map((f) => (
        <li key={f}>
          <Tooltip content={FLAG_META[f].tooltip}>
            <span tabIndex={0} className="inline-flex rounded border border-border bg-canvas px-1.5 py-0.5 text-[11.5px] whitespace-nowrap text-ink/80">
              {FLAG_META[f].label}
            </span>
          </Tooltip>
        </li>
      ))}
    </ul>
  );
}

export function parseStatuses(value: string | null): VerificationStatus[] {
  return (value ?? "").split(",").filter(isStatus);
}

/** Claims tab (Claims View): the report body. */
export function ClaimsView() {
  const bundle = useReport();
  const { searchParams, update } = useUrlState();
  const statuses = parseStatuses(searchParams.get("status"));
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);
  const [types, setTypes] = useState<AuthorityFilter[]>([]);
  const [flags, setFlags] = useState<ClaimFlag[]>([]);
  const [sort, setSort] = useState<Sort>("document");
  const searchRef = useRef<HTMLInputElement>(null);

  // "/" focuses claim search (spec keyboard shortcuts).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (e.key !== "/" || target.closest("input, textarea, select, [role=dialog]")) return;
      e.preventDefault();
      searchRef.current?.focus();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const rows = useMemo(() => {
    const q = deferredQuery.trim().toLowerCase();
    const filtered = bundle.claims.filter((c) => {
      if (statuses.length && !statuses.includes(c.status)) return false;
      if (types.length && !claimAuthorityTypes(bundle, c).some((t) => types.includes(t))) return false;
      if (flags.length && !c.flags.some((f) => flags.includes(f))) return false;
      if (q && !`${c.text} ${claimAuthorityLabel(bundle, c)}`.toLowerCase().includes(q)) return false;
      return true;
    });
    const sorted = [...filtered];
    if (sort === "severity") sorted.sort((a, b) => STATUS_SEVERITY[a.status] - STATUS_SEVERITY[b.status] || a.index - b.index);
    if (sort === "authority") sorted.sort((a, b) => claimAuthorityLabel(bundle, a).localeCompare(claimAuthorityLabel(bundle, b)));
    return sorted;
  }, [bundle, statuses, types, flags, deferredQuery, sort]);

  const counts = useMemo(() => countStatuses(bundle.claims), [bundle.claims]);
  const filtered = statuses.length > 0 || types.length > 0 || flags.length > 0 || query.trim() !== "";
  const clearAll = () => {
    setQuery("");
    setTypes([]);
    setFlags([]);
    update({ status: null });
  };
  const open = (claim: Claim) => update({ claim: String(claim.index) }, { push: true });

  if (bundle.claims.length === 0) {
    return (
      <Card>
        <EmptyState title={EMPTY.claims.title} body={EMPTY.claims.body} />
      </Card>
    );
  }

  return (
    <section aria-labelledby="claims-heading">
      <SectionHeader
        id="claims-heading"
        title="Claims"
        subtitle="Each proposition of law identified in the document, with its authority, evidence and status. Select a claim to see the full verification."
      />
      <div className="mb-4 space-y-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-1 items-center gap-2">
            <SearchField ref={searchRef} value={query} onChange={setQuery} placeholder="Search claims or authorities" shortcut="/" />
            <FilterMenu
              groups={[
                {
                  label: "Authority type",
                  options: (Object.keys(AUTHORITY_FILTER_LABEL) as AuthorityFilter[]).map((v) => ({ value: v, label: AUTHORITY_FILTER_LABEL[v] })),
                  selected: types,
                  onChange: (v) => setTypes(v as AuthorityFilter[]),
                },
                {
                  label: "Flags",
                  options: FLAG_ORDER.filter((f) => f !== "contradicting_authority").map((f) => ({ value: f, label: FLAG_META[f].label })),
                  selected: flags,
                  onChange: (v) => setFlags(v as ClaimFlag[]),
                },
              ]}
            />
          </div>
          <SortSelect value={sort} options={SORT_OPTIONS} onChange={setSort} />
        </div>
        <StatusChips counts={counts} total={bundle.claims.length} selected={statuses} onChange={(next) => update({ status: next.length ? next.join(",") : null })} />
        <ResultCount shown={rows.length} total={bundle.claims.length} noun="claims" filtered={filtered} onClear={clearAll} />
      </div>

      {rows.length === 0 ? (
        <Card>
          <EmptyState title={EMPTY.filter.title} body={EMPTY.filter.body} action={<Button variant="secondary" onClick={clearAll}>Clear filters</Button>} />
        </Card>
      ) : (
        <>
          <Card className="hidden overflow-hidden md:block">
            <table className="w-full table-fixed text-sm">
              <caption className="sr-only">Claims in this report</caption>
              <colgroup>
                <col className="w-12" />
                <col />
                <col className="w-[22%]" />
                <col className="w-44" />
                <col className="w-36 max-lg:hidden" />
                <col className="w-44 max-lg:hidden" />
              </colgroup>
              <thead>
                <tr className="border-b border-border bg-canvas text-left text-xs text-muted">
                  <th scope="col" className="px-4 py-2.5 font-medium">#</th>
                  <th scope="col" className="px-3 py-2.5 font-medium">Claim / Proposition</th>
                  <th scope="col" className="px-3 py-2.5 font-medium">Authority</th>
                  <th scope="col" className="px-3 py-2.5 font-medium">Status</th>
                  <th scope="col" className="px-3 py-2.5 font-medium max-lg:hidden">Evidence</th>
                  <th scope="col" className="px-3 py-2.5 font-medium max-lg:hidden">Flags</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((claim) => (
                  <tr key={claim.id} onClick={() => open(claim)} className="cursor-pointer border-b border-border align-top last:border-0 hover:bg-canvas/70">
                    <td className="px-4 py-3 font-mono text-[13px] text-muted tabular-nums">{claim.index}</td>
                    <td className="px-3 py-3">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          open(claim);
                        }}
                        aria-label={`View details for claim ${claim.index}`}
                        className="line-clamp-2 text-left text-ink hover:text-primary"
                      >
                        {claim.text}
                      </button>
                      <div className="mt-1.5 text-xs text-muted lg:hidden">
                        {claimEvidenceSummary(bundle, claim)}
                        {claim.flags.length > 0 && <> · {claim.flags.map((f) => FLAG_META[f].label).join(", ")}</>}
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      <span className="line-clamp-3 font-mono text-[12px] leading-relaxed text-ink/80">{claimAuthorityLabel(bundle, claim)}</span>
                    </td>
                    <td className="px-3 py-3" onClick={(e) => e.stopPropagation()}>
                      <StatusBadge status={claim.status} size="sm" />
                    </td>
                    <td className="px-3 py-3 text-[13px] text-muted max-lg:hidden">{claimEvidenceSummary(bundle, claim)}</td>
                    <td className="px-3 py-3 max-lg:hidden" onClick={(e) => e.stopPropagation()}>
                      <FlagList flags={claim.flags} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>

          <ul className="space-y-3 md:hidden">
            {rows.map((claim) => (
              <li key={claim.id}>
                <button type="button" onClick={() => open(claim)} className="w-full rounded-card border border-border bg-surface p-4 text-left" aria-label={`View details for claim ${claim.index}`}>
                  <span className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-muted">Claim {claim.index}</span>
                    <StatusBadge status={claim.status} size="sm" withTooltip={false} />
                  </span>
                  <span className="mt-2 line-clamp-3 block text-sm text-ink">{claim.text}</span>
                  <span className="mt-2 block font-mono text-[11.5px] text-ink/70">{claimAuthorityLabel(bundle, claim)}</span>
                  <span className="mt-1 block text-xs text-muted">
                    {claimEvidenceSummary(bundle, claim)}
                    {claim.flags.length > 0 && <> · {claim.flags.map((f) => FLAG_META[f].label).join(", ")}</>}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
