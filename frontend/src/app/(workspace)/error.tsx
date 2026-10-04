"use client";

import { ErrorState } from "@/components/feedback/states";
import { PageContainer } from "@/components/layout/page";
import { Button } from "@/components/ui/button";
import { ERROR } from "@/lib/domain/copy";

/** ER-LOAD: shown in place of a page whose data could not be loaded. */
export default function WorkspaceError({ retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return (
    <PageContainer>
      <ErrorState
        body={ERROR.load}
        action={
          <Button variant="secondary" onClick={() => retry()}>
            Try again
          </Button>
        }
      />
    </PageContainer>
  );
}
