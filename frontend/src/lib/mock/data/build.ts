import type {
  Authority,
  CheckResult,
  Citation,
  CitationCheck,
  Claim,
  ClaimFlag,
  Contradiction,
  DocumentPage,
  Evidence,
  EvidenceRelationship,
  QuoteComparison,
  RelatedAuthority,
  UnableReason,
  VerificationStatus,
} from "@/lib/types/domain";
import { authorities } from "./authorities";

/**
 * Compact authoring format for demo claims. The builder expands it into the
 * full domain model, deriving citation checks from the authority records and
 * claim locations from the document text, so no fact is entered twice.
 */

export interface CiteSpec {
  raw: string;
  authorityId?: string;
  paragraphId?: string;
  resolution?: "not_found" | "source_not_available";
  shortForm?: boolean;
  caseName?: string;
  courtStated?: string;
  yearCited?: string;
  referenceCited?: string;
  quote?: { asCited: string; inSource: string };
  support: Extract<CheckResult, "pass" | "warn" | "fail">;
}

export interface EvidenceSpec {
  authorityId: string;
  paragraphId: string;
  /** Defaults to the whole paragraph. Must be an exact substring. */
  highlight?: string;
  relationship: EvidenceRelationship;
  note: string;
}

export interface ClaimSpec {
  text: string;
  status: VerificationStatus;
  cites: CiteSpec[];
  evidence: EvidenceSpec[];
  /** Sentence text with indexes into `evidence`. */
  reason: [string, number[]][];
  flags?: ClaimFlag[];
  unableReason?: UnableReason;
  whatYouCanDo?: string;
  contradictions?: Contradiction[];
  related?: RelatedAuthority[];
  quoteComparison?: QuoteComparison;
}

const NA_PROVISION = "Not applicable to constitutional or statutory provisions.";
const NA_SHORT_FORM = "Short-form citation, resolved to an authority cited earlier in the document.";
const NA_CASE_LAW_ONLY = "Legal status checks currently cover case law only.";
const NOT_CHECKED_NOTE = "Requires a located case.";

export function authorityById(id: string): Authority {
  const found = authorities.find((a) => a.id === id);
  if (!found) throw new Error(`Unknown demo authority ${id}`);
  return found;
}

function paragraphText(authority: Authority, paragraphId: string): string {
  const paragraph = authority.paragraphs.find((p) => p.id === paragraphId);
  if (!paragraph) throw new Error(`Unknown paragraph ${paragraphId} in ${authority.id}`);
  return paragraph.text;
}

function legalStatusCheck(authority: Authority): CitationCheck {
  const kinds = authority.treatments.map((t) => t.kind);
  if (kinds.includes("overruled")) return { key: "legal_status", result: "fail", label: "Overruled" };
  const adverse = kinds.find((k) => k === "distinguished" || k === "modified" || k === "reconsidered");
  if (adverse) {
    return {
      key: "legal_status",
      result: "warn",
      label: adverse.charAt(0).toUpperCase() + adverse.slice(1),
      note: "Review whether this treatment affects the claim.",
    };
  }
  if (kinds.includes("followed")) return { key: "legal_status", result: "pass", label: "Followed" };
  if (!authority.treatmentDataAvailable) {
    return { key: "legal_status", result: "not_checked", label: "No treatment data available" };
  }
  return { key: "legal_status", result: "pass" };
}

function buildChecks(spec: CiteSpec): CitationCheck[] {
  if (spec.resolution === "not_found" || spec.resolution === "source_not_available") {
    const existence: CitationCheck =
      spec.resolution === "not_found"
        ? { key: "existence", result: "fail", note: "No case matching this name or reference was found in available sources." }
        : { key: "existence", result: "not_checked", label: "Source not available", note: "This type of source is not among the sources available to the platform." };
    const rest = (["case_name", "court", "year", "reference", "paragraph", "quote", "support", "legal_status"] as const).map(
      (key): CitationCheck => ({ key, result: "not_checked", note: NOT_CHECKED_NOTE }),
    );
    return [existence, ...rest];
  }

  const authority = authorityById(spec.authorityId!);
  const isProvision = authority.type !== "case";
  const checks: CitationCheck[] = [];

  if (isProvision) {
    checks.push({ key: "existence", result: "pass", label: "Provision found" });
    checks.push({ key: "court", result: "not_applicable", note: NA_PROVISION });
    checks.push({ key: "year", result: "not_applicable", note: NA_PROVISION });
    checks.push({ key: "reference", result: "pass", asCited: spec.referenceCited ?? authority.citation, inSource: authority.citation });
    checks.push({ key: "paragraph", result: "not_applicable", note: NA_PROVISION });
  } else {
    checks.push({ key: "existence", result: "pass", asCited: spec.caseName ?? authority.title, inSource: authority.title });
    if (spec.shortForm) {
      checks.push({ key: "case_name", result: "not_applicable", note: NA_SHORT_FORM });
      checks.push({ key: "court", result: "not_applicable", note: NA_SHORT_FORM });
      checks.push({ key: "year", result: "not_applicable", note: NA_SHORT_FORM });
      checks.push({ key: "reference", result: "not_applicable", note: NA_SHORT_FORM });
    } else {
      checks.push({ key: "case_name", result: "pass", asCited: spec.caseName ?? authority.title, inSource: authority.title });
      checks.push(
        spec.courtStated
          ? { key: "court", result: "pass", asCited: spec.courtStated, inSource: authority.court ?? "" }
          : { key: "court", result: "not_applicable", label: "Court not stated", note: "The document does not state the court." },
      );
      const sourceYear = authority.decidedOn?.slice(0, 4) ?? "";
      const yearCited = spec.yearCited ?? sourceYear;
      checks.push(
        yearCited === sourceYear
          ? { key: "year", result: "pass", asCited: yearCited, inSource: sourceYear }
          : { key: "year", result: "warn", asCited: yearCited, inSource: sourceYear, note: `The citation gives ${yearCited}; the source is dated ${sourceYear}.` },
      );
      const referenceCited = spec.referenceCited ?? authority.citation;
      checks.push(
        referenceCited === authority.citation
          ? { key: "reference", result: "pass", asCited: referenceCited, inSource: authority.citation }
          : { key: "reference", result: "warn", asCited: referenceCited, inSource: authority.citation },
      );
    }
    if (spec.paragraphId) {
      const label = authority.paragraphs.find((p) => p.id === spec.paragraphId)?.label ?? spec.paragraphId;
      checks.push({ key: "paragraph", result: "pass", asCited: label, inSource: label });
    } else {
      checks.push({ key: "paragraph", result: "not_applicable", label: "No paragraph cited", note: "The citation gives no paragraph." });
    }
  }

  checks.push(
    spec.quote
      ? { key: "quote", result: "warn", asCited: spec.quote.asCited, inSource: spec.quote.inSource, note: "The quoted words do not appear in the source." }
      : { key: "quote", result: "not_applicable", label: "No quotation in claim" },
  );
  checks.push({ key: "support", result: spec.support });
  checks.push(isProvision ? { key: "legal_status", result: "not_applicable", note: NA_CASE_LAW_ONLY } : legalStatusCheck(authority));
  return checks;
}

/** Replaces `{c1}`-style placeholders with claim text. */
export function renderPages(template: string[][], claimTexts: string[]): DocumentPage[] {
  return template.map((paragraphs, i) => ({
    number: i + 1,
    paragraphs: paragraphs.map((p) => p.replace(/\{c(\d+)\}/g, (_, n: string) => claimTexts[Number(n) - 1])),
  }));
}

function locate(pages: DocumentPage[], text: string) {
  for (const page of pages) {
    const index = page.paragraphs.findIndex((p) => p.includes(text));
    if (index >= 0) return { page: page.number, paragraph: index + 1 };
  }
  throw new Error(`Claim text not found in document: ${text.slice(0, 40)}`);
}

export function buildClaims(reportId: string, specs: ClaimSpec[], pages: DocumentPage[]) {
  const claims: Claim[] = [];
  const citations: Citation[] = [];
  const evidence: Evidence[] = [];
  let citationIndex = 0;

  specs.forEach((spec, i) => {
    const claimId = `${reportId}-c${i + 1}`;

    const evidenceIds = spec.evidence.map((e, j) => {
      const authority = authorityById(e.authorityId);
      const text = paragraphText(authority, e.paragraphId);
      const highlight = e.highlight ?? text;
      if (!text.includes(highlight)) throw new Error(`Highlight not in source for ${claimId}`);
      const id = `${claimId}-e${j + 1}`;
      evidence.push({ id, claimId, authorityId: e.authorityId, paragraphId: e.paragraphId, highlight, relationship: e.relationship, note: e.note });
      return id;
    });

    const citationIds = spec.cites.map((c) => {
      citationIndex += 1;
      const id = `${reportId}-ct${citationIndex}`;
      const authority = c.authorityId ? authorityById(c.authorityId) : null;
      citations.push({
        id,
        reportId,
        claimId,
        index: citationIndex,
        rawText: c.raw,
        parsed: {
          caseName: c.caseName ?? (authority?.type === "case" ? authority.title : undefined),
          court: c.courtStated,
          year: c.yearCited ?? authority?.decidedOn?.slice(0, 4),
          reference: c.referenceCited ?? authority?.citation,
          pinpoint: c.paragraphId,
        },
        resolution: c.resolution ?? "located",
        authorityId: c.authorityId ?? null,
        paragraphId: c.paragraphId ?? null,
        isShortForm: Boolean(c.shortForm),
        checks: buildChecks(c),
      });
      return id;
    });

    claims.push({
      id: claimId,
      reportId,
      index: i + 1,
      text: spec.text,
      location: locate(pages, spec.text),
      status: spec.status,
      citationIds,
      evidenceIds,
      reason: spec.reason.map(([text, refs]) => ({ text, evidenceIds: refs.map((r) => evidenceIds[r]) })),
      flags: spec.flags ?? [],
      unableReason: spec.unableReason,
      whatYouCanDo: spec.whatYouCanDo,
      contradictions: spec.contradictions ?? [],
      related: spec.related ?? [],
      quoteComparison: spec.quoteComparison,
    });
  });

  return { claims, citations, evidence };
}
