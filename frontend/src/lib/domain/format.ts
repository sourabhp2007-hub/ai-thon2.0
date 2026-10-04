/**
 * Deterministic date formatting (D-22: "DD Mon YYYY, HH:mm"). Parses the
 * ISO-like local timestamps used by the API without timezone conversion, so
 * server and client render identical text.
 */

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function parts(iso: string) {
  const [date, time = ""] = iso.split("T");
  const [y, m, d] = date.split("-").map(Number);
  const [hh = "00", mm = "00"] = time.split(":");
  return { y, m, d, hh, mm };
}

export function formatDate(iso: string): string {
  const { y, m, d } = parts(iso);
  return `${String(d).padStart(2, "0")} ${MONTHS[m - 1]} ${y}`;
}

export function formatDateTime(iso: string): string {
  const { hh, mm } = parts(iso);
  return `${formatDate(iso)}, ${hh}:${mm}`;
}

export function yearOf(iso: string | null): string {
  return iso ? iso.slice(0, 4) : "";
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** Local timestamp in the API's ISO-like format. */
export function nowIso(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

export function slugify(value: string): string {
  return value
    .replace(/\.[a-z0-9]+$/i, "")
    .replace(/\(demo\)/i, "")
    .split("—")[0]
    .trim()
    .replace(/[^a-z0-9]+/gi, "-")
    .replace(/^-|-$/g, "");
}

export function plural(n: number, one: string, many = `${one}s`): string {
  return `${n} ${n === 1 ? one : many}`;
}

/** "Writ Petition Draft — Data Retention (Demo).pdf" → "Writ Petition Draft (Demo)". */
export function shortDocumentName(name: string, isDemo: boolean): string {
  const base = name.replace(/\.[a-z0-9]+$/i, "").replace(/\s*\(Demo\)/i, "").split(" — ")[0].trim();
  return isDemo ? `${base} (Demo)` : base;
}
