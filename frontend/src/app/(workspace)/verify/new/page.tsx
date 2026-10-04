import type { Metadata } from "next";
import { PageContainer, PageHeader } from "@/components/layout/page";
import { NewVerificationForm } from "@/components/verification/new-verification-form";
import { getPreferences } from "@/lib/server/preferences";

export const metadata: Metadata = { title: "New Verification" };

export default async function NewVerificationPage() {
  const preferences = await getPreferences();
  return (
    <PageContainer>
      <PageHeader
        breadcrumbs={[{ label: "New Verification" }]}
        title="New Verification"
        subtitle="Upload a legal document or paste AI-generated legal text. Each legal claim and citation will be checked against available sources."
      />
      <NewVerificationForm preferences={preferences} demoMode={process.env.NEXT_PUBLIC_API_MODE !== "http"} />
    </PageContainer>
  );
}
