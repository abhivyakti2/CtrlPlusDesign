import type { ArchitectureNode, Relationship, Shape, Arrow } from "@/types/canvas";

export interface ArchitectureDocumentGraph {
  nodes: Record<string, ArchitectureNode>;
  relationships: Record<string, Relationship>;
  hierarchy: Record<string, string[]>;
  groups: Record<string, string[]>;
  dependencyGraph: Record<string, string[]>;
}

function inferNodeFromShape(shape: Shape): ArchitectureNode {
  const semantic = shape.metadata?.semanticData ?? {
    nodeType: shape.metadata?.nodeType ?? "custom",
    role: shape.metadata?.semanticRole,
    technologies: shape.metadata?.techStack ?? [],
    protocols: (shape.metadata?.ports ?? []).map((port) => port.protocol),
  };

  return {
    id: shape.id,
    visual: {
      x: shape.x,
      y: shape.y,
      width: shape.w,
      height: shape.h,
      collapsed: false,
      selected: false,
      zIndex: shape.zIndex ?? 0,
      style: {
        fill: shape.fillColor,
        stroke: shape.strokeColor,
        opacity: shape.opacity,
      },
    },
    semantic,
    content: shape.metadata?.contentStore ?? {
      documents: [],
      codeArtifacts: [],
      schemas: [],
      notes: [],
      comments: [],
    },
    runtime: shape.metadata?.runtime,
    ai: shape.metadata?.aiContext,
  };
}

function inferRelationshipFromArrow(arrow: Arrow): Relationship {
  return {
    id: arrow.id,
    sourceNodeId: arrow.fromShapeId,
    targetNodeId: arrow.toShapeId,
    type: arrow.semanticType ?? "depends-on",
    protocol: typeof arrow.metadata?.protocol === "string" ? arrow.metadata.protocol : undefined,
    communicationPattern:
      typeof arrow.metadata?.communicationPattern === "string"
        ? (arrow.metadata.communicationPattern as "sync" | "async" | "stream" | "batch")
        : undefined,
    metadata: arrow.metadata,
  };
}

export function buildArchitectureGraphFromCanvas(
  shapes: Iterable<Shape>,
  arrows: Iterable<Arrow>
): ArchitectureDocumentGraph {
  const nodes: Record<string, ArchitectureNode> = {};
  const relationships: Record<string, Relationship> = {};
  const hierarchy: Record<string, string[]> = {};
  const groups: Record<string, string[]> = {};
  const dependencyGraph: Record<string, string[]> = {};

  for (const shape of shapes) {
    nodes[shape.id] = inferNodeFromShape(shape);
    dependencyGraph[shape.id] = [];

    if (shape.children?.length) {
      hierarchy[shape.id] = [...shape.children];
    }

    if (shape.groupId) {
      groups[shape.groupId] = groups[shape.groupId] ?? [];
      groups[shape.groupId].push(shape.id);
    }
  }

  for (const arrow of arrows) {
    const relationship = inferRelationshipFromArrow(arrow);
    relationships[relationship.id] = relationship;

    dependencyGraph[relationship.sourceNodeId] = dependencyGraph[relationship.sourceNodeId] ?? [];
    dependencyGraph[relationship.sourceNodeId].push(relationship.targetNodeId);
  }

  return {
    nodes,
    relationships,
    hierarchy,
    groups,
    dependencyGraph,
  };
}
