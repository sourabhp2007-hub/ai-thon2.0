import type {
  Authority,
  Citation,
  Claim,
  Evidence,
  Paragraph,
  RelatedAuthority,
  ReportBundle,
} from "@/lib/types/domain";

/** Pure selectors over a ReportBundle. */

export type AuthorityFilter = "case" | "constitutional_provision" | "statutory_provision" | "tribunal_order" | "none";

export const AUTHORITY_FILTER_LABEL: Record<AuthorityFilter, string> = {
  case: "Case law",
  constitutional_provision: "Constitutional provision",
  statutory_provision: "Statutory provision",
  tribunal_order: "Tribunal order",
  none: "No authority cited",
};

export function findAuthority(bundle: ReportBundle, id: string | null | undefined): Authority | undefined {
  return id ? bundle.authorities.find((a) => a.id === id) : undefined;
}

export function findParagraph(authority: Authority | undefined, id: string | null | undefined): Paragraph | undefined {
  return authority && id ? authority.paragraphs.find((p) => p.id === id) : undefined;
}

export function claimCitations(bundle: ReportBundle, claim: Claim): Citation[] {
  return claim.citationIds.map((id) => bundle.citations.find((c) => c.id === id)).filter((c): c is Citation => Boolean(c));
}

export function claimEvidence(bundle: ReportBundle, claim: Claim): Evidence[] {
  return claim.evidenceIds.map((id) => bundle.evidence.find((e) => e.id === id)).filter((e): e is Evidence => Boolean(e));
}

export function citationAuthorityLabel(bundle: ReportBundle, citation: Citation): string {
  const authority = findAuthority(bundle, citation.authorityId);
  if (!authority) return citation.rawText;
  return authority.type === "case" ? `${authority.title} ${authority.citation}` : authority.title;
}

/** Authority column text in claim tables. */
export function claimAuthorityLabel(bundle: ReportBundle, claim: Claim): string {
  const citations = claimCitations(bundle, claim);
  if (citations.length === 0) return "No authority cited";
  const first = citationAuthorityLabel(bundle, citations[0]);
  return citations.length > 1 ? `${first} +${citations.length - 1} more` : first;
}

/** Evidence column text, e.g. "¶43 · 1 passage". */
export function claimEvidenceSummary(bundle: ReportBundle, claim: Claim): string {
  const evidence = claimEvidence(bundle, claim);
  if (evidence.length === 0) {
    return claim.flags.includes("source_not_available") ? "Source not available" : "No evidence found";
  }
  const labels = [
    ...new Set(evidence.map((e) => findParagraph(findAuthority(bundle, e.authorityId), e.paragraphId)?.label ?? e.paragraphId)),
  ];
  return `${labels.join(", ")} · ${evidence.length} ${evidence.length === 1 ? "passage" : "passages"}`;
}

export function claimAuthorityTypes(bundle: ReportBundle, claim: Claim): AuthorityFilter[] {
  const citations = claimCitations(bundle, claim);
  if (citations.length === 0) return ["none"];
  return citations.map((c) => {
    if (c.resolution === "source_not_available") return "tribunal_order";
    const authority = findAuthority(bundle, c.authorityId);
    return authority ? authority.type : "case";
  });
}

/** Explicit related authorities, or those recorded on the cited authorities. */
export function claimRelated(bundle: ReportBundle, claim: Claim): RelatedAuthority[] {
  if (claim.related.length > 0) return claim.related;
  const cited = new Set(claimCitations(bundle, claim).map((c) => c.authorityId));
  const seen = new Set<string>();
  const result: RelatedAuthority[] = [];
  for (const id of cited) {
    for (const r of findAuthority(bundle, id)?.related ?? []) {
      if (cited.has(r.authorityId) || seen.has(r.authorityId)) continue;
      if (claim.contradictions.some((c) => c.authorityId === r.authorityId)) continue;
      seen.add(r.authorityId);
      result.push(r);
    }
  }
  return result;
}

/** Located authorities cited in the report, for "Later treatment found for N cases". */
export function casesWithLaterTreatment(bundle: ReportBundle): number {
  const cited = new Set(bundle.citations.map((c) => c.authorityId).filter(Boolean));
  return bundle.authorities.filter((a) => cited.has(a.id) && a.type === "case" && a.treatments.length > 0).length;
}

export function claimHref(reportId: string, claim: Pick<Claim, "index">): string {
  return `/reports/${reportId}?claim=${claim.index}`;
}

export function sourceHref(authorityId: string, opts: { paragraphId?: string | null; reportId?: string; claimIndex?: number } = {}): string {
  const params = new URLSearchParams();
  if (opts.paragraphId) params.set("para", opts.paragraphId);
  if (opts.reportId) params.set("report", opts.reportId);
  if (opts.claimIndex) params.set("claim", String(opts.claimIndex));
  const query = params.toString();
  return `/sources/${authorityId}${query ? `?${query}` : ""}`;
}
