// ARCHITECTURE DOCUMENT MODEL
// The canvas is a VIEW. This is the real product — a semantic graph.

// ─── Node Types
export type NodeType =
  | "service"
  | "database"
  | "cache"
  | "queue"
  | "gateway"
  | "load-balancer"
  | "cdn"
  | "auth"
  | "frontend"
  | "mobile"
  | "worker"
  | "scheduler"
  | "storage"
  | "monitoring"
  | "container"
  | "group"
  | "code"
  | "markdown"
  | "annotation";

// ─── Relationship Types
export type RelationshipType =
  | "api-call"
  | "async-event"
  | "data-read"
  | "data-write"
  | "data-readwrite"
  | "replication"
  | "cache-lookup"
  | "auth-check"
  | "owns"
  | "depends-on"
  | "extends"
  | "implements"
  | "deploys-to"
  | "load-balances"
  | "routes-to"
  | "custom";

// ─── Content Block Types
export type CodeLanguage =
  | "typescript" | "javascript" | "python" | "java" | "go"
  | "rust" | "cpp" | "csharp" | "ruby" | "swift"
  | "sql" | "graphql" | "json" | "yaml" | "toml"
  | "markdown" | "bash" | "proto" | "openapi" | "dockerfile";

export interface CodeBlock {
  id: string;
  language: CodeLanguage;
  code: string;
  title: string;
  collapsed: boolean;
  blockRole?: "implementation" | "api-schema" | "sql-schema" | "json-schema" | "config" | "snippet";
}

export interface RichTextBlock {
  id: string;
  markdown: string;
  title?: string;
}

export interface AnnotationThread {
  id: string;
  markdown: string;
  author?: string;
  createdAt: number;
  updatedAt: number;
  resolved: boolean;
  parentId?: string;
}

// ─── Node Content
export interface NodeContent {
  blocks: Array<
    | { kind: "code"; data: CodeBlock }
    | { kind: "richtext"; data: RichTextBlock }
    | { kind: "annotation"; data: AnnotationThread }
  >;
}

// ─── Node Semantics
export interface NodeSemantics {
  role?: string;
  technology?: string[];
  scalingType?: "horizontal" | "vertical" | "auto" | "none";
  availabilityTier?: "99.9" | "99.99" | "99.999";
  consistencyModel?: "strong" | "eventual" | "causal" | "session";
  trafficPattern?: "read-heavy" | "write-heavy" | "balanced" | "bursty";
  replicationFactor?: number;
  slaMs?: number;
  teamOwner?: string;
  ports?: Array<{ name: string; number: number; protocol: string }>;
}

// ─── Visual Geometry
export interface NodeVisual {
  x: number;
  y: number;
  w: number;
  h: number;
  zIndex: number;
  collapsed?: boolean;
  color?: string;
  locked?: boolean;
}

// ─── Architecture Node
export interface ArchitectureNode {
  id: string;
  nodeType: NodeType;
  title: string;
  visual: NodeVisual;
  content: NodeContent;
  semantics: NodeSemantics;
  children: string[];
  parentId?: string;
  groupId?: string;
}

// ─── Architecture Edge
export interface ArchitectureEdge {
  id: string;
  fromNodeId: string;
  toNodeId: string;
  relationshipType: RelationshipType;
  label?: string;
  description?: string;
  protocol?: "HTTP" | "HTTPS" | "gRPC" | "WebSocket" | "AMQP" | "MQTT" | "TCP" | "UDP";
  authRequired?: boolean;
  rateLimited?: boolean;
  timeoutMs?: number;
  bidirectional?: boolean;
  animated?: boolean;
  strokeColor?: string;
  strokeStyle?: "solid" | "dashed" | "dotted";
  strokeWidth?: number;
}

// ─── Architecture Document
export interface ArchitectureDocument {
  id: string;
  version: number;
  timestamp: number;
  nodes: Record<string, ArchitectureNode>;
  edges: Record<string, ArchitectureEdge>;
  roots: string[];
  metadata: { title: string; description?: string; author?: string };
}

// ─── View & UI
export interface ViewState { offsetX: number; offsetY: number; zoom: number; width: number; height: number; }

export type EditorTool =
  | "select"
  | "service" | "database" | "cache" | "queue"
  | "gateway" | "auth" | "cdn" | "load-balancer"
  | "frontend" | "worker" | "storage" | "container"
  | "code" | "markdown" | "annotation"
  | "arrow" | "pan";

export interface EditorUiState {
  currentTool: EditorTool;
  selectedNodeIds: Set<string>;
  selectedEdgeIds: Set<string>;
  openNodeId: string | null;
  editingNodeId: string | null;
  arrowFromNodeId: string | null;
  hoveredNodeId: string | null;
  clipboard: ArchitectureNode[];
  history: ArchitectureDocument[];
  historyIndex: number;
}

export type FindingSeverity = "critical" | "high" | "medium" | "low" | "info";

export interface ArchitectureFinding {
  id: string; severity: FindingSeverity; category: string; title: string; description: string; suggestion: string; affectedNodeIds: string[];
}

export interface ArchitectureEvaluation {
  overallScore: number; scalabilityScore: number; securityScore: number; reliabilityScore: number;
  findings: ArchitectureFinding[]; recommendations: string[]; overallFeedback: string; timestamp: number;
}
