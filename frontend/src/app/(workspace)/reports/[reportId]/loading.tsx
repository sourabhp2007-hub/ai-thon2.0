import { LoadingState } from "@/components/feedback/states";
import { PageContainer } from "@/components/layout/page";
import { Skeleton } from "@/components/ui/primitives";
import { LOADING } from "@/lib/domain/copy";

export default function ReportLoading() {
  return (
    <PageContainer wide>
      <Skeleton className="mb-3 h-4 w-48" />
      <Skeleton className="mb-8 h-8 w-2/3" />
      <div className="mb-8 grid gap-3 sm:grid-cols-3">
        <Skeleton className="h-28" />
        <Skeleton className="h-28" />
        <Skeleton className="h-28" />
      </div>
      <LoadingState label={LOADING.report} rows={6} />
    </PageContainer>
  );
}
