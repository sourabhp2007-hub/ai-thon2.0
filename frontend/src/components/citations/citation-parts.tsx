"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { CitationText, DemoBadge } from "@/components/ui/primitives";
import { CheckSymbol } from "@/components/verification/status";
import { RU_LEGAL_STATUS } from "@/lib/domain/copy";
import { formatDate } from "@/lib/domain/format";
import { AUTHORITY_TYPE_LABEL, CHECK_KEY_LABEL, CHECK_RESULT_META, CHECK_RESULT_PRIORITY, TREATMENT_META, checkLabel } from "@/lib/domain/labels";
import { findParagraph } from "@/lib/domain/report";
import type { Authority, Citation, CitationCheck, ReportBundle } from "@/lib/types/domain";
import { cn } from "@/lib/utils/cn";

/** Citation card: the authority as located in available sources. */
export function CitationCard({ authority, citation }: { authority: Authority; citation?: Citation }) {
  const pinpoint = citation?.paragraphId ? findParagraph(authority, citation.paragraphId)?.label : null;
  const rows: [string, string | null][] =
    authority.type === "case"
      ? [
          ["Citation", authority.citation],
          ["Court", authority.court],
          ["Decided", authority.decidedOn ? formatDate(authority.decidedOn) : null],
          ["Pinpoint", pinpoint ?? null],
          ["Type", AUTHORITY_TYPE_LABEL[authority.type]],
        ]
      : [
          ["Provision", authority.citation],
          ["Type", AUTHORITY_TYPE_LABEL[authority.type]],
          ["Text", authority.textNature === "illustrative_summary" ? "Illustrative summary, not the official text" : "Official text"],
        ];
  return (
    <div className="rounded-card border border-border bg-surface p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <p className="font-serif text-[17px] leading-snug font-semibold text-ink">{authority.title}</p>
        {authority.isDemo && <DemoBadge />}
      </div>
      <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-[13px]">
        {rows
          .filter((r): r is [string, string] => Boolean(r[1]))
          .map(([label, value]) => (
            <div key={label} className="contents">
              <dt className="text-muted">{label}</dt>
              <dd className="text-ink">{label === "Citation" || label === "Provision" ? <CitationText>{value}</CitationText> : value}</dd>
            </div>
          ))}
      </dl>
    </div>
  );
}

export function checkSummary(checks: CitationCheck[]): string {
  const count = (r: CitationCheck["result"]) => checks.filter((c) => c.result === r).length;
  const parts = [
    count("pass") && `${count("pass")} checks passed`,
    count("warn") && `${count("warn")} ${count("warn") === 1 ? "warning" : "warnings"}`,
    count("fail") && `${count("fail")} failed`,
    count("not_checked") && `${count("not_checked")} not checked`,
  ].filter(Boolean);
  return parts.join(" · ");
}

/** Scannable checklist; warnings and failures first. */
export function CitationChecklist({ checks, initiallyVisible = 4 }: { checks: CitationCheck[]; initiallyVisible?: number }) {
  const [expanded, setExpanded] = useState(false);
  const ordered = [...checks].sort((a, b) => CHECK_RESULT_PRIORITY[a.result] - CHECK_RESULT_PRIORITY[b.result]);
  const visible = expanded ? ordered : ordered.slice(0, initiallyVisible);
  return (
    <div>
      <p className="text-[13px] text-muted">{checkSummary(checks)}</p>
      <ul className="mt-2 divide-y divide-border rounded-card border border-border">
        {visible.map((check) => (
          <li key={check.key} className="flex items-start gap-2 px-3 py-2 text-sm">
            <CheckSymbol result={check.result} className="mt-px" />
            <span className="min-w-0 flex-1">
              <span className="sr-only">{CHECK_RESULT_META[check.result].label}: </span>
              <span className={cn("font-medium", check.result === "pass" ? "text-ink" : CHECK_RESULT_META[check.result].className)}>{checkLabel(check)}</span>
              <span className="ml-1.5 text-xs text-muted">{CHECK_KEY_LABEL[check.key]}</span>
              {check.note && <span className="block text-[13px] text-muted">{check.note}</span>}
            </span>
          </li>
        ))}
      </ul>
      {ordered.length > initiallyVisible && (
        <Button variant="link" size="sm" className="mt-2" onClick={() => setExpanded((e) => !e)} aria-expanded={expanded}>
          {expanded ? "Show fewer checks" : "Show all checks"}
        </Button>
      )}
    </div>
  );
}

/** Full table: Check · Result · As cited · In source. */
export function CitationCheckTable({ checks }: { checks: CitationCheck[] }) {
  return (
    <div className="relative overflow-x-auto rounded-card border border-border">
      <table className="w-full min-w-[560px] text-sm">
        <caption className="sr-only">Citation integrity checks</caption>
        <thead>
          <tr className="border-b border-border bg-canvas text-left text-xs text-muted">
            <th scope="col" className="px-3 py-2 font-medium">Check</th>
            <th scope="col" className="px-3 py-2 font-medium">Result</th>
            <th scope="col" className="px-3 py-2 font-medium">As cited</th>
            <th scope="col" className="px-3 py-2 font-medium">In source</th>
          </tr>
        </thead>
        <tbody>
          {checks.map((check) => (
            <tr key={check.key} className="border-b border-border align-top last:border-0">
              <th scope="row" className="px-3 py-2 text-left font-normal text-muted">{CHECK_KEY_LABEL[check.key]}</th>
              <td className="px-3 py-2">
                <span className="inline-flex items-start gap-1">
                  <CheckSymbol result={check.result} className="w-5" />
                  <span className="sr-only">{CHECK_RESULT_META[check.result].label}: </span>
                  <span className={cn(check.result === "pass" ? "text-ink" : CHECK_RESULT_META[check.result].className)}>
                    {checkLabel(check)}
                    {check.note && <span className="block text-xs text-muted">{check.note}</span>}
                  </span>
                </span>
              </td>
              <td className="px-3 py-2 text-ink/85">{check.asCited ?? "—"}</td>
              <td className="px-3 py-2 text-ink/85">{check.inSource ?? (check.key === "legal_status" && check.result === "pass" ? "No adverse treatment in available sources" : "—")}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Legal status timeline for one case authority (spec §11.3). */
export function LegalStatusPanel({ authority, bundle, sourcesAsOf }: { authority: Authority; bundle: Pick<ReportBundle, "authorities">; sourcesAsOf: string | null }) {
  if (authority.type !== "case") {
    return (
      <p className="flex items-start gap-1 text-sm text-muted">
        <CheckSymbol result="not_applicable" />
        <span>
          <span className="font-medium text-ink">{authority.shortTitle}:</span> Not applicable. Legal status checks currently cover case law only.
        </span>
      </p>
    );
  }
  const asOf = sourcesAsOf ? formatDate(sourcesAsOf) : "";
  const overruled = authority.treatments.some((t) => t.kind === "overruled");
  const adverse = authority.treatments.some((t) => t.kind !== "followed");
  const state = !authority.treatmentDataAvailable
    ? { result: "not_checked" as const, title: "No treatment data available", body: "Treatment data is not available for this authority." }
    : overruled
      ? { result: "fail" as const, title: "Overruled", body: TREATMENT_META.overruled.tooltip }
      : adverse
        ? { result: "warn" as const, title: TREATMENT_META[authority.treatments.find((t) => t.kind !== "followed")!.kind].label, body: "Review whether this treatment affects the claim." }
        : authority.treatments.length > 0
          ? { result: "pass" as const, title: "Followed", body: TREATMENT_META.followed.tooltip }
          : {
              result: "pass" as const,
              title: "No adverse treatment found",
              body: `No later treatment of ${authority.title} was found in available sources as of ${asOf}. This does not confirm that the authority remains good law.`,
            };

  const events = [
    { date: authority.decidedOn, label: "Decided", detail: authority.title, kind: null as null | string },
    ...authority.treatments.map((t) => {
      const by = bundle.authorities.find((a) => a.id === t.byAuthorityId);
      const para = findParagraph(by, t.paragraphId)?.label ?? "";
      return { date: t.date, label: TREATMENT_META[t.kind].label, detail: `${TREATMENT_META[t.kind].past} ${by?.title ?? ""}, ${by?.citation ?? ""}, ${para} — ${t.note}`, kind: t.kind };
    }),
  ];

  return (
    <div>
      <p className="flex items-start gap-1 text-sm">
        <CheckSymbol result={state.result} />
        <span>
          <span className="sr-only">{CHECK_RESULT_META[state.result].label}: </span>
          <span className={cn("font-medium", state.result === "pass" ? "text-ink" : CHECK_RESULT_META[state.result].className)}>{state.title}</span>
          <span className="ml-1.5 text-xs text-muted">{authority.shortTitle}</span>
          <span className="block text-[13px] text-muted">{state.body}</span>
        </span>
      </p>
      <ol className="mt-3 ml-3 border-l border-border pl-4">
        {events.map((e, i) => (
          <li key={i} className="relative pb-3 last:pb-0">
            <span
              aria-hidden
              className={cn(
                "absolute top-1.5 -left-[21px] size-2.5 rounded-full border-2 border-surface",
                e.kind === "overruled" ? "bg-unsupported" : e.kind && e.kind !== "followed" ? "bg-partial" : e.kind ? "bg-accent" : "bg-ink/40",
              )}
            />
            <p className="text-[13px]">
              <span className="font-medium text-ink">{e.date ? formatDate(e.date) : ""}</span>
              <span className="text-muted"> · {e.label}</span>
            </p>
            <p className="text-[13px] text-muted">{e.detail}</p>
          </li>
        ))}
      </ol>
      <p className="mt-3 text-xs text-muted">{RU_LEGAL_STATUS}</p>
    </div>
  );
}
