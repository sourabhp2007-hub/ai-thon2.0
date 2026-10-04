"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useReport } from "@/components/reports/report-context";
import { Card } from "@/components/ui/primitives";
import { StatusBadge } from "@/components/verification/status";
import { ClaimDetail } from "./claim-detail";
import { ClaimNavButtons, useClaimKeys } from "./report-drawers";

export function ClaimPageView({ claimIndex }: { claimIndex: number }) {
  const bundle = useReport();
  const router = useRouter();
  const claim = bundle.claims.find((c) => c.index === claimIndex)!;
  const total = bundle.claims.length;
  const go = (delta: number) => {
    const next = claim.index + delta;
    if (next >= 1 && next <= total) router.push(`/reports/${bundle.report.id}/claims/${next}`);
  };
  useClaimKeys(() => go(-1), () => go(1), true);

  return (
    <Card className="mx-auto max-w-3xl">
      <div className="flex flex-wrap items-center gap-2 border-b border-border px-5 py-3">
        <Link href={`/reports/${bundle.report.id}`} className="mr-2 inline-flex items-center gap-1 text-[13px] font-medium text-primary hover:underline">
          <ArrowLeft className="size-3.5" aria-hidden /> Back to claims
        </Link>
        <h2 className="text-[15px] font-semibold text-ink">
          Claim {claim.index} of {total}
        </h2>
        <StatusBadge status={claim.status} size="sm" />
        <div className="ml-auto">
          <ClaimNavButtons onPrevious={() => go(-1)} onNext={() => go(1)} hasPrevious={claim.index > 1} hasNext={claim.index < total} />
        </div>
      </div>
      <div className="px-5 py-6 md:px-8">
        <ClaimDetail key={claim.id} bundle={bundle} claim={claim} />
      </div>
    </Card>
  );
}
