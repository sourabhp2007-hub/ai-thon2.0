"use client";

import {
  BaseEdge,
  EdgeLabelRenderer,
  getBezierPath,
  getSmoothStepPath,
  Handle,
  Position,
  type Edge,
  type EdgeProps,
  type Node,
  type NodeProps,
} from "@xyflow/react";
import { memo } from "react";
import { StatusIcon } from "@/components/verification/status";
import { NODE_KIND_LABEL, type GraphEdgeModel, type GraphNodeData } from "@/lib/domain/graph";
import { cn } from "@/lib/utils/cn";
import { edgeStyle, NODE_STYLE } from "./graph-style";

export type FlowNodeData = GraphNodeData & { dimmed?: boolean; selected?: boolean; compact?: boolean };
export type FlowNode = Node<FlowNodeData, "evidence">;
export type FlowEdgeData = { model: GraphEdgeModel; dimmed?: boolean; showLabel?: boolean };
export type FlowEdge = Edge<FlowEdgeData, "relation">;

const hidden = "!size-1.5 !min-w-0 !border-0 !bg-transparent";

/** One renderer for every node kind; kind sets the styling and eyebrow. */
export const GraphNode = memo(function GraphNode({ data }: NodeProps<FlowNode>) {
  return (
    <div
      title={data.tooltip}
      className={cn(
        "relative rounded-lg border px-3 py-2 shadow-[0_1px_2px_rgba(16,24,40,0.06)] transition-opacity",
        data.compact ? "w-[176px]" : "w-[200px]",
        NODE_STYLE[data.kind],
        data.dimmed && "opacity-30",
        data.selected && "ring-2 ring-primary ring-offset-1",
      )}
    >
      <Handle type="target" position={Position.Left} id="l" className={hidden} />
      <Handle type="source" position={Position.Right} id="r" className={hidden} />
      <Handle type="source" position={Position.Bottom} id="b" className={hidden} />
      <Handle type="target" position={Position.Bottom} id="bt" className={hidden} />
      <Handle type="source" position={Position.Right} id="rs" className={hidden} />
      <Handle type="target" position={Position.Right} id="rt" className={hidden} />
      <p className="flex items-center gap-1 text-[10px] font-semibold tracking-[0.08em] text-muted uppercase">
        {data.status && <StatusIcon status={data.status} className="size-3" />}
        {NODE_KIND_LABEL[data.kind]}
      </p>
      <p className={cn("mt-0.5 text-[13px] leading-snug font-semibold text-ink", data.kind === "case" && "font-serif text-[14px]")}>{data.label}</p>
      {data.sublabel && (
        <p className={cn("mt-0.5 line-clamp-2 text-[11.5px] leading-snug text-muted", data.kind === "evidence" && "font-serif text-[12px] text-ink/75")}>
          {data.sublabel}
        </p>
      )}
    </div>
  );
});

export const RelationEdge = memo(function RelationEdge(props: EdgeProps<FlowEdge>) {
  const { sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, data, markerEnd } = props;
  const model = data!.model;
  const style = edgeStyle(model.relation);
  const [path, labelX, labelY] =
    model.returnEdge || model.sideEdge
      ? getSmoothStepPath({ sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, borderRadius: 14, offset: model.sideEdge ? 28 : 36 })
      : getBezierPath({ sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition });

  return (
    <>
      <BaseEdge
        id={props.id}
        path={path}
        markerEnd={markerEnd}
        interactionWidth={14}
        style={{ stroke: style.color, strokeWidth: style.width, strokeDasharray: style.dash, opacity: data?.dimmed ? 0.15 : 1, transition: "opacity 150ms" }}
      />
      {data?.showLabel && !data.dimmed && (
        <EdgeLabelRenderer>
          <div
            className="nodrag nopan pointer-events-auto absolute rounded border border-border bg-surface px-1.5 py-px text-[10.5px] font-medium whitespace-nowrap text-ink/80"
            style={{ transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`, color: style.color === "#98a2b3" ? undefined : style.color }}
            title={model.tooltip}
          >
            {model.label}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
});

export const edgeTypes = { relation: RelationEdge };
