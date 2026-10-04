"use client";

import { Download, Network } from "lucide-react";
import Link from "next/link";
import { useSelectedLayoutSegment } from "next/navigation";
import { Button, ButtonLink } from "@/components/ui/button";
import { OverflowMenu } from "@/components/ui/menu";
import { useToast } from "@/components/ui/toast";
import { StatusTiles } from "@/components/verification/overview";
import { useUrlState } from "@/hooks/use-url-state";
import { SUCCESS } from "@/lib/domain/copy";
import { summarizeClaims } from "@/lib/domain/summary";
import { cn } from "@/lib/utils/cn";
import { parseStatuses } from "@/components/claims/claims-view";
import { useReport } from "./report-context";

export function ReportHeaderActions() {
  const bundle = useReport();
  const toast = useToast();
  const { update } = useUrlState();
  return (
    <>
      <Button onClick={() => update({ export: "1" })} icon={<Download className="size-4" aria-hidden />}>
        Export Report
      </Button>
      <ButtonLink href={`/reports/${bundle.report.id}/graph`} variant="secondary" icon={<Network className="size-4" aria-hidden />}>
        Open Evidence Graph
      </ButtonLink>
      <OverflowMenu
        label="More actions"
        items={[
          {
            label: "Copy report link",
            onSelect: () =>
              navigator.clipboard
                .writeText(`${window.location.origin}/reports/${bundle.report.id}`)
                .then(() => toast({ message: SUCCESS.link }))
                .catch(() => toast({ message: "The link could not be copied.", tone: "error" })),
          },
        ]}
      />
    </>
  );
}

/** Status cards double as Claims filters (?status=). */
export function ReportStatusTiles() {
  const bundle = useReport();
  const { searchParams, hrefWith } = useUrlState();
  const segment = useSelectedLayoutSegment();
  const selected = parseStatuses(searchParams.get("status"));
  const active = segment === null && selected.length === 1 ? selected[0] : null;
  return (
    <StatusTiles
      summary={summarizeClaims(bundle.claims)}
      active={active}
      hrefFor={(s) => hrefWith({ status: active === s ? null : s, claim: null }, `/reports/${bundle.report.id}`)}
    />
  );
}

export function ReportTabs() {
  const bundle = useReport();
  const segment = useSelectedLayoutSegment();
  const base = `/reports/${bundle.report.id}`;
  const tabs = [
    { label: `Claims (${bundle.claims.length})`, href: base, active: segment === null || segment === "claims" },
    { label: "Document", href: `${base}/document`, active: segment === "document" },
    { label: `Citations (${bundle.citations.length})`, href: `${base}/citations`, active: segment === "citations" },
    { label: "Evidence Graph", href: `${base}/graph`, active: segment === "graph" },
  ];
  return (
    <nav aria-label="Report views" className="relative scrollbar-none -mx-4 mb-6 overflow-x-auto border-b border-border px-4 md:mx-0 md:px-0">
      <ul className="flex gap-6">
        {tabs.map((t) => (
          <li key={t.href}>
            <Link
              href={t.href}
              aria-current={t.active ? "page" : undefined}
              className={cn(
                "-mb-px inline-block border-b-2 pb-3 text-sm font-medium whitespace-nowrap",
                t.active ? "border-primary text-ink" : "border-transparent text-muted hover:text-ink",
              )}
            >
              {t.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
