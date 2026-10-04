import type { Metadata } from "next";
import { PageContainer, PageHeader } from "@/components/layout/page";
import { SettingsForm } from "@/components/settings/settings-form";
import { getSources } from "@/lib/services";
import { getPreferences } from "@/lib/server/preferences";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  const preferences = await getPreferences();
  const { coverage } = await getSources({ includeDemo: true });
  return (
    <PageContainer>
      <PageHeader title="Settings" subtitle="Preferences for this workspace." />
      <SettingsForm initial={preferences} sourcesAsOf={coverage?.updatedAt ?? null} />
    </PageContainer>
  );
}
