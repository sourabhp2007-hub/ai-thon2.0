import type { Preferences } from "@/lib/types/domain";
import { DOCUMENT_TYPES } from "./labels";

export const PREFERENCES_COOKIE = "li-prefs";

export const DEFAULT_PREFERENCES: Preferences = {
  defaultDocumentType: "legal_brief",
  checkLegalStatus: true,
  notifyOnComplete: true,
  showDemo: true,
};

/** Tolerant parser: unknown or malformed values fall back to defaults. */
export function parsePreferences(raw: string | undefined | null): Preferences {
  if (!raw) return DEFAULT_PREFERENCES;
  try {
    const value = JSON.parse(decodeURIComponent(raw)) as Partial<Preferences>;
    return {
      defaultDocumentType: DOCUMENT_TYPES.includes(value.defaultDocumentType!) ? value.defaultDocumentType! : DEFAULT_PREFERENCES.defaultDocumentType,
      checkLegalStatus: typeof value.checkLegalStatus === "boolean" ? value.checkLegalStatus : DEFAULT_PREFERENCES.checkLegalStatus,
      notifyOnComplete: typeof value.notifyOnComplete === "boolean" ? value.notifyOnComplete : DEFAULT_PREFERENCES.notifyOnComplete,
      showDemo: typeof value.showDemo === "boolean" ? value.showDemo : DEFAULT_PREFERENCES.showDemo,
    };
  } catch {
    return DEFAULT_PREFERENCES;
  }
}

export function serializePreferences(preferences: Preferences): string {
  return encodeURIComponent(JSON.stringify(preferences));
}
