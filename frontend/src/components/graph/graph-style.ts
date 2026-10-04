import type { GraphNodeKind, GraphRelation } from "@/lib/domain/graph";

const GRAY = "#98a2b3";

export interface EdgeStyle {
  color: string;
  dash?: string;
  width: number;
}

/** Line style per relationship (spec §8.3). Dash patterns keep meaning without colour. */
export function edgeStyle(relation: GraphRelation): EdgeStyle {
  switch (relation) {
    case "supports":
      return { color: "var(--color-supported)", width: 2 };
    case "partially_supports":
      return { color: "var(--color-partial)", dash: "7 4", width: 2 };
    case "contradicts":
      return { color: "var(--color-unsupported)", width: 2.25 };
    case "supports_overruled":
      return { color: "var(--color-supported)", dash: "2 4", width: 1.75 };
    case "context":
      return { color: "var(--color-unverified)", dash: "2 3", width: 1.5 };
    case "overruled":
      return { color: "var(--color-accent)", width: 2 };
    case "followed":
      return { color: "var(--color-accent)", width: 1.75 };
    case "distinguished":
    case "modified":
    case "reconsidered":
      return { color: "var(--color-accent)", dash: "6 4", width: 1.75 };
    case "not_located":
      return { color: GRAY, dash: "5 4", width: 1.5 };
    default:
      return { color: GRAY, width: 1.25 };
  }
}

export const NODE_STYLE: Record<GraphNodeKind, string> = {
  claim: "border-ink/70 bg-surface",
  provision: "border-primary/50 bg-primary-soft",
  case: "border-navy-700/40 bg-surface",
  paragraph: "border-border-strong bg-canvas",
  evidence: "border-border-strong bg-highlight-row",
  unresolved: "border-dashed border-unverified/60 bg-unverified-bg",
  unavailable: "border-dashed border-unverified/60 bg-unverified-bg",
};

export const LEGEND: { relation: GraphRelation; label: string }[] = [
  { relation: "supports", label: "Supports" },
  { relation: "partially_supports", label: "Partially supports" },
  { relation: "contradicts", label: "Contradicts" },
  { relation: "supports_overruled", label: "Supports — authority overruled" },
  { relation: "overruled", label: "Later treatment" },
  { relation: "cites", label: "Cites / structure" },
  { relation: "not_located", label: "Not located" },
];
