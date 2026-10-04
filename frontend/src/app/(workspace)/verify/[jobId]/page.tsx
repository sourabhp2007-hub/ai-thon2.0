import type { Metadata } from "next";
import { ProcessingView } from "@/components/verification/processing-view";

export const metadata: Metadata = { title: "Verifying document" };

/** Processing runs client-side: the job is polled until it completes. */
export default async function ProcessingPage({ params }: PageProps<"/verify/[jobId]">) {
  const { jobId } = await params;
  return <ProcessingView jobId={jobId} />;
}
