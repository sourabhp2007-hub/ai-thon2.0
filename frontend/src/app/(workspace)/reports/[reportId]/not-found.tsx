import { ErrorState } from "@/components/feedback/states";
import { PageContainer } from "@/components/layout/page";
import { ButtonLink } from "@/components/ui/button";

export default function ReportNotFound() {
  return (
    <PageContainer>
      <ErrorState
        title="Report not found"
        body="This report may have been deleted."
        action={
          <ButtonLink href="/reports" variant="secondary">
            View all reports
          </ButtonLink>
        }
      />
    </PageContainer>
  );
}
