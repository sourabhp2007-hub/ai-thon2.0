"use client";

import { useEffect } from "react";

/** Opens the browser print dialog once the print view has rendered. */
export function AutoPrint() {
  useEffect(() => {
    const t = window.setTimeout(() => window.print(), 400);
    return () => window.clearTimeout(t);
  }, []);
  return (
    <button type="button" onClick={() => window.print()} className="no-print fixed top-4 right-4 rounded-md bg-primary px-3 py-2 text-sm font-medium text-white shadow">
      Print or save as PDF
    </button>
  );
}
