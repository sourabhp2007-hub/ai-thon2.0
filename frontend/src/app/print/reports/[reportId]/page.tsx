import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AutoPrint } from "@/components/print/auto-print";
import { RU_EXPORT } from "@/lib/domain/copy";
import { exportFilename, type ExportSection } from "@/lib/domain/export";
import { formatDate, formatDateTime } from "@/lib/domain/format";
import { CHECK_KEY_LABEL, CHECK_RESULT_META, FLAG_META, RELATIONSHIP_META, TREATMENT_META, checkLabel } from "@/lib/domain/labels";
import { claimAuthorityLabel, claimCitations, claimEvidence, claimEvidenceSummary, findAuthority, findParagraph } from "@/lib/domain/report";
import { STATUS_META, STATUS_ORDER } from "@/lib/domain/status";
import { summarizeClaims } from "@/lib/domain/summary";
import { getReport } from "@/lib/services";
import { getScope } from "@/lib/server/preferences";

export async function generateMetadata({ params }: PageProps<"/print/reports/[reportId]">): Promise<Metadata> {
  const { reportId } = await params;
  const bundle = await getReport(reportId, await getScope());
  return { title: bundle ? exportFilename(bundle, "pdf").replace(/\.pdf$/, "") : "Report not found" };
}

/** Print-ready verification report; "Save as PDF" produces the PDF export (spec §3.14). */
export default async function PrintReportPage({ params, searchParams }: PageProps<"/print/reports/[reportId]">) {
  const [{ reportId }, query] = await Promise.all([params, searchParams]);
  const bundle = await getReport(reportId, await getScope());
  if (!bundle || bundle.report.state !== "complete") notFound();
  const sections = new Set((typeof query.sections === "string" ? query.sections : "reasons,evidence,checks,legal_status,sources").split(",") as ExportSection[]);
  const { document, report } = bundle;
  const summary = summarizeClaims(bundle.claims);
  const asOf = formatDate(report.sourcesAsOf ?? "");
  const notice = RU_EXPORT.replace("{date}", asOf);
  const citedAuthorities = bundle.authorities.filter((a) => bundle.citations.some((c) => c.authorityId === a.id));

  return (
    <div className="theme-light mx-auto max-w-[800px] bg-white px-4 py-12 sm:px-10 text-[13px] text-ink print:p-0">
      <AutoPrint />
      <section className="break-after-page">
        {document.isDemo && <p className="mb-6 inline-block rounded border border-accent px-2 py-0.5 text-xs font-semibold tracking-wider text-accent uppercase">Demo Data</p>}
        <h1 className="text-[30px] font-semibold tracking-tight">Verification Report</h1>
        <p className="mt-2 font-serif text-[18px]">{document.name}</p>
        <p className="mt-2 text-muted">
          Verified {report.verifiedAt ? formatDateTime(report.verifiedAt) : ""} · Sources as of {asOf}
        </p>
        <p className="mt-8 rounded border border-border bg-canvas p-4 leading-relaxed">{notice}</p>
      </section>

      <h2 className="mt-10 mb-3 text-[17px] font-semibold">Verification overview</h2>
      <p>
        Total Claims {summary.total} · Assessed {summary.assessed} · Verification Coverage {summary.coverage}% ({summary.assessed} of {summary.total} claims assessed)
      </p>
      <ul className="mt-2 flex flex-wrap gap-x-5">
        {STATUS_ORDER.map((s) => (
          <li key={s}>
            {STATUS_META[s].label}: <strong>{summary.counts[s]}</strong> ({summary.percentages[s]}%)
          </li>
        ))}
      </ul>

      <h2 className="mt-10 mb-3 text-[17px] font-semibold">Claims</h2>
      <table className="w-full border-collapse text-[12px]">
        <thead>
          <tr className="border-b border-ink text-left">
            <th className="py-1.5 pr-2">#</th>
            <th className="py-1.5 pr-2">Claim / Proposition</th>
            <th className="py-1.5 pr-2">Authority</th>
            <th className="py-1.5 pr-2">Status</th>
            <th className="py-1.5">Evidence</th>
          </tr>
        </thead>
        <tbody>
          {bundle.claims.map((c) => (
            <tr key={c.id} className="break-inside-avoid border-b border-border align-top">
              <td className="py-1.5 pr-2">{c.index}</td>
              <td className="py-1.5 pr-2">{c.text}</td>
              <td className="py-1.5 pr-2 font-mono text-[11px]">{claimAuthorityLabel(bundle, c)}</td>
              <td className="py-1.5 pr-2 whitespace-nowrap">{STATUS_META[c.status].label}</td>
              <td className="py-1.5">{claimEvidenceSummary(bundle, c)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {(sections.has("reasons") || sections.has("evidence") || sections.has("checks")) && (
        <>
          <h2 className="mt-10 mb-3 text-[17px] font-semibold">Claim details</h2>
          {bundle.claims.map((c) => (
            <article key={c.id} className="mb-6 break-inside-avoid border-t border-border pt-4">
              <h3 className="font-semibold">
                Claim {c.index} · {STATUS_META[c.status].label}
              </h3>
              <p className="mt-1">
                <strong>Claim: </strong>
                {c.text}
              </p>
              <p className="mt-1">
                <strong>Authority: </strong>
                {claimAuthorityLabel(bundle, c)}
              </p>
              {sections.has("checks") &&
                claimCitations(bundle, c).map((ct) => (
                  <p key={ct.id} className="mt-1 text-[12px] text-muted">
                    Citation integrity ({ct.rawText}):{" "}
                    {ct.checks.map((k) => `${CHECK_RESULT_META[k.result].symbol} ${CHECK_KEY_LABEL[k.key]}: ${checkLabel(k)}`).join(" · ")}
                  </p>
                ))}
              {sections.has("evidence") &&
                claimEvidence(bundle, c).map((e) => {
                  const a = findAuthority(bundle, e.authorityId);
                  return (
                    <blockquote key={e.id} className="mt-2 border-l-2 border-border-strong pl-3 font-serif text-[13.5px]">
                      “{e.highlight}” — {a?.shortTitle}, {findParagraph(a, e.paragraphId)?.label} ({RELATIONSHIP_META[e.relationship].edge})
                    </blockquote>
                  );
                })}
              {sections.has("reasons") && (
                <p className="mt-2">
                  <strong>Reason (system-generated): </strong>
                  {c.reason.map((r) => r.text).join(" ")}
                </p>
              )}
              {c.flags.length > 0 && <p className="mt-1 text-[12px] text-muted">Flags: {c.flags.map((f) => FLAG_META[f].label).join(", ")}</p>}
              <p className="mt-1">
                <strong>Status: </strong>
                {STATUS_META[c.status].label}: {STATUS_META[c.status].definition}
              </p>
            </article>
          ))}
        </>
      )}

      {sections.has("legal_status") && (
        <>
          <h2 className="mt-10 mb-3 text-[17px] font-semibold">Legal status</h2>
          <ul className="space-y-1">
            {citedAuthorities
              .filter((a) => a.type === "case")
              .map((a) => (
                <li key={a.id}>
                  <strong>{a.title}</strong>:{" "}
                  {a.treatments.length
                    ? a.treatments.map((t) => `${TREATMENT_META[t.kind].past} ${findAuthority(bundle, t.byAuthorityId)?.title ?? ""} (${formatDate(t.date)})`).join("; ")
                    : `No later treatment found in available sources as of ${asOf}.`}
                </li>
              ))}
          </ul>
        </>
      )}

      {sections.has("sources") && (
        <>
          <h2 className="mt-10 mb-3 text-[17px] font-semibold">Sources</h2>
          <ul className="space-y-1">
            {citedAuthorities.map((a) => (
              <li key={a.id}>
                {a.title} · <span className="font-mono text-[11.5px]">{a.citation}</span>
                {a.isDemo && " · Demo Data"}
              </li>
            ))}
          </ul>
        </>
      )}

      <h2 className="mt-10 mb-3 text-[17px] font-semibold">How statuses are assigned</h2>
      <ul className="space-y-1">
        {STATUS_ORDER.map((s) => (
          <li key={s}>
            <strong>{STATUS_META[s].label}:</strong> {STATUS_META[s].definition}
          </li>
        ))}
        <li>
          <strong>Verification Coverage:</strong> the share of claims that could be assessed against available sources. It measures how much could be checked, not how much is correct.
        </li>
      </ul>
      <p className="mt-10 border-t border-border pt-3 text-[11px] text-muted">Verification report, not a legal opinion · {document.name}</p>
    </div>
  );
}
