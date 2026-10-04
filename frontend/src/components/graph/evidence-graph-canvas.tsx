"use client";

import { Background, MarkerType, Panel, ReactFlow, ReactFlowProvider, useNodesState, useReactFlow } from "@xyflow/react";
import { Maximize2, RotateCcw, ZoomIn, ZoomOut } from "lucide-react";
import { createContext, useContext, useMemo, type ReactNode } from "react";
import { Tooltip } from "@/components/ui/tooltip";
import { relationFilter, type GraphModel, type RelationshipFilter } from "@/lib/domain/graph";
import { edgeTypes, GraphNode, type FlowEdge, type FlowNode } from "./graph-elements";
import { edgeStyle } from "./graph-style";

/** Selection is shared through context so dimming never rewrites node objects. */
const SelectionContext = createContext<{ selected: string | null; neighbours: Set<string>; compact: boolean }>({
  selected: null,
  neighbours: new Set(),
  compact: false,
});

function SelectableNode(props: Parameters<typeof GraphNode>[0]) {
  const { selected, neighbours, compact } = useContext(SelectionContext);
  const data = { ...props.data, compact, selected: selected === props.id, dimmed: selected !== null && !neighbours.has(props.id) };
  return <GraphNode {...props} data={data} />;
}

const nodeTypes = { evidence: SelectableNode };

export type CanvasMode = "focused" | "report" | "mini";

interface CanvasProps {
  model: GraphModel;
  mode: CanvasMode;
  filters?: Set<RelationshipFilter>;
  selected?: string | null;
  onSelect?: (id: string | null) => void;
  onReset?: () => void;
  label: string;
}

function ControlButton({ label, onClick, children }: { label: string; onClick: () => void; children: ReactNode }) {
  return (
    <Tooltip content={label} side="left">
      <button type="button" aria-label={label} onClick={onClick} className="flex size-8 items-center justify-center text-muted hover:bg-canvas hover:text-ink">
        {children}
      </button>
    </Tooltip>
  );
}

function CanvasControls({ onReset }: { onReset?: () => void }) {
  const { zoomIn, zoomOut, fitView } = useReactFlow();
  return (
    <Panel position="top-right">
      <div className="flex flex-col divide-y divide-border overflow-hidden rounded-md border border-border bg-surface shadow-sm">
        <ControlButton label="Zoom in" onClick={() => zoomIn({ duration: 150 })}>
          <ZoomIn className="size-4" aria-hidden />
        </ControlButton>
        <ControlButton label="Zoom out" onClick={() => zoomOut({ duration: 150 })}>
          <ZoomOut className="size-4" aria-hidden />
        </ControlButton>
        <ControlButton label="Fit to screen" onClick={() => fitView({ duration: 200, padding: 0.15 })}>
          <Maximize2 className="size-4" aria-hidden />
        </ControlButton>
        {onReset && (
          <ControlButton label="Reset layout" onClick={onReset}>
            <RotateCcw className="size-4" aria-hidden />
          </ControlButton>
        )}
      </div>
    </Panel>
  );
}

function Canvas({ model, mode, filters, selected = null, onSelect, onReset, label }: CanvasProps) {
  const [nodes, , onNodesChange] = useNodesState<FlowNode>(
    model.nodes.map((n) => ({
      id: n.id,
      type: "evidence",
      position: { x: n.x, y: n.y },
      data: n.data,
      ariaLabel: n.data.tooltip,
      draggable: mode !== "mini",
      selectable: mode !== "mini",
    })),
  );

  const visibleEdges = useMemo(
    () =>
      model.edges.filter((e) => {
        const f = relationFilter(e.relation);
        return !f || !filters || filters.has(f);
      }),
    [model.edges, filters],
  );

  const neighbours = useMemo(() => {
    const set = new Set<string>();
    if (!selected) return set;
    set.add(selected);
    for (const e of visibleEdges) {
      if (e.source === selected) set.add(e.target);
      if (e.target === selected) set.add(e.source);
    }
    return set;
  }, [selected, visibleEdges]);

  const edges: FlowEdge[] = useMemo(
    () =>
      visibleEdges.map((e) => ({
        id: e.id,
        source: e.source,
        target: e.target,
        type: "relation",
        sourceHandle: e.returnEdge ? "b" : e.sideEdge ? "rs" : "r",
        targetHandle: e.returnEdge ? "bt" : e.sideEdge ? "rt" : "l",
        markerEnd: { type: MarkerType.ArrowClosed, width: 14, height: 14, color: edgeStyle(e.relation).color },
        data: {
          model: e,
          dimmed: selected !== null && e.source !== selected && e.target !== selected,
          // Structural edges are self-explanatory from node kinds; their labels would be clipped.
          showLabel:
            e.relation !== "at_paragraph" &&
            e.relation !== "contains" &&
            (mode !== "report" || (selected !== null && (e.source === selected || e.target === selected))),
        },
        ariaLabel: e.tooltip,
      })),
    [visibleEdges, selected, mode],
  );

  const interactive = mode !== "mini";

  return (
    <SelectionContext.Provider value={{ selected, neighbours, compact: mode === "mini" }}>
      <div
        className="h-full w-full"
        role="group"
        aria-label={label}
        onKeyDown={(e) => {
          if (e.key === "Escape") onSelect?.(null);
        }}
      >
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          onNodesChange={onNodesChange}
          onNodeClick={(_, node) => onSelect?.(node.id === selected ? null : node.id)}
          onPaneClick={() => onSelect?.(null)}
          // The all-claims view is tall: open it at a readable zoom and let the user pan.
          fitView={mode !== "report"}
          defaultViewport={mode === "report" ? { x: 48, y: 24, zoom: 0.85 } : undefined}
          fitViewOptions={{ padding: mode === "mini" ? 0.08 : 0.12, maxZoom: 1.1 }}
          minZoom={0.2}
          maxZoom={1.75}
          nodesConnectable={false}
          elementsSelectable={interactive}
          nodesFocusable={interactive}
          edgesFocusable={false}
          panOnDrag={interactive}
          zoomOnScroll={interactive}
          zoomOnPinch={interactive}
          zoomOnDoubleClick={false}
          preventScrolling={interactive}
          proOptions={{ hideAttribution: true }}
        >
          <Background gap={20} size={1} color="#262626" />
          {interactive && <CanvasControls onReset={onReset} />}
        </ReactFlow>
      </div>
    </SelectionContext.Provider>
  );
}

/** Evidence Graph canvas. Loaded with next/dynamic (client only). */
export default function EvidenceGraphCanvas(props: CanvasProps) {
  return (
    <ReactFlowProvider>
      <Canvas {...props} />
    </ReactFlowProvider>
  );
}
