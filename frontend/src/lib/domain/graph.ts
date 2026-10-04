import type { Authority, Claim, EvidenceRelationship, ReportBundle, TreatmentKind, VerificationStatus } from "@/lib/types/domain";
import { yearOf } from "./format";
import { RELATIONSHIP_META, TREATMENT_META } from "./labels";
import { claimCitations, claimEvidence, findAuthority, findParagraph } from "./report";
import { STATUS_META } from "./status";

/**
 * Builds Evidence Graph nodes and edges from a report bundle. Layout is
 * computed here (deterministic columns) so the renderer stays thin and the
 * same data can feed the canvas and the mobile chain view.
 */

export type GraphNodeKind = "claim" | "provision" | "case" | "paragraph" | "evidence" | "unresolved" | "unavailable";

export type GraphRelation =
  | "cites"
  | "interpreted_in"
  | "at_paragraph"
  | "contains"
  | "not_located"
  | EvidenceRelationship
  | TreatmentKind;

export type RelationshipFilter = "supports" | "partially_supports" | "contradicts" | "treatment" | "unresolved";

export const RELATIONSHIP_FILTER_LABEL: Record<RelationshipFilter, string> = {
  supports: "Supports",
  partially_supports: "Partially supports",
  contradicts: "Contradicts",
  treatment: "Later treatment",
  unresolved: "Unresolved citations",
};

export const NODE_KIND_LABEL: Record<GraphNodeKind, string> = {
  claim: "Claim",
  provision: "Legal Provision",
  case: "Case Authority",
  paragraph: "Paragraph",
  evidence: "Evidence",
  unresolved: "Unresolved Citation",
  unavailable: "Unavailable Source",
};

/** A type alias (not an interface) so it satisfies React Flow's Record<string, unknown> data constraint. */
export type GraphNodeData = {
  kind: GraphNodeKind;
  label: string;
  sublabel?: string;
  tooltip: string;
  status?: VerificationStatus;
  claimIndex?: number;
  authorityId?: string;
  paragraphId?: string;
  evidenceId?: string;
  relationship?: EvidenceRelationship;
};

export interface GraphNodeModel {
  id: string;
  x: number;
  y: number;
  data: GraphNodeData;
}

export interface GraphEdgeModel {
  id: string;
  source: string;
  target: string;
  relation: GraphRelation;
  label: string;
  tooltip: string;
  /** Edges from evidence back to the claim route underneath the chain. */
  returnEdge?: boolean;
  /** Treatment edges between cases in the same column. */
  sideEdge?: boolean;
}

export interface GraphModel {
  nodes: GraphNodeModel[];
  edges: GraphEdgeModel[];
}

const COL = 225;
const ROW = 112;

export function relationFilter(relation: GraphRelation): RelationshipFilter | null {
  switch (relation) {
    case "supports":
    case "supports_overruled":
    case "context":
      return "supports";
    case "partially_supports":
      return "partially_supports";
    case "contradicts":
      return "contradicts";
    case "followed":
    case "distinguished":
    case "modified":
    case "reconsidered":
    case "overruled":
      return "treatment";
    case "not_located":
      return "unresolved";
    default:
      return null;
  }
}

export function relationLabel(relation: GraphRelation): string {
  switch (relation) {
    case "cites":
      return "Cites";
    case "interpreted_in":
      return "Interpreted in";
    case "at_paragraph":
      return "At paragraph";
    case "contains":
      return "Contains";
    case "not_located":
      return "Not located";
    case "followed":
    case "distinguished":
    case "modified":
    case "reconsidered":
    case "overruled":
      return TREATMENT_META[relation].past;
    default:
      return RELATIONSHIP_META[relation].edge;
  }
}

function truncate(text: string, n: number) {
  return text.length > n ? `${text.slice(0, n - 1)}…` : text;
}

function authorityNode(a: Authority): GraphNodeData {
  if (a.type === "case") {
    return {
      kind: "case",
      label: `${a.shortTitle} (${yearOf(a.decidedOn)})`,
      sublabel: a.citation,
      tooltip: `Case law · ${a.title} · ${a.citation} · ${a.court ?? ""}`,
      authorityId: a.id,
    };
  }
  return {
    kind: "provision",
    label: a.shortTitle,
    sublabel: a.type === "constitutional_provision" ? "Constitutional provision" : "Statutory provision",
    tooltip: `${a.type === "constitutional_provision" ? "Constitutional provision" : "Statutory provision"} · ${a.title}`,
    authorityId: a.id,
  };
}

function claimNode(claim: Claim): GraphNodeData {
  const status = STATUS_META[claim.status].label;
  return {
    kind: "claim",
    label: `Claim ${claim.index}`,
    sublabel: truncate(claim.text, 64),
    tooltip: `Claim ${claim.index} · ${status}. ${claim.text}`,
    status: claim.status,
    claimIndex: claim.index,
  };
}

function edge(source: string, target: string, relation: GraphRelation, sourceLabel: string, targetLabel: string, extra: Partial<GraphEdgeModel> = {}): GraphEdgeModel {
  const label = relationLabel(relation);
  return {
    id: `${source}->${target}:${relation}`,
    source,
    target,
    relation,
    label,
    tooltip: `${sourceLabel} ${label.toLowerCase()} ${targetLabel}`,
    ...extra,
  };
}

/** Focused graph for one claim: Claim → Provision → Authority → Paragraph → Evidence → Claim. */
export function buildClaimGraph(bundle: ReportBundle, claim: Claim, opts: { expanded?: string[] } = {}): GraphModel {
  const nodes = new Map<string, GraphNodeModel>();
  const edges: GraphEdgeModel[] = [];
  const claimId = `claim-${claim.index}`;
  const claimData = claimNode(claim);
  const citations = claimCitations(bundle, claim);
  const evidence = claimEvidence(bundle, claim);

  // Rows: one per evidence item, then unresolved citations, then cited authorities without evidence.
  const authorityRow = new Map<string, number>();
  let row = 0;
  const evidenceRows = evidence.map((e) => {
    const r = row++;
    if (!authorityRow.has(e.authorityId)) authorityRow.set(e.authorityId, r);
    return r;
  });
  for (const c of citations) {
    if (c.authorityId && !authorityRow.has(c.authorityId)) authorityRow.set(c.authorityId, row++);
  }

  // Expanded authorities bring in their treating authorities.
  for (const id of opts.expanded ?? []) {
    const a = findAuthority(bundle, id);
    for (const t of a?.treatments ?? []) {
      if (!authorityRow.has(t.byAuthorityId)) authorityRow.set(t.byAuthorityId, row++);
    }
  }

  const authorityIds = [...authorityRow.keys()];
  const hasProvision = authorityIds.some((id) => findAuthority(bundle, id)?.type !== "case");
  const colOf = (kind: GraphNodeKind) => {
    const shift = hasProvision ? 0 : 1;
    switch (kind) {
      case "claim":
        return 0;
      case "provision":
        return 1;
      case "case":
      case "unresolved":
      case "unavailable":
        return 2 - shift;
      case "paragraph":
        return 3 - shift;
      case "evidence":
        return 4 - shift;
    }
  };

  for (const id of authorityIds) {
    const a = findAuthority(bundle, id);
    if (!a) continue;
    const data = authorityNode(a);
    nodes.set(`auth-${id}`, { id: `auth-${id}`, x: colOf(data.kind) * COL, y: authorityRow.get(id)! * ROW, data });
  }

  evidence.forEach((e, i) => {
    const a = findAuthority(bundle, e.authorityId);
    const p = findParagraph(a, e.paragraphId);
    const r = evidenceRows[i];
    const paraId = `para-${e.authorityId}-${e.paragraphId}`;
    if (!nodes.has(paraId)) {
      nodes.set(paraId, {
        id: paraId,
        x: colOf("paragraph") * COL,
        y: r * ROW,
        data: {
          kind: "paragraph",
          label: p?.label ?? e.paragraphId,
          tooltip: `${p?.label.startsWith("¶") ? `Paragraph ${e.paragraphId}` : p?.label} of ${a?.title ?? ""}`,
          authorityId: e.authorityId,
          paragraphId: e.paragraphId,
        },
      });
      edges.push(edge(`auth-${e.authorityId}`, paraId, "at_paragraph", a?.shortTitle ?? "", p?.label ?? ""));
    }
    const evId = `ev-${e.id}`;
    nodes.set(evId, {
      id: evId,
      x: colOf("evidence") * COL,
      y: r * ROW,
      data: {
        kind: "evidence",
        label: `Evidence · ${p?.label ?? ""}`,
        sublabel: `“${truncate(e.highlight, 52)}”`,
        tooltip: `${e.highlight} — ${RELATIONSHIP_META[e.relationship].chip}`,
        authorityId: e.authorityId,
        paragraphId: e.paragraphId,
        evidenceId: e.id,
        relationship: e.relationship,
      },
    });
    edges.push(edge(paraId, evId, "contains", p?.label ?? "", "evidence"));
    edges.push(edge(evId, claimId, e.relationship, `${a?.shortTitle ?? ""} ${p?.label ?? ""}`, `Claim ${claim.index}`, { returnEdge: true }));
  });

  for (const c of citations) {
    if (c.authorityId) {
      const a = findAuthority(bundle, c.authorityId);
      edges.push(edge(claimId, `auth-${c.authorityId}`, "cites", `Claim ${claim.index}`, a?.shortTitle ?? ""));
      continue;
    }
    const kind: GraphNodeKind = c.resolution === "source_not_available" ? "unavailable" : "unresolved";
    const id = `unres-${c.id}`;
    nodes.set(id, {
      id,
      x: colOf(kind) * COL,
      y: row++ * ROW,
      data: {
        kind,
        label: kind === "unavailable" ? "Source not available" : "Citation not located",
        sublabel: truncate(c.rawText, 48),
        tooltip:
          kind === "unavailable"
            ? "This type of source is not among the sources available to the platform."
            : "This citation could not be located in available sources.",
      },
    });
    edges.push(edge(claimId, id, "not_located", `Claim ${claim.index}`, c.rawText));
  }

  addAuthorityLinks(bundle, nodes, edges);

  const rows = Math.max(row, 1);
  nodes.set(claimId, { id: claimId, x: 0, y: ((rows - 1) * ROW) / 2, data: claimData });
  return { nodes: [...nodes.values()], edges };
}

/** Treatment and "interpreted in" edges between authorities already in the graph. */
function addAuthorityLinks(bundle: ReportBundle, nodes: Map<string, GraphNodeModel>, edges: GraphEdgeModel[]) {
  // Links between nodes stacked in one column route around the side.
  const sameColumn = (x: string, y: string) => nodes.get(`auth-${x}`)?.x === nodes.get(`auth-${y}`)?.x;
  for (const a of bundle.authorities) {
    if (!nodes.has(`auth-${a.id}`)) continue;
    for (const t of a.treatments) {
      if (!nodes.has(`auth-${t.byAuthorityId}`)) continue;
      const by = findAuthority(bundle, t.byAuthorityId);
      edges.push(edge(`auth-${a.id}`, `auth-${t.byAuthorityId}`, t.kind, a.shortTitle, by?.shortTitle ?? "", { sideEdge: sameColumn(a.id, t.byAuthorityId) }));
    }
    for (const p of a.interprets) {
      if (!nodes.has(`auth-${p}`)) continue;
      const provision = findAuthority(bundle, p);
      edges.push(edge(`auth-${p}`, `auth-${a.id}`, "interpreted_in", provision?.shortTitle ?? "", a.shortTitle, { sideEdge: sameColumn(p, a.id) }));
    }
  }
}

/** Whole-report graph: claims on the left, authorities on the right. */
export function buildReportGraph(bundle: ReportBundle): GraphModel {
  const nodes = new Map<string, GraphNodeModel>();
  const edges: GraphEdgeModel[] = [];
  const CLAIM_ROW = 86;

  bundle.claims.forEach((claim, i) => {
    nodes.set(`claim-${claim.index}`, { id: `claim-${claim.index}`, x: 0, y: i * CLAIM_ROW, data: claimNode(claim) });
  });

  const cited: string[] = [];
  const unresolved: { id: string; data: GraphNodeData; claimIndex: number }[] = [];
  for (const claim of bundle.claims) {
    for (const c of claimCitations(bundle, claim)) {
      if (c.authorityId) {
        if (!cited.includes(c.authorityId)) cited.push(c.authorityId);
      } else {
        const kind: GraphNodeKind = c.resolution === "source_not_available" ? "unavailable" : "unresolved";
        unresolved.push({
          id: `unres-${c.id}`,
          claimIndex: claim.index,
          data: {
            kind,
            label: kind === "unavailable" ? "Source not available" : "Citation not located",
            sublabel: truncate(c.rawText, 48),
            tooltip: kind === "unavailable" ? "This type of source is not among the sources available to the platform." : "This citation could not be located in available sources.",
          },
        });
      }
    }
    for (const e of claimEvidence(bundle, claim)) if (!cited.includes(e.authorityId)) cited.push(e.authorityId);
  }

  const right = [...cited.map((id) => ({ id: `auth-${id}`, data: authorityNode(findAuthority(bundle, id)!) })), ...unresolved];
  const span = (bundle.claims.length - 1) * CLAIM_ROW;
  const gap = right.length > 1 ? span / (right.length - 1) : 0;
  right.forEach((n, i) => nodes.set(n.id, { id: n.id, x: COL * 1.9, y: i * gap, data: n.data }));

  for (const claim of bundle.claims) {
    const claimId = `claim-${claim.index}`;
    const linked = new Set<string>();
    for (const e of claimEvidence(bundle, claim)) {
      const key = `${e.authorityId}:${e.relationship}`;
      if (linked.has(key)) continue;
      linked.add(key);
      const a = findAuthority(bundle, e.authorityId);
      // Drawn left-to-right (claim → authority); the label still reads authority → claim.
      const built = edge(`auth-${e.authorityId}`, claimId, e.relationship, a?.shortTitle ?? "", `Claim ${claim.index}`);
      edges.push({ ...built, source: claimId, target: built.source });
    }
    for (const c of claimCitations(bundle, claim)) {
      if (!c.authorityId) edges.push(edge(claimId, `unres-${c.id}`, "not_located", `Claim ${claim.index}`, c.rawText));
    }
  }

  addAuthorityLinks(bundle, nodes, edges);
  return { nodes: [...nodes.values()], edges };
}

export function graphCounts(bundle: ReportBundle) {
  const located = new Set(bundle.citations.filter((c) => c.authorityId).map((c) => c.authorityId));
  const unresolved = bundle.citations.filter((c) => !c.authorityId).length;
  return { claims: bundle.claims.length, located: located.size, unresolved };
}
