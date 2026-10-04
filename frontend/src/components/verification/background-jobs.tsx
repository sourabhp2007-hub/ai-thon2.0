"use client";

import { useEffect } from "react";
import { useToast } from "@/components/ui/toast";
import { getVerification } from "@/lib/services";

const WATCH_KEY = "li-watched-jobs";
const POLL_MS = 1500;

function readWatched(): string[] {
  try {
    return JSON.parse(window.sessionStorage.getItem(WATCH_KEY) ?? "[]") as string[];
  } catch {
    return [];
  }
}

function writeWatched(ids: string[]) {
  try {
    window.sessionStorage.setItem(WATCH_KEY, JSON.stringify(ids));
  } catch {
    /* storage unavailable: no background notification */
  }
}

/** Called by "Continue in background". */
export function watchJobInBackground(jobId: string) {
  writeWatched([...new Set([...readWatched(), jobId])]);
}

/** Polls jobs left running in the background and shows SU-02 when one completes. */
export function BackgroundJobsWatcher({ enabled }: { enabled: boolean }) {
  const toast = useToast();

  useEffect(() => {
    if (!enabled) return;
    const timer = window.setInterval(async () => {
      const ids = readWatched();
      if (ids.length === 0) return;
      for (const id of ids) {
        const job = await getVerification(id).catch(() => null);
        if (!job || job.state === "processing" || job.state === "queued") continue;
        writeWatched(readWatched().filter((x) => x !== id));
        if (job.state === "complete" && job.reportId) {
          toast({ message: `Verification complete: ${job.documentName}.`, action: { label: "Open Report", href: `/reports/${job.reportId}` } });
        }
      }
    }, POLL_MS);
    return () => window.clearInterval(timer);
  }, [enabled, toast]);

  return null;
}
