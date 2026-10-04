"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useDeferredValue, useMemo, useState } from "react";
import { EmptyState } from "@/components/feedback/states";
import { ButtonLink } from "@/components/ui/button";
import { Select } from "@/components/ui/form";
import { OverflowMenu } from "@/components/ui/menu";
import { Card, DemoBadge } from "@/components/ui/primitives";
import { Tooltip } from "@/components/ui/tooltip";
import { StatusBreakdownBar } from "@/components/verification/overview";
import { EMPTY, TT_COVERAGE, TT_FULL_COVERAGE } from "@/lib/domain/copy";
import { formatDate } from "@/lib/domain/format";
import { DOCUMENT_TYPE_LABEL, DOCUMENT_TYPES, REPORT_STATE_LABEL } from "@/lib/domain/labels";
import { summarize } from "@/lib/domain/summary";
import type { DocumentType, ReportListItem, ReportState } from "@/lib/types/domain";
import { DocumentCard } from "./document-card";
import { ResultCount, SearchField, SortSelect } from "./filter-toolbar";
import { RetryVerificationButton } from "./report-actions";
import { ReportStateBadge } from "./report-state";

type Sort = "recent" | "oldest" | "claims" | "coverage";
const STATES: ReportState[] = ["complete", "processing", "failed", "cancelled"];

function dateLabel(item: ReportListItem) {
  if (item.report.state === "complete" && item.report.verifiedAt) return `Verified ${formatDate(item.report.verifiedAt)}`;
  if (item.report.state === "processing") return `Started ${formatDate(item.document.uploadedAt)}`;
  return formatDate(item.document.uploadedAt);
}

/** Reports list with search, filters and sort (spec §3.13). */
export function ReportsTable({ items }: { items: ReportListItem[] }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const deferred = useDeferredValue(query);
  const [state, setState] = useState<ReportState | "all">("all");
  const [type, setType] = useState<DocumentType | "all">("all");
  const [sort, setSort] = useState<Sort>("recent");

  const rows = useMemo(() => {
    const q = deferred.trim().toLowerCase();
    const list = items.filter(
      (i) => (state === "all" || i.report.state === state) && (type === "all" || i.document.type === type) && (!q || i.document.name.toLowerCase().includes(q)),
    );
    const total = (i: ReportListItem) => (i.statusCounts ? summarize(i.statusCounts).total : -1);
    const coverage = (i: ReportListItem) => (i.statusCounts ? summarize(i.statusCounts).coverage : 101);
    return list.sort((a, b) => {
      if (sort === "oldest") return a.document.uploadedAt.localeCompare(b.document.uploadedAt);
      if (sort === "claims") return total(b) - total(a);
      if (sort === "coverage") return coverage(a) - coverage(b);
      return b.document.uploadedAt.localeCompare(a.document.uploadedAt);
    });
  }, [items, deferred, state, type, sort]);

  const filtered = query.trim() !== "" || state !== "all" || type !== "all";
  const clear = () => {
    setQuery("");
    setState("all");
    setType("all");
  };

  if (items.length === 0) {
    return (
      <Card>
        <EmptyState title={EMPTY.reports.title} body={EMPTY.reports.body} action={<ButtonLink href="/verify/new">New Verification</ButtonLink>} />
      </Card>
    );
  }

  return (
    <div>
      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-1 flex-wrap items-center gap-2">
          <SearchField value={query} onChange={setQuery} placeholder="Search by document name" />
          <label className="sr-only" htmlFor="filter-state">
            Report state
          </label>
          <Select id="filter-state" value={state} onChange={(e) => setState(e.target.value as ReportState | "all")} className="w-auto">
            <option value="all">Report state: All</option>
            {STATES.map((s) => (
              <option key={s} value={s}>
                {REPORT_STATE_LABEL[s]}
              </option>
            ))}
          </Select>
          <label className="sr-only" htmlFor="filter-type">
            Document type
          </label>
          <Select id="filter-type" value={type} onChange={(e) => setType(e.target.value as DocumentType | "all")} className="w-auto">
            <option value="all">All types</option>
            {DOCUMENT_TYPES.map((t) => (
              <option key={t} value={t}>
                {DOCUMENT_TYPE_LABEL[t]}
              </option>
            ))}
          </Select>
        </div>
        <SortSelect
          value={sort}
          onChange={setSort}
          options={[
            { value: "recent", label: "Most recent" },
            { value: "oldest", label: "Oldest" },
            { value: "claims", label: "Most claims" },
            { value: "coverage", label: "Lowest coverage" },
          ]}
        />
      </div>
      <div className="mb-3">
        <ResultCount shown={rows.length} total={items.length} noun="reports" filtered={filtered} onClear={clear} />
      </div>

      {rows.length === 0 ? (
        <Card>
          <EmptyState title={EMPTY.filter.title} body={EMPTY.filter.body} />
        </Card>
      ) : (
        <>
          <Card className="relative hidden overflow-x-auto md:block">
            <table className="w-full min-w-[920px] text-sm">
              <caption className="sr-only">Reports</caption>
              <thead>
                <tr className="border-b border-border bg-canvas text-left text-xs text-muted">
                  {["Document", "Type", "Claims", "Status breakdown", "Coverage", "Date", "State"].map((h) => (
                    <th key={h} scope="col" className="px-4 py-2.5 font-medium">
                      {h}
                    </th>
                  ))}
                  <th scope="col" className="px-4 py-2.5">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((item) => {
                  const { report, document, statusCounts } = item;
                  const s = statusCounts ? summarize(statusCounts) : null;
                  return (
                    <tr key={report.id} className="border-b border-border last:border-0 hover:bg-canvas/60">
                      <td className="max-w-72 px-4 py-3">
                        <Link
                          href={report.state === "complete" ? `/reports/${report.id}` : `/verify/${report.jobId}`}
                          className="font-medium text-ink hover:text-primary hover:underline"
                        >
                          {document.name}
                        </Link>
                        {document.isDemo && <DemoBadge className="mt-1 block w-fit" />}
                      </td>
                      <td className="px-4 py-3 text-[13px] text-muted">{DOCUMENT_TYPE_LABEL[document.type]}</td>
                      <td className="px-4 py-3 tabular-nums">{s ? s.total : "—"}</td>
                      <td className="w-40 px-4 py-3">
                        {statusCounts ? (
                          <Tooltip
                            content={`Supported ${statusCounts.supported} · Partially Supported ${statusCounts.partially_supported} · Unsupported ${statusCounts.unsupported} · Unable to Verify ${statusCounts.unable_to_verify}`}
                          >
                            <div tabIndex={0}>
                              <StatusBreakdownBar counts={statusCounts} showLegend={false} thin />
                              <p className="mt-1 text-xs text-muted tabular-nums">
                                {statusCounts.supported} · {statusCounts.partially_supported} · {statusCounts.unsupported} · {statusCounts.unable_to_verify}
                              </p>
                            </div>
                          </Tooltip>
                        ) : (
                          <span className="text-subtle">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 tabular-nums">
                        {s ? (
                          <Tooltip content={s.coverage === 100 ? `${TT_COVERAGE} ${TT_FULL_COVERAGE}` : TT_COVERAGE}>
                            <span tabIndex={0} className="underline decoration-dotted underline-offset-2">
                              {s.coverage}%
                            </span>
                          </Tooltip>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="px-4 py-3 text-[13px] whitespace-nowrap text-muted">{dateLabel(item)}</td>
                      <td className="px-4 py-3">
                        <ReportStateBadge state={report.state} />
                        {report.state === "processing" && report.progressLabel && <p className="mt-1 text-xs text-muted">{report.progressLabel}</p>}
                        {report.state === "failed" && report.error && <p className="mt-1 text-xs text-unsupported">{report.error}</p>}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-2">
                          {report.state === "complete" && (
                            <ButtonLink href={`/reports/${report.id}`} variant="secondary" size="sm">
                              Open Report
                            </ButtonLink>
                          )}
                          {report.state === "processing" && (
                            <ButtonLink href={`/verify/${report.jobId}`} variant="secondary" size="sm">
                              View Progress
                            </ButtonLink>
                          )}
                          {report.state === "failed" && (
                            <>
                              <RetryVerificationButton name={document.name} documentType={document.type} inputKind={document.format === "text" ? "text" : "file"} />
                              <ButtonLink href={`/verify/${report.jobId}`} variant="ghost" size="sm">
                                View Details
                              </ButtonLink>
                            </>
                          )}
                          {report.state === "complete" && (
                            <OverflowMenu
                              label={`More actions for ${document.name}`}
                              items={[
                                { label: "Open Report", onSelect: () => router.push(`/reports/${report.id}`) },
                                { label: "Export Report", onSelect: () => router.push(`/reports/${report.id}?export=1`) },
                              ]}
                            />
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </Card>
          <ul className="grid gap-3 md:hidden">
            {rows.map((item) => (
              <li key={item.report.id}>
                <DocumentCard item={item} />
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
