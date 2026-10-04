import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

const CONTROL =
  "w-full rounded-control border border-border-strong bg-surface px-3 text-sm text-ink placeholder:text-subtle focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 aria-invalid:border-unsupported";

export function Field({
  id,
  label,
  helper,
  error,
  optional,
  children,
}: {
  id: string;
  label: string;
  helper?: ReactNode;
  error?: string | null;
  optional?: boolean;
  children: ReactNode;
}) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-ink">
        {label}
        {optional && <span className="ml-1 font-normal text-muted">(optional)</span>}
      </label>
      {children}
      {error ? (
        <p id={`${id}-error`} role="alert" className="mt-1.5 text-[13px] text-unsupported">
          {error}
        </p>
      ) : (
        helper && (
          <p id={`${id}-helper`} className="mt-1.5 text-[13px] text-muted">
            {helper}
          </p>
        )
      )}
    </div>
  );
}

export function TextInput({ className, ...props }: ComponentProps<"input">) {
  return <input className={cn(CONTROL, "h-9", className)} {...props} />;
}

export function TextArea({ className, ...props }: ComponentProps<"textarea">) {
  return <textarea className={cn(CONTROL, "min-h-48 py-2.5 leading-relaxed", className)} {...props} />;
}

export function Select({ className, ...props }: ComponentProps<"select">) {
  return <select className={cn(CONTROL, "h-9 pr-8", className)} {...props} />;
}

/** Accessible switch built on a checkbox. */
export function Toggle({
  id,
  label,
  helper,
  checked,
  onChange,
  disabled,
}: {
  id: string;
  label: string;
  helper?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <label htmlFor={id} className="text-sm font-medium text-ink">
          {label}
        </label>
        {helper && (
          <p id={`${id}-helper`} className="mt-0.5 text-[13px] text-muted">
            {helper}
          </p>
        )}
      </div>
      <span className="relative inline-flex shrink-0">
        <input
          id={id}
          type="checkbox"
          role="switch"
          checked={checked}
          disabled={disabled}
          aria-describedby={helper ? `${id}-helper` : undefined}
          onChange={(e) => onChange(e.target.checked)}
          className="peer h-5 w-9 cursor-pointer appearance-none rounded-full bg-border-strong transition-colors checked:bg-primary disabled:opacity-50"
        />
        <span
          aria-hidden
          className="pointer-events-none absolute top-0.5 left-0.5 size-4 rounded-full bg-white shadow transition-transform peer-checked:translate-x-4"
        />
      </span>
    </div>
  );
}

export function Checkbox({ label, className, ...props }: ComponentProps<"input"> & { label: ReactNode }) {
  return (
    <label className={cn("flex items-start gap-2.5 text-sm text-ink", props.disabled && "text-muted", className)}>
      <input type="checkbox" className="mt-0.5 size-4 rounded border-border-strong accent-primary" {...props} />
      <span>{label}</span>
    </label>
  );
}
