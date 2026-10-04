import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageContainer } from "@/components/layout/page";
import { SourceViewer } from "@/components/sources/source-viewer";
import { getSource } from "@/lib/services";
import { getScope } from "@/lib/server/preferences";

export async function generateMetadata({ params }: PageProps<"/sources/[authorityId]">): Promise<Metadata> {
  const { authorityId } = await params;
  const detail = await getSource(authorityId, await getScope());
  return { title: detail?.authority.title ?? "Source not found" };
}

export default async function SourcePage({ params, searchParams }: PageProps<"/sources/[authorityId]">) {
  const [{ authorityId }, query] = await Promise.all([params, searchParams]);
  const detail = await getSource(authorityId, await getScope());
  if (!detail) notFound();
  const str = (v: string | string[] | undefined) => (typeof v === "string" ? v : null);
  const claim = Number(str(query.claim));
  return (
    <PageContainer wide>
      <SourceViewer detail={detail} paragraphId={str(query.para)} reportId={str(query.report)} claimIndex={Number.isFinite(claim) && claim > 0 ? claim : null} />
    </PageContainer>
  );
}
