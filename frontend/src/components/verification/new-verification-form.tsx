"use client";

import { CheckCircle2, CircleAlert, FileText, UploadCloud } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState, type DragEvent } from "react";
import { Notice } from "@/components/feedback/states";
import { DemoBanner, ResponsibleUseNotice } from "@/components/layout/page";
import { Button, ButtonLink } from "@/components/ui/button";
import { Field, Select, TextArea, TextInput, Toggle } from "@/components/ui/form";
import { Card } from "@/components/ui/primitives";
import { useToast } from "@/components/ui/toast";
import { Tooltip } from "@/components/ui/tooltip";
import { DN_UPLOAD, ERROR, SUCCESS } from "@/lib/domain/copy";
import { formatBytes, formatDate, nowIso } from "@/lib/domain/format";
import { DOCUMENT_TYPE_LABEL, DOCUMENT_TYPES } from "@/lib/domain/labels";
import { DEMO_REPORT_ID } from "@/lib/domain/demo";
import { PIPELINE_STAGES } from "@/lib/domain/pipeline";
import { startVerification, uploadDocument, type UploadResult } from "@/lib/services";
import type { DocumentType, Preferences } from "@/lib/types/domain";
import { cn } from "@/lib/utils/cn";

const MAX_BYTES = 25 * 1024 * 1024; // D-05
const MIN_CHARS = 200; // D-07
const MAX_CHARS = 50_000;
const MAX_TITLE = 120;
const ACCEPT = ".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document";

const UPLOAD_ERRORS = {
  type: "This file type isn’t supported. Upload a PDF or DOCX file.",
  size: "This file is larger than 25 MB. Upload a smaller file.",
  multiple: "Upload one file at a time.",
  empty: "This file appears to be empty or unreadable.",
  network: "Upload failed. Check your connection and try again.",
};

type Upload =
  | { state: "idle" }
  | { state: "uploading"; name: string; percent: number }
  | { state: "ready"; result: UploadResult }
  | { state: "error"; message: string };

function validateFiles(files: FileList | File[]): string | null {
  const list = Array.from(files);
  if (list.length > 1) return UPLOAD_ERRORS.multiple;
  const file = list[0];
  if (!/\.(pdf|docx)$/i.test(file.name)) return UPLOAD_ERRORS.type;
  if (file.size > MAX_BYTES) return UPLOAD_ERRORS.size;
  if (file.size === 0) return UPLOAD_ERRORS.empty;
  return null;
}

function textError(text: string): string | null {
  const n = text.trim().length;
  if (n === 0) return "Paste some text to verify.";
  if (n < MIN_CHARS) return "Add at least 200 characters so claims can be identified.";
  if (n > MAX_CHARS) return "Text is over 50,000 characters. Shorten it or upload a file instead.";
  return null;
}

/** New Verification (spec §3.3): one input, minimal details, then start. */
export function NewVerificationForm({ preferences, demoMode }: { preferences: Preferences; demoMode: boolean }) {
  const router = useRouter();
  const toast = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const uploadToken = useRef(0);
  const [tab, setTab] = useState<"file" | "text">("file");
  const [upload, setUpload] = useState<Upload>({ state: "idle" });
  const [dragging, setDragging] = useState(false);
  const [text, setText] = useState("");
  const [textTouched, setTextTouched] = useState(false);
  const [title, setTitle] = useState("");
  const [docType, setDocType] = useState<DocumentType | "">(preferences.defaultDocumentType);
  const [docTypeTouched, setDocTypeTouched] = useState(false);
  const [checkLegalStatus, setCheckLegalStatus] = useState(preferences.checkLegalStatus);
  const [showOptions, setShowOptions] = useState(false);
  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState(false);

  const handleFiles = async (files: FileList | File[]) => {
    if (!files.length) return;
    const error = validateFiles(files);
    if (error) {
      setUpload({ state: "error", message: error });
      return;
    }
    const file = Array.from(files)[0];
    const token = ++uploadToken.current;
    setUpload({ state: "uploading", name: file.name, percent: 0 });
    try {
      const result = await uploadDocument(file, (percent) => {
        if (uploadToken.current === token) setUpload({ state: "uploading", name: file.name, percent });
      });
      if (uploadToken.current === token) setUpload({ state: "ready", result });
    } catch {
      if (uploadToken.current === token) setUpload({ state: "error", message: UPLOAD_ERRORS.network });
    }
  };

  const reset = () => {
    uploadToken.current++;
    setUpload({ state: "idle" });
    if (inputRef.current) inputRef.current.value = "";
  };

  const switchTab = (next: "file" | "text") => {
    setTab(next);
    if (!docTypeTouched) setDocType(next === "text" ? "ai_response" : preferences.defaultDocumentType);
  };

  const pasteError = textError(text);
  const titleError = title.length > MAX_TITLE ? "Use 120 characters or fewer." : null;
  const inputReady = tab === "file" ? upload.state === "ready" : !pasteError && !titleError;
  const canStart = inputReady && docType !== "" && !starting;

  const start = async () => {
    if (!canStart || !docType) return;
    setStarting(true);
    setStartError(false);
    try {
      const name =
        tab === "file" && upload.state === "ready" ? upload.result.name : title.trim() || `Pasted text — ${formatDate(nowIso())}`;
      const { jobId } = await startVerification({
        name,
        documentType: docType,
        inputKind: tab,
        checkLegalStatus,
        pageCount: tab === "file" && upload.state === "ready" ? upload.result.pageCount : null,
      });
      toast({ message: SUCCESS.started });
      router.push(`/verify/${jobId}`);
    } catch {
      setStartError(true);
      setStarting(false);
    }
  };

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setDragging(false);
    void handleFiles(e.dataTransfer.files);
  };

  const startButton = (
    <Button size="lg" onClick={start} disabled={!canStart}>
      {starting ? "Starting verification…" : "Start Verification"}
    </Button>
  );

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div className="min-w-0 space-y-6">
        {demoMode && <DemoBanner>{DN_UPLOAD}</DemoBanner>}

        <Card className="p-5 md:p-6">
          <h2 className="text-[17px] font-semibold text-ink">Add a document</h2>
          <div role="tablist" aria-label="Input type" className="mt-4 inline-flex rounded-control border border-border-strong bg-canvas p-0.5">
            {(["file", "text"] as const).map((t) => (
              <button
                key={t}
                role="tab"
                type="button"
                id={`tab-${t}`}
                aria-selected={tab === t}
                aria-controls={`panel-${t}`}
                onClick={() => switchTab(t)}
                className={cn("h-8 rounded-[5px] px-4 text-[13px] font-medium", tab === t ? "bg-surface text-ink shadow-sm" : "text-muted hover:text-ink")}
              >
                {t === "file" ? "Upload file" : "Paste text"}
              </button>
            ))}
          </div>

          {tab === "file" ? (
            <div id="panel-file" role="tabpanel" aria-labelledby="tab-file" className="mt-5">
              <p className="mb-1.5 text-sm font-medium text-ink">Document</p>
              {upload.state === "ready" ? (
                <div className="flex flex-wrap items-center gap-3 rounded-card border border-supported/30 bg-supported-bg/50 px-4 py-3">
                  <FileText className="size-5 text-muted" aria-hidden />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-ink">{upload.result.name}</p>
                    <p className="text-[13px] text-muted">
                      {upload.result.format.toUpperCase()}
                      {upload.result.pageCount ? ` · ${upload.result.pageCount} pages` : ""} · {formatBytes(upload.result.sizeBytes)}
                    </p>
                    <p className="mt-0.5 flex items-center gap-1 text-[13px] font-medium text-supported" role="status">
                      <CheckCircle2 className="size-3.5" aria-hidden /> File uploaded · Ready to verify
                    </p>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => inputRef.current?.click()}>
                    Replace file
                  </Button>
                  <Button variant="ghost" size="sm" onClick={reset}>
                    Remove file
                  </Button>
                </div>
              ) : upload.state === "uploading" ? (
                <div className="rounded-card border border-border px-4 py-5" role="status" aria-live="polite">
                  <p className="text-sm text-ink">
                    Uploading {upload.name}… {upload.percent}%
                  </p>
                  <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-canvas" aria-hidden>
                    <div className="h-full bg-primary transition-[width] duration-150" style={{ width: `${upload.percent}%` }} />
                  </div>
                  <Button variant="ghost" size="sm" className="mt-3" onClick={reset}>
                    Cancel upload
                  </Button>
                </div>
              ) : (
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDragging(true);
                  }}
                  onDragLeave={() => setDragging(false)}
                  onDrop={onDrop}
                  className={cn(
                    "flex flex-col items-center rounded-card border-2 border-dashed px-6 py-10 text-center transition-colors",
                    dragging ? "border-primary bg-primary-soft" : upload.state === "error" ? "border-unsupported/50 bg-unsupported-bg/40" : "border-border-strong bg-canvas/60",
                  )}
                >
                  {upload.state === "error" ? (
                    <>
                      <CircleAlert className="size-7 text-unsupported" aria-hidden />
                      <p className="mt-3 text-sm font-medium text-unsupported" role="alert">
                        {upload.message}
                      </p>
                      <Button variant="secondary" size="sm" className="mt-4" onClick={() => inputRef.current?.click()}>
                        Choose another file
                      </Button>
                    </>
                  ) : (
                    <>
                      <UploadCloud className={cn("size-8", dragging ? "text-primary" : "text-muted")} aria-hidden />
                      <p className="mt-3 text-[15px] font-medium text-ink">{dragging ? "Drop the file to upload" : "Drag and drop a PDF or DOCX file"}</p>
                      <p className="my-2 text-[13px] text-muted">or</p>
                      <Button variant="secondary" onClick={() => inputRef.current?.click()}>
                        Browse files
                      </Button>
                    </>
                  )}
                  <p className="mt-4 text-xs text-muted">PDF or DOCX · Up to 25 MB · Text-based documents</p>
                </div>
              )}
              <input
                ref={inputRef}
                type="file"
                accept={ACCEPT}
                className="sr-only"
                tabIndex={-1}
                aria-label="Choose a PDF or DOCX file"
                onChange={(e) => e.target.files && void handleFiles(e.target.files)}
              />
            </div>
          ) : (
            <div id="panel-text" role="tabpanel" aria-labelledby="tab-text" className="mt-5 space-y-4">
              <Field
                id="paste-text"
                label="AI-generated legal text"
                helper={
                  <>
                    Between 200 and 50,000 characters. Citations in the text will be checked.{" "}
                    <span className="tabular-nums">· {text.length.toLocaleString("en-US")} / 50,000 characters</span>
                  </>
                }
                error={textTouched ? pasteError : null}
              >
                <TextArea
                  id="paste-text"
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  onBlur={() => setTextTouched(true)}
                  placeholder="Paste the legal text you want to verify, including any citations."
                  aria-invalid={textTouched && Boolean(pasteError)}
                  aria-describedby={textTouched && pasteError ? "paste-text-error" : "paste-text-helper"}
                />
              </Field>
              <Field id="paste-title" label="Title" optional helper="Used to identify this verification in Reports." error={titleError}>
                <TextInput
                  id="paste-title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. AI response — limitation period research"
                  aria-invalid={Boolean(titleError)}
                />
              </Field>
            </div>
          )}
        </Card>

        <Card className="p-5 md:p-6">
          <h2 className="mb-4 text-[17px] font-semibold text-ink">Document details</h2>
          <Field id="doc-type" label="Document type" helper="Used to label the report." error={docType === "" ? "Select a document type." : null}>
            <Select
              id="doc-type"
              value={docType}
              onChange={(e) => {
                setDocType(e.target.value as DocumentType | "");
                setDocTypeTouched(true);
              }}
              className="max-w-sm"
            >
              <option value="">Select a document type</option>
              {DOCUMENT_TYPES.map((t) => (
                <option key={t} value={t}>
                  {DOCUMENT_TYPE_LABEL[t]}
                </option>
              ))}
            </Select>
          </Field>

          <div className="mt-6 border-t border-border pt-4">
            <Button variant="link" size="sm" onClick={() => setShowOptions((s) => !s)} aria-expanded={showOptions} aria-controls="verification-options">
              {showOptions ? "Hide verification options" : "Show verification options"}
            </Button>
            {showOptions && (
              <div id="verification-options" className="mt-4 max-w-lg">
                <Toggle
                  id="check-legal-status"
                  label="Check legal status of cited cases"
                  helper="Looks for later treatment such as followed, distinguished or overruled."
                  checked={checkLegalStatus}
                  onChange={setCheckLegalStatus}
                />
              </div>
            )}
          </div>
        </Card>

        {startError && <Notice tone="danger">{ERROR.start}</Notice>}

        <div className="flex flex-wrap items-center gap-3">
          {canStart || starting ? (
            startButton
          ) : (
            <Tooltip content="Add a document or paste text to continue.">
              <span tabIndex={0}>{startButton}</span>
            </Tooltip>
          )}
          <ButtonLink href="/dashboard" variant="ghost" size="lg">
            Cancel
          </ButtonLink>
          {demoMode && (
            <Link href={`/reports/${DEMO_REPORT_ID}`} className="text-[13px] font-medium text-primary hover:underline">
              Try the demo report instead
            </Link>
          )}
        </div>
      </div>

      <aside className="h-fit lg:sticky lg:top-20">
        <Card className="p-5">
          <h2 className="text-[15px] font-semibold text-ink">What happens next</h2>
          <p className="mt-1 text-[13px] text-muted">Your document passes through eight steps. You can leave this page while verification runs.</p>
          <ol className="mt-4 space-y-2.5">
            {PIPELINE_STAGES.map((s, i) => (
              <li key={s.key} className="flex items-center gap-3 text-sm text-ink">
                <span className="flex size-5 shrink-0 items-center justify-center rounded-full border border-border-strong text-[11px] text-muted">{i + 1}</span>
                {s.label}
              </li>
            ))}
          </ol>
          <ResponsibleUseNotice className="mt-5 border-t border-border pt-4" />
        </Card>
      </aside>
    </div>
  );
}
