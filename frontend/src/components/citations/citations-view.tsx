"use client";

import { useDeferredValue, useMemo, useState } from "react";
import { EmptyState } from "@/components/feedback/states";
import { useReport } from "@/components/reports/report-context";
import { FilterMenu, ResultCount, SearchField, SortSelect } from "@/components/reports/filter-toolbar";
import { Button } from "@/components/ui/button";
import { Card, SectionHeader } from "@/components/ui/primitives";
import { CheckCell } from "@/components/verification/status";
import { useUrlState } from "@/hooks/use-url-state";
import { EMPTY } from "@/lib/domain/copy";
import { checkLabel } from "@/lib/domain/labels";
import { AUTHORITY_FILTER_LABEL, citationAuthorityLabel, findAuthority, type AuthorityFilter } from "@/lib/domain/report";
import type { Citation, CheckKey, CitationCheck, ReportBundle } from "@/lib/types/domain";
import { cn } from "@/lib/utils/cn";

type Located = "all" | "located" | "not_located";
type CheckFilter = "any_warning" | "any_failure" | "quote_mismatch" | "year_mismatch" | "overruled" | "distinguished";
type Sort = "document" | "issues" | "authority";

const CHECK_FILTERS: { value: CheckFilter; label: string }[] = [
  { value: "any_warning", label: "Any warning" },
  { value: "any_failure", label: "Any failure" },
  { value: "quote_mismatch", label: "Quote mismatch" },
  { value: "year_mismatch", label: "Year mismatch" },
  { value: "overruled", label: "Overruled" },
  { value: "distinguished", label: "Distinguished" },
];

/** Columns shown in the table; claim support is shown under Claims. */
const COLUMNS: { key: CheckKey; label: string }[] = [
  { key: "existence", label: "Found" },
  { key: "court", label: "Court" },
  { key: "year", label: "Year" },
  { key: "reference", label: "Reference" },
  { key: "paragraph", label: "Paragraph" },
  { key: "quote", label: "Quote" },
  { key: "legal_status", label: "Legal status" },
];

const check = (c: Citation, key: CheckKey) => c.checks.find((x) => x.key === key)!;

function cellText(c: CitationCheck): string | undefined {
  switch (c.key) {
    case "existence":
      return c.result === "pass" ? "Found" : c.result === "fail" ? "Not found" : c.label === "Source not available" ? "Source not available" : undefined;
    case "year":
      return c.result === "warn" ? `${c.asCited} ≠ ${c.inSource}` : undefined;
    case "reference":
      return c.result === "warn" ? "Partial match" : undefined;
    case "paragraph":
      return c.result === "not_applicable" && c.label === "No paragraph cited" ? "No pinpoint" : undefined;
    case "quote":
      return c.result === "warn" ? "Mismatch" : undefined;
    case "legal_status":
      return c.result === "not_applicable" ? undefined : checkLabel(c);
    default:
      return undefined;
  }
}

function citationType(bundle: ReportBundle, c: Citation): AuthorityFilter {
  if (c.resolution === "source_not_available") return "tribunal_order";
  return findAuthority(bundle, c.authorityId)?.type ?? "case";
}

function matchesCheck(c: Citation, f: CheckFilter) {
  switch (f) {
    case "any_warning":
      return c.checks.some((x) => x.result === "warn");
    case "any_failure":
      return c.checks.some((x) => x.result === "fail");
    case "quote_mismatch":
      return check(c, "quote").result === "warn";
    case "year_mismatch":
      return check(c, "year").result === "warn";
    case "overruled":
      return checkLabel(check(c, "legal_status")) === "Overruled";
    case "distinguished":
      return checkLabel(check(c, "legal_status")) === "Distinguished";
  }
}

const issues = (c: Citation) => c.checks.filter((x) => x.result === "warn" || x.result === "fail").length;

/** Citations tab: existence and accuracy of each citation. */
export function CitationsView() {
  const bundle = useReport();
  const { update } = useUrlState();
  const [query, setQuery] = useState("");
  const deferred = useDeferredValue(query);
  const [located, setLocated] = useState<Located>("all");
  const [checkFilters, setCheckFilters] = useState<CheckFilter[]>([]);
  const [types, setTypes] = useState<AuthorityFilter[]>([]);
  const [sort, setSort] = useState<Sort>("document");

  const total = bundle.citations.length;
  const locatedCount = bundle.citations.filter((c) => c.resolution === "located").length;

  const rows = useMemo(() => {
    const q = deferred.trim().toLowerCase();
    const list = bundle.citations.filter((c) => {
      if (located === "located" && c.resolution !== "located") return false;
      if (located === "not_located" && c.resolution === "located") return false;
      if (types.length && !types.includes(citationType(bundle, c))) return false;
      if (checkFilters.length && !checkFilters.some((f) => matchesCheck(c, f))) return false;
      if (q && !`${c.rawText} ${citationAuthorityLabel(bundle, c)}`.toLowerCase().includes(q)) return false;
      return true;
    });
    if (sort === "issues") list.sort((a, b) => issues(b) - issues(a) || a.index - b.index);
    if (sort === "authority") list.sort((a, b) => citationAuthorityLabel(bundle, a).localeCompare(citationAuthorityLabel(bundle, b)));
    return list;
  }, [bundle, deferred, located, types, checkFilters, sort]);

  const filtered = query.trim() !== "" || located !== "all" || checkFilters.length > 0 || types.length > 0;
  const clear = () => {
    setQuery("");
    setLocated("all");
    setCheckFilters([]);
    setTypes([]);
  };

  return (
    <section aria-labelledby="citations-heading">
      <SectionHeader id="citations-heading" title="Citations" subtitle="Each citation in the document, checked for existence and accuracy against available sources." />
      <p className="mb-4 text-sm text-ink">
        <span className="font-semibold">{total} citations</span> · {locatedCount} located · {total - locatedCount} could not be located
      </p>

      <div className="mb-4 space-y-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-1 flex-wrap items-center gap-2">
            <SearchField value={query} onChange={setQuery} placeholder="Search citations" />
            <FilterMenu
              groups={[
                { label: "Check result", options: CHECK_FILTERS, selected: checkFilters, onChange: (v) => setCheckFilters(v as CheckFilter[]) },
                {
                  label: "Authority type",
                  options: (Object.keys(AUTHORITY_FILTER_LABEL) as AuthorityFilter[]).filter((t) => t !== "none").map((v) => ({ value: v, label: AUTHORITY_FILTER_LABEL[v] })),
                  selected: types,
                  onChange: (v) => setTypes(v as AuthorityFilter[]),
                },
              ]}
            />
          </div>
          <SortSelect
            value={sort}
            onChange={setSort}
            options={[
              { value: "document", label: "Document order" },
              { value: "issues", label: "Most issues first" },
              { value: "authority", label: "Authority (A–Z)" },
            ]}
          />
        </div>
        <div role="group" aria-label="Located" className="flex flex-wrap gap-2">
          {(["all", "located", "not_located"] as const).map((v) => (
            <button
              key={v}
              type="button"
              aria-pressed={located === v}
              onClick={() => setLocated(v)}
              className={cn(
                "h-8 rounded-full border px-3 text-[13px] font-medium",
                located === v ? "border-white bg-white text-black" : "border-border-strong bg-surface text-ink hover:border-ink/40",
              )}
            >
              {v === "all" ? "All" : v === "located" ? "Located" : "Not located"}
            </button>
          ))}
        </div>
        <ResultCount shown={rows.length} total={total} noun="citations" filtered={filtered} onClear={clear} />
        <p className="text-xs text-muted">✓ Pass · ⚠ Warning · ✕ Fail · – Not checked · N/A Not applicable</p>
      </div>

      {rows.length === 0 ? (
        <Card>
          <EmptyState title={EMPTY.filter.title} body={EMPTY.filter.body} action={<Button variant="secondary" onClick={clear}>Clear filters</Button>} />
        </Card>
      ) : (
        <Card className="relative overflow-x-auto">
          <table className="w-full min-w-[1080px] text-sm">
            <caption className="sr-only">Citations in this report and their checks</caption>
            <thead>
              <tr className="border-b border-border bg-canvas text-left text-xs text-muted">
                <th scope="col" className="sticky left-0 z-10 bg-canvas px-4 py-2.5 font-medium">#</th>
                <th scope="col" className="sticky left-12 z-10 bg-canvas px-3 py-2.5 font-medium">Citation as written</th>
                <th scope="col" className="px-3 py-2.5 font-medium">Claim</th>
                {COLUMNS.map((col) => (
                  <th key={col.key} scope="col" className="px-3 py-2.5 font-medium">
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((c) => {
                const claim = bundle.claims.find((x) => x.id === c.claimId)!;
                return (
                  <tr key={c.id} onClick={() => update({ citation: String(c.index) }, { push: true })} className="group cursor-pointer border-b border-border align-top last:border-0 hover:bg-canvas">
                    <td className="sticky left-0 bg-surface px-4 py-3 font-mono text-[13px] text-muted group-hover:bg-canvas">{c.index}</td>
                    <td className="sticky left-12 max-w-72 bg-surface px-3 py-3 group-hover:bg-canvas">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          update({ citation: String(c.index) }, { push: true });
                        }}
                        aria-label={`View details for citation ${c.index}: ${c.rawText}`}
                        className="text-left font-mono text-[12.5px] leading-relaxed text-ink hover:text-primary"
                      >
                        {c.rawText}
                      </button>
                    </td>
                    <td className="px-3 py-3 text-[13px] text-muted">{claim.index}</td>
                    {COLUMNS.map((col) => {
                      const k = check(c, col.key);
                      return (
                        <td key={col.key} className="px-3 py-3" onClick={(e) => k.note && e.stopPropagation()}>
                          <CheckCell result={k.result} text={cellText(k)} tooltip={k.note} />
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      )}
    </section>
  );
}
