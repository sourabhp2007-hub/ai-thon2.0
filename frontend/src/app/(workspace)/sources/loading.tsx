import { LoadingState } from "@/components/feedback/states";
import { PageContainer } from "@/components/layout/page";
import { LOADING } from "@/lib/domain/copy";

export default function Loading() {
  return (
    <PageContainer>
      <LoadingState label={LOADING.sources} rows={6} />
    </PageContainer>
  );
}
