import { ErrorState } from "@/components/feedback/states";
import { PageContainer } from "@/components/layout/page";
import { ButtonLink } from "@/components/ui/button";

export default function SourceNotFound() {
  return (
    <PageContainer>
      <ErrorState
        title="Source not found"
        body="This source could not be loaded."
        action={
          <ButtonLink href="/sources" variant="secondary">
            Back to Sources
          </ButtonLink>
        }
      />
    </PageContainer>
  );
}
