import { cookies } from "next/headers";
import { parsePreferences, PREFERENCES_COOKIE } from "@/lib/domain/preferences";
import type { ScopeOptions } from "@/lib/services/types";
import type { Preferences } from "@/lib/types/domain";

/** Server-side preference read (cookie set by Settings). */
export async function getPreferences(): Promise<Preferences> {
  const store = await cookies();
  return parsePreferences(store.get(PREFERENCES_COOKIE)?.value);
}

export async function getScope(): Promise<ScopeOptions> {
  return { includeDemo: (await getPreferences()).showDemo };
}
