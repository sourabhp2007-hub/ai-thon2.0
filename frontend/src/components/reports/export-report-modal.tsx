"use client";

import { useState } from "react";
import { Notice } from "@/components/feedback/states";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/form";
import { useToast } from "@/components/ui/toast";
import { Tooltip } from "@/components/ui/tooltip";
import { useUrlState } from "@/hooks/use-url-state";
import { ERROR, LOADING } from "@/lib/domain/copy";
import { EXPORT_SECTIONS, exportFilename, reportToCsv, reportToJson, type ExportFormat, type ExportSection } from "@/lib/domain/export";
import { cn } from "@/lib/utils/cn";
import { useReport, useReportReady } from "./report-context";

const FORMATS: { value: ExportFormat; label: string; description: string }[] = [
  { value: "pdf", label: "PDF report", description: "Formatted for review and record-keeping." },
  { value: "csv", label: "CSV", description: "Claims table only, for spreadsheets." },
  { value: "json", label: "JSON", description: "Complete structured data, for other systems." },
];

function download(filename: string, content: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/**
 * Export Report modal (spec §3.14). Opened by ?export=1 so any surface can
 * open it. CSV and JSON download directly; PDF opens a print-ready view.
 */
export function ExportReportModal() {
  const bundle = useReport();
  const toast = useToast();
  const { searchParams, update } = useUrlState();
  const hydrated = useReportReady();
  const open = hydrated && searchParams.get("export") === "1";
  const [format, setFormat] = useState<ExportFormat>("pdf");
  const [sections, setSections] = useState<ExportSection[]>(EXPORT_SECTIONS.map((s) => s.key));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);

  const close = () => {
    setError(false);
    update({ export: null });
  };

  const run = async () => {
    setBusy(true);
    setError(false);
    try {
      const filename = exportFilename(bundle, format);
      if (format === "csv") download(filename, reportToCsv(bundle), "text/csv;charset=utf-8");
      else if (format === "json") download(filename, reportToJson(bundle), "application/json");
      else {
        const qs = new URLSearchParams({ sections: sections.join(",") });
        const win = window.open(`/print/reports/${bundle.report.id}?${qs}`, "_blank");
        if (!win) throw new Error("Pop-up blocked");
      }
      toast({
        message: format === "pdf" ? `Print view opened. Choose “Save as PDF” to download ${filename}.` : `Report exported. ${filename} has been downloaded.`,
      });
      close();
    } catch {
      setError(true);
    } finally {
      setBusy(false);
    }
  };

  const label = format === "pdf" ? "Export PDF" : format === "csv" ? "Export CSV" : "Export JSON";

  return (
    <Modal
      open={open}
      onOpenChange={(o) => !o && close()}
      title="Export verification report"
      description="Download the results of this verification. The export is a record of what was checked against available sources. It is not a legal opinion."
      footer={
        <>
          <Button variant="ghost" onClick={close}>
            Cancel
          </Button>
          <Button onClick={run} disabled={busy}>
            {busy ? LOADING.export : label}
          </Button>
        </>
      }
    >
      <fieldset>
        <legend className="mb-2 text-sm font-medium text-ink">Format</legend>
        <div className="space-y-2">
          {FORMATS.map((f) => (
            <label
              key={f.value}
              className={cn(
                "flex cursor-pointer items-start gap-3 rounded-card border px-3 py-2.5",
                format === f.value ? "border-primary bg-primary-soft/50" : "border-border hover:border-border-strong",
              )}
            >
              <input type="radio" name="export-format" value={f.value} checked={format === f.value} onChange={() => setFormat(f.value)} className="mt-1 accent-primary" />
              <span>
                <span className="block text-sm font-medium text-ink">{f.label}</span>
                <span className="block text-[13px] text-muted">{f.description}</span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      {format === "pdf" && (
        <fieldset className="mt-5">
          <legend className="mb-2 text-sm font-medium text-ink">Include</legend>
          <div className="space-y-2">
            {["Verification overview and status breakdown", "Claims table"].map((locked) => (
              <Tooltip key={locked} content="Always included.">
                <span className="block w-fit" tabIndex={0}>
                  <Checkbox label={locked} checked disabled readOnly />
                </span>
              </Tooltip>
            ))}
            {EXPORT_SECTIONS.map((s) => (
              <Checkbox
                key={s.key}
                label={s.label}
                checked={sections.includes(s.key)}
                onChange={(e) => setSections(e.target.checked ? [...sections, s.key] : sections.filter((x) => x !== s.key))}
              />
            ))}
          </div>
        </fieldset>
      )}

      <p className="mt-5 text-[13px] text-muted">Every export includes the responsible-use statement, the verification date and the date of the sources used.</p>
      {bundle.document.isDemo && <p className="mt-2 text-[13px] text-accent">This report contains Demo Data. The export will be marked accordingly.</p>}
      {error && (
        <Notice tone="danger" className="mt-4">
          {ERROR.export}
        </Notice>
      )}
    </Modal>
  );
}
