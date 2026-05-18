import type { ArchitectureNode, ArchitectureEdge, RelationshipType } from "@/types/architecture";

export const REL_LABELS: Record<RelationshipType, string> = {
  "api-call":       "API call",
  "async-event":    "async event",
  "data-read":      "reads",
  "data-write":     "writes",
  "data-readwrite": "read/write",
  "replication":    "replicates",
  "cache-lookup":   "cache",
  "auth-check":     "authenticates",
  "owns":           "owns",
  "depends-on":     "depends on",
  "extends":        "extends",
  "implements":     "implements",
  "deploys-to":     "deploys to",
  "load-balances":  "balances",
  "routes-to":      "routes to",
  "custom":         "→",
};

export function relColor(type: RelationshipType): string {
  const map: Partial<Record<RelationshipType, string>> = {
    "api-call":       "#5b7fff",
    "async-event":    "#f59e0b",
    "data-read":      "#3ecf8e",
    "data-write":     "#ef4444",
    "data-readwrite": "#f97316",
    "replication":    "#a78bfa",
    "cache-lookup":   "#06b6d4",
    "auth-check":     "#d946ef",
    "load-balances":  "#ec4899",
    "routes-to":      "#8b5cf6",
    "owns":           "#4b5563",
    "depends-on":     "#6b7280",
  };
  return map[type] ?? "#6b7280";
}

export function relStroke(type: RelationshipType): "solid" | "dashed" | "dotted" {
  if (type === "async-event" || type === "depends-on") return "dashed";
  if (type === "replication") return "dotted";
  return "solid";
}

export function relLabel(type: RelationshipType): string { return REL_LABELS[type] ?? "→"; }

function terms(node?: ArchitectureNode): string {
  if (!node) return "";
  const parts = [ node.nodeType, node.title, node.semantics.role ?? "", ...(node.semantics.technology ?? []), ];
  return parts.join(" ").toLowerCase();
}

export function inferRelationshipType(from?: ArchitectureNode, to?: ArchitectureNode): RelationshipType {
  const f = terms(from);
  const t = terms(to);

  if (from?.nodeType === "load-balancer") return "load-balances";
  if (from?.nodeType === "gateway") return "routes-to";
  if (from?.nodeType === "auth" || f.includes("auth")) return "auth-check";

  if (
    (from?.nodeType === "frontend" || from?.nodeType === "mobile" || f.includes("frontend") || f.includes("ui")) &&
    (to?.nodeType === "service" || to?.nodeType === "gateway")
  ) return "api-call";

  if (
    (from?.nodeType === "service" || from?.nodeType === "worker") &&
    (to?.nodeType === "queue" || t.includes("queue") || t.includes("kafka") || t.includes("topic"))
  ) return "async-event";

  if ((from?.nodeType === "queue") && (to?.nodeType === "worker" || to?.nodeType === "service")) return "async-event";

  if (to?.nodeType === "cache" || t.includes("redis") || t.includes("memcache") || t.includes("cache")) return "cache-lookup";

  if (from?.nodeType === "database" && to?.nodeType === "database") return "replication";

  if (to?.nodeType === "database" || t.includes("database") || t.includes("db") || t.includes("postgres") || t.includes("mysql")) return "data-write";

  if (from?.nodeType === "container" || from?.nodeType === "group") return "owns";

  if (from?.nodeType === "service" && to?.nodeType === "service") return "api-call";

  return "depends-on";
}

export interface SemanticGraphSummary {
  nodes: Array<{ id: string; type: string; title: string; role?: string; technology?: string[]; scalingType?: string; childCount: number }>;
  edges: Array<{ id: string; from: string; to: string; relationship: string; protocol?: string }>;
  stats: { totalNodes: number; totalEdges: number; hasCaching: boolean; hasQueue: boolean; hasLoadBalancer: boolean; hasAuth: boolean; hasCDN: boolean; hasMonitoring: boolean; databaseCount: number; serviceCount: number };
}

export function buildSemanticSummary(nodes: Record<string, ArchitectureNode>, edges: Record<string, ArchitectureEdge>): SemanticGraphSummary {
  const nodeList = Object.values(nodes);
  const edgeList = Object.values(edges);
  return {
    nodes: nodeList.map(n => ({ id: n.id, type: n.nodeType, title: n.title, role: n.semantics.role, technology: n.semantics.technology, scalingType: n.semantics.scalingType, childCount: n.children.length })),
    edges: edgeList.map(e => ({ id: e.id, from: nodes[e.fromNodeId]?.title ?? e.fromNodeId, to: nodes[e.toNodeId]?.title ?? e.toNodeId, relationship: e.relationshipType, protocol: e.protocol })),
    stats: {
      totalNodes: nodeList.length,
      totalEdges: edgeList.length,
      hasCaching: nodeList.some(n => n.nodeType === "cache"),
      hasQueue: nodeList.some(n => n.nodeType === "queue"),
      hasLoadBalancer: nodeList.some(n => n.nodeType === "load-balancer"),
      hasAuth: nodeList.some(n => n.nodeType === "auth"),
      hasCDN: nodeList.some(n => n.nodeType === "cdn"),
      hasMonitoring: nodeList.some(n => n.nodeType === "monitoring"),
      databaseCount: nodeList.filter(n => n.nodeType === "database").length,
      serviceCount: nodeList.filter(n => n.nodeType === "service").length,
    },
  };
}
