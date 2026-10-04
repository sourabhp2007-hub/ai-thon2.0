import { ChevronRight, FlaskConical } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { DN_WORKSPACE, RU_SHORT } from "@/lib/domain/copy";
import { cn } from "@/lib/utils/cn";

export interface Crumb {
  label: string;
  href?: string;
}

export function Breadcrumbs({ items }: { items: Crumb[] }) {
  return (
    <nav aria-label="Breadcrumb" className="mb-3 min-w-0">
      <ol className="flex flex-wrap items-center gap-1 text-[13px] text-muted">
        {items.map((item, i) => {
          const last = i === items.length - 1;
          return (
            <li key={`${item.label}-${i}`} className="flex min-w-0 items-center gap-1">
              {item.href && !last ? (
                <Link href={item.href} className="truncate hover:text-ink hover:underline">
                  {item.label}
                </Link>
              ) : (
                <span aria-current={last ? "page" : undefined} className={cn("truncate", last && "text-ink")}>
                  {item.label}
                </span>
              )}
              {!last && <ChevronRight className="size-3.5 shrink-0" aria-hidden />}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

/** Content width and padding shared by workspace pages. */
export function PageContainer({ children, className, wide }: { children: ReactNode; className?: string; wide?: boolean }) {
  return <div className={cn("mx-auto w-full px-4 py-6 md:px-6 md:py-8", wide ? "max-w-[1440px]" : "max-w-6xl", className)}>{children}</div>;
}

export function PageHeader({
  title,
  subtitle,
  actions,
  breadcrumbs,
  badges,
  meta,
}: {
  title: string;
  subtitle?: ReactNode;
  actions?: ReactNode;
  breadcrumbs?: Crumb[];
  badges?: ReactNode;
  meta?: ReactNode;
}) {
  return (
    <header className="mb-6">
      {breadcrumbs && <Breadcrumbs items={breadcrumbs} />}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="display text-[28px] text-ink md:text-[36px]">{title}</h1>
            {badges}
          </div>
          {subtitle && <p className="mt-1.5 max-w-3xl text-[15px] text-muted">{subtitle}</p>}
          {meta && <div className="mt-2 text-[13px] text-muted">{meta}</div>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
    </header>
  );
}

export function DemoBanner({ children = DN_WORKSPACE }: { children?: ReactNode }) {
  return (
    <div role="note" className="mb-6 flex items-start gap-3 rounded-card border border-accent/25 bg-accent-soft px-4 py-3 text-sm">
      <FlaskConical className="mt-0.5 size-4 shrink-0 text-accent" aria-hidden />
      <p className="text-ink/85">
        <span className="font-semibold text-accent">Demo Data: </span>
        {children}
      </p>
    </div>
  );
}

export function ResponsibleUseNotice({ text = RU_SHORT, className }: { text?: string; className?: string }) {
  return (
    <p className={cn("flex items-start gap-2 text-[13px] text-muted", className)}>
      <span aria-hidden className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary/60" />
      {text}
    </p>
  );
}
