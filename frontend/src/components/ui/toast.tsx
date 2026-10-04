"use client";

import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, CircleAlert, X } from "lucide-react";
import Link from "next/link";
import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from "react";

interface ToastInput {
  message: string;
  tone?: "success" | "error";
  action?: { label: string; href: string };
}

interface ToastItem extends ToastInput {
  id: number;
}

const ToastContext = createContext<((toast: ToastInput) => void) | null>(null);

const DISMISS_MS = 5000;

/** App-wide toasts; lives in the root layout so it survives navigation. */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const nextId = useRef(1);

  const dismiss = useCallback((id: number) => setToasts((all) => all.filter((t) => t.id !== id)), []);

  const show = useCallback(
    (toast: ToastInput) => {
      const id = nextId.current++;
      setToasts((all) => [...all.slice(-2), { ...toast, id }]);
      window.setTimeout(() => dismiss(id), DISMISS_MS);
    },
    [dismiss],
  );

  const value = useMemo(() => show, [show]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        role="status"
        aria-live="polite"
        className="pointer-events-none fixed inset-x-4 bottom-20 z-[80] flex flex-col items-center gap-2 md:inset-x-auto md:right-6 md:bottom-6 md:items-end"
      >
        <AnimatePresence initial={false}>
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              layout
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              transition={{ duration: 0.18 }}
              className="pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-card border border-white/10 bg-raised px-4 py-3 text-sm text-white shadow-xl"
            >
              {t.tone === "error" ? (
                <CircleAlert className="mt-0.5 size-4 shrink-0 text-[#fda29b]" aria-hidden />
              ) : (
                <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-[#75e0a7]" aria-hidden />
              )}
              <p className="flex-1 leading-snug">{t.message}</p>
              {t.action && (
                <Link href={t.action.href} onClick={() => dismiss(t.id)} className="font-medium text-[#a4b0ff] hover:underline">
                  {t.action.label}
                </Link>
              )}
              <button type="button" aria-label="Dismiss notification" onClick={() => dismiss(t.id)} className="text-white/60 hover:text-white">
                <X className="size-4" aria-hidden />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const show = useContext(ToastContext);
  if (!show) throw new Error("useToast must be used inside ToastProvider");
  return show;
}
