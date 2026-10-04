"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { ReportBundle } from "@/lib/types/domain";

const ReportContext = createContext<ReportBundle | null>(null);
const ReadyContext = createContext<{ ready: boolean; markReady: () => void }>({ ready: false, markReady: () => {} });

/** Provides the report bundle, fetched once by the report layout, to every tab and drawer. */
export function ReportProvider({ bundle, children }: { bundle: ReportBundle; children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const markReady = useCallback(() => setReady(true), []);
  const readyValue = useMemo(() => ({ ready, markReady }), [ready, markReady]);
  return (
    <ReportContext.Provider value={bundle}>
      <ReadyContext.Provider value={readyValue}>{children}</ReadyContext.Provider>
    </ReportContext.Provider>
  );
}

export function useReport(): ReportBundle {
  const bundle = useContext(ReportContext);
  if (!bundle) throw new Error("useReport must be used inside ReportProvider");
  return bundle;
}

/**
 * True once the active tab has hydrated. URL-driven drawers wait for it so
 * the dialog does not mark not-yet-hydrated page content aria-hidden.
 */
export function useReportReady(): boolean {
  return useContext(ReadyContext).ready;
}

/** Rendered by each report tab page to signal that it has hydrated. */
export function ReportPageReady() {
  const { markReady } = useContext(ReadyContext);
  useEffect(() => markReady(), [markReady]);
  return null;
}
