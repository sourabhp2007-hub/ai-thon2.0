import type { ReactNode } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { getSearchIndex } from "@/lib/services";
import { getPreferences } from "@/lib/server/preferences";

export default async function WorkspaceLayout({ children }: { children: ReactNode }) {
  const preferences = await getPreferences();
  const searchIndex = await getSearchIndex({ includeDemo: preferences.showDemo });
  return (
    <AppShell searchIndex={searchIndex} demo={preferences.showDemo} notifyOnComplete={preferences.notifyOnComplete}>
      {children}
    </AppShell>
  );
}
