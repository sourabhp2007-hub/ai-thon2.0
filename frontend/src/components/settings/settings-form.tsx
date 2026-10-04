"use client";

import { useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import { Notice } from "@/components/feedback/states";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/dialog";
import { Field, Select, Toggle } from "@/components/ui/form";
import { Card } from "@/components/ui/primitives";
import { useToast } from "@/components/ui/toast";
import { ERROR, RU_STANDARD, SUCCESS } from "@/lib/domain/copy";
import { formatDate } from "@/lib/domain/format";
import { DOCUMENT_TYPE_LABEL, DOCUMENT_TYPES } from "@/lib/domain/labels";
import { PREFERENCES_COOKIE, serializePreferences } from "@/lib/domain/preferences";
import type { DocumentType, Preferences } from "@/lib/types/domain";

const SECTIONS = [
  { id: "verification", label: "Verification defaults" },
  { id: "notifications", label: "Notifications" },
  { id: "appearance", label: "Appearance" },
  { id: "data", label: "Data" },
  { id: "about", label: "About" },
];

function Section({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <Card id={id} className="scroll-mt-20 p-5 md:p-6">
      <h2 className="mb-4 text-[17px] font-semibold text-ink">{title}</h2>
      <div className="space-y-5">{children}</div>
    </Card>
  );
}

/**
 * Settings (spec §3.15). Only settings the project supports are shown;
 * undecided ones (D-11 to D-14) are deliberately absent.
 */
export function SettingsForm({ initial, sourcesAsOf }: { initial: Preferences; sourcesAsOf: string | null }) {
  const router = useRouter();
  const toast = useToast();
  const [saved, setSaved] = useState(initial);
  const [draft, setDraft] = useState(initial);
  const [error, setError] = useState(false);
  const [confirmLeave, setConfirmLeave] = useState<string | null>(null);
  const dirty = JSON.stringify(saved) !== JSON.stringify(draft);
  const set = <K extends keyof Preferences>(key: K, value: Preferences[K]) => setDraft((d) => ({ ...d, [key]: value }));

  const save = () => {
    try {
      document.cookie = `${PREFERENCES_COOKIE}=${serializePreferences(draft)}; path=/; max-age=31536000; samesite=lax`;
      setSaved(draft);
      setError(false);
      toast({ message: SUCCESS.settings });
      router.refresh();
    } catch {
      setError(true);
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[200px_minmax(0,1fr)]">
      <nav aria-label="Settings sections" className="min-w-0 lg:sticky lg:top-20 lg:h-fit">
        <ul className="relative scrollbar-none -mx-4 flex gap-1 overflow-x-auto px-4 lg:mx-0 lg:flex-col lg:px-0">
          {SECTIONS.map((s) => (
            <li key={s.id}>
              <a
                href={`#${s.id}`}
                onClick={(e) => {
                  if (!dirty) return;
                  e.preventDefault();
                  setConfirmLeave(s.id);
                }}
                className="block rounded-md px-3 py-1.5 text-sm whitespace-nowrap text-ink hover:bg-surface"
              >
                {s.label}
              </a>
            </li>
          ))}
        </ul>
      </nav>

      <div className="min-w-0 space-y-4 pb-24">
        <Section id="verification" title="Verification defaults">
          <Field id="default-type" label="Default document type" helper="Preselected when you start a new verification.">
            <Select id="default-type" value={draft.defaultDocumentType} onChange={(e) => set("defaultDocumentType", e.target.value as DocumentType)} className="max-w-sm">
              {DOCUMENT_TYPES.map((t) => (
                <option key={t} value={t}>
                  {DOCUMENT_TYPE_LABEL[t]}
                </option>
              ))}
            </Select>
          </Field>
          <Toggle
            id="pref-legal-status"
            label="Check legal status of cited cases"
            helper="Looks for later treatment such as followed, distinguished or overruled."
            checked={draft.checkLegalStatus}
            onChange={(v) => set("checkLegalStatus", v)}
          />
        </Section>

        <Section id="notifications" title="Notifications">
          <Toggle
            id="pref-notify"
            label="Notify me when a verification completes"
            helper="Shows an in-app notification."
            checked={draft.notifyOnComplete}
            onChange={(v) => set("notifyOnComplete", v)}
          />
        </Section>

        <Section id="appearance" title="Appearance">
          <p className="text-sm text-muted">Animations follow your system’s reduced-motion setting.</p>
        </Section>

        <Section id="data" title="Data">
          <Toggle
            id="pref-demo"
            label="Show demo reports and sources"
            helper="Demo content uses fictional authorities and illustrative excerpts."
            checked={draft.showDemo}
            onChange={(v) => set("showDemo", v)}
          />
        </Section>

        <Section id="about" title="About">
          <div>
            <p className="text-sm font-medium text-ink">Responsible use</p>
            <p className="mt-1 text-sm text-muted">{RU_STANDARD}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-ink">Source coverage</p>
            <p className="mt-1 text-sm text-muted">Demo corpus{sourcesAsOf ? ` · updated ${formatDate(sourcesAsOf)}` : ""}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-ink">Version</p>
            <p className="mt-1 text-sm text-muted">0.1 · Prototype</p>
          </div>
        </Section>

        {error && <Notice tone="danger">{ERROR.settings}</Notice>}
      </div>

      {dirty && (
        <div className="fixed inset-x-0 bottom-14 z-20 border-t border-border bg-surface/95 px-4 py-3 backdrop-blur lg:bottom-0 lg:left-auto lg:w-[calc(100%-15rem)]">
          <div className="mx-auto flex max-w-6xl items-center justify-end gap-2">
            <p className="mr-auto text-[13px] text-muted">You have unsaved changes.</p>
            <Button variant="ghost" onClick={() => setDraft(saved)}>
              Discard changes
            </Button>
            <Button onClick={save}>Save changes</Button>
          </div>
        </div>
      )}

      <Modal
        open={confirmLeave !== null}
        onOpenChange={(o) => !o && setConfirmLeave(null)}
        title="Discard unsaved changes?"
        description="Your changes to settings have not been saved."
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirmLeave(null)}>
              Keep editing
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                setDraft(saved);
                const target = confirmLeave;
                setConfirmLeave(null);
                if (target) document.getElementById(target)?.scrollIntoView();
              }}
            >
              Discard changes
            </Button>
          </>
        }
      />
    </div>
  );
}
