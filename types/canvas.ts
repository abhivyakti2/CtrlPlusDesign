// src/types/canvas.ts

/**
 * Canvas Engine Types
 * Core data structures for the drawing system
 */

export type ShapeType =
  | "rectangle"
  | "rounded-rect"
  | "circle"
  | "database"
  | "cylinder"
  | "api-gateway"
  | "load-balancer"
  | "queue"
  | "redis-cache"
  | "cdn"
  | "kafka"
  | "service"
  | "auth"
  | "message"
  | "comment-bubble"
  | "worker"
  | "storage"
  | "analytics"
  | "external-api"
  | "mobile-client"
  | "browser-client"
  | "server"
  | "cron"
  | "websocket"
  | "arrow"
  | "text"
  | "group"
  | "container"
  | "code-block"
  | "annotation";

export type SemanticRelType =
  | "api-call"
  | "async-event"
  | "data-read"
  | "data-write"
  | "replication"
  | "cache-lookup"
  | "owns"
  | "depends-on"
  | "extends"
  | "implements"
  | "deploys-to"
  | "authenticates"
  | "custom";

export type CodeLanguage =
  | "typescript"
  | "javascript"
  | "python"
  | "java"
  | "go"
  | "rust"
  | "cpp"
  | "sql"
  | "graphql"
  | "json"
  | "yaml"
  | "markdown"
  | "bash"
  | "proto"
  | "openapi";

export type ArchitectureNodeType =
  | "service"
  | "database"
  | "cache"
  | "queue"
  | "gateway"
  | "frontend"
  | "worker"
  | "load-balancer"
  | "auth"
  | "storage"
  | "external"
  | "custom";

export type ArtifactKind =
  | "source-code"
  | "api-spec"
  | "database-schema"
  | "configuration"
  | "script"
  | "snippet";

export type CommentTargetType = "node" | "relationship" | "document" | "code-artifact" | "schema-artifact";

export interface VisualState {
  x: number;
  y: number;
  width: number;
  height: number;
  collapsed: boolean;
  selected: boolean;
  zIndex: number;
  style: {
    fill: string;
    stroke: string;
    opacity: number;
  };
}

export interface ScalingConfig {
  mode?: "horizontal" | "vertical" | "auto" | "none";
  minReplicas?: number;
  maxReplicas?: number;
}

export interface DeploymentConfig {
  environment?: "local" | "dev" | "staging" | "production";
  region?: string;
  runtime?: string;
}

export interface TeamInfo {
  owner?: string;
  onCall?: string;
}

export interface SemanticData {
  nodeType: ArchitectureNodeType;
  role?: string;
  technologies: string[];
  protocols: string[];
  scaling?: ScalingConfig;
  deployment?: DeploymentConfig;
  ownership?: TeamInfo;
}

export interface DocumentEntity {
  id: string;
  title: string;
  format: "markdown" | "plaintext" | "richtext";
  content: string;
  updatedAt: number;
}

export interface CodeArtifact {
  id: string;
  language: CodeLanguage;
  type: ArtifactKind;
  title: string;
  content: string;
  collapsed: boolean;
}

export interface SchemaArtifact {
  id: string;
  kind: "sql" | "openapi" | "graphql" | "json-schema" | "protobuf";
  title: string;
  content: string;
  relationships?: string[];
  updatedAt: number;
}

export interface RichTextDocument {
  id: string;
  title: string;
  markdown: string;
  updatedAt: number;
}

export interface CommentMessage {
  id: string;
  author?: string;
  body: string;
  createdAt: number;
}

export interface CommentThread {
  id: string;
  targetType: CommentTargetType;
  targetId: string;
  resolved: boolean;
  messages: CommentMessage[];
}

export interface ContentStore {
  documents: DocumentEntity[];
  codeArtifacts: CodeArtifact[];
  schemas: SchemaArtifact[];
  notes: RichTextDocument[];
  comments: CommentThread[];
}

export interface RuntimeMetadata {
  status?: "healthy" | "degraded" | "down" | "unknown";
  lastCheckedAt?: number;
}

export interface AIContext {
  summary?: string;
  findings?: string[];
  updatedAt?: number;
}

export interface ArchitectureNode {
  id: string;
  visual: VisualState;
  semantic: SemanticData;
  content: ContentStore;
  runtime?: RuntimeMetadata;
  ai?: AIContext;
}

export interface Relationship {
  id: string;
  sourceNodeId: string;
  targetNodeId: string;
  type: SemanticRelType;
  protocol?: string;
  communicationPattern?: "sync" | "async" | "stream" | "batch";
  metadata?: Record<string, unknown>;
}

export interface NodeDefinition {
  semanticType: ArchitectureNodeType;
  allowedRelationships: SemanticRelType[];
  allowedContent: Array<"documents" | "codeArtifacts" | "schemas" | "notes" | "comments">;
  validationRules?: string[];
  aiPrompts?: string[];
}

export interface RichTextNode {
  type: "paragraph" | "heading" | "bullet" | "code-inline" | "bold" | "italic" | "link";
  content: string;
  children?: RichTextNode[];
  href?: string;
  level?: 1 | 2 | 3;
}

export interface CodeBlock {
  id: string;
  language: CodeLanguage;
  code: string;
  title?: string;
  collapsed: boolean;
  isSchema?: boolean;
}

export interface Annotation {
  id: string;
  markdown: string;
  nodes?: RichTextNode[];
  author?: string;
  createdAt: number;
  updatedAt: number;
  resolved: boolean;
  threadId?: string;
  parentId?: string;
}

export interface ShapeMetadata {
  semanticRole?: string;
  techStack?: string[];
  scalingPolicy?: string;
  replicationFactor?: number;
  slaMs?: number;
  teamOwner?: string;
  codeBlocks?: CodeBlock[];
  annotations?: Annotation[];
  nodeType?: ArchitectureNodeType;
  semanticData?: SemanticData;
  contentStore?: ContentStore;
  runtime?: RuntimeMetadata;
  aiContext?: AIContext;
  interfaces?: string[];
  dependencies?: string[];
  ports?: { name: string; number: number; protocol: string }[];
  [key: string]: unknown;
}

export interface Vec2 {
  x: number;
  y: number;
}

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface RGBA {
  r: number;
  g: number;
  b: number;
  a: number;
}

/**
 * Base shape interface
 */
export interface Shape extends Rect {
  id: string;
  type: ShapeType;
  label: string;
  fillColor: string; // hex
  strokeColor: string; // hex
  strokeWidth: number;
  opacity: number;
  rotation: number;
  locked: boolean;
  metadata?: ShapeMetadata;
  richLabel?: RichTextNode[];
  children?: string[]; // IDs of child shapes
  parentId?: string;
  groupId?: string;
  zIndex?: number;
}

/**
 * Arrow/Connector interface
 */
export interface Arrow {
  id: string;
  fromShapeId: string;
  toShapeId: string;
  fromPoint: "top" | "right" | "bottom" | "left" | "center";
  toPoint: "top" | "right" | "bottom" | "left" | "center";
  label?: string;
  labelPosition?: "above" | "below" | "center";
  description?: string;
  strokeColor: string;
  strokeWidth: number;
  strokeStyle: "solid" | "dashed" | "dotted";
  bidirectional?: boolean;
  animated?: boolean;
  semanticType?: SemanticRelType;
  metadata?: Record<string, unknown>;
}

/**
 * Semantic relationship in the architecture graph
 */
export interface SemanticRelationship {
  id: string;
  fromId: string;
  toId: string;
  type: SemanticRelType;
  label?: string;
  metadata?: Record<string, unknown>;
}

export type SemanticEdge = SemanticRelationship;

/**
 * Canvas semantic graph representation
 */
export interface ArchitectureGraph {
  nodes: Map<string, ArchitectureNode>;
  edges: Map<string, Relationship>;
  relationships: Relationship[];
  hierarchy: Map<string, string[]>;
  groups: Map<string, string[]>; // groupId -> [shapeIds]
  dependencyGraph: Map<string, string[]>;
}

export interface SemanticGraph {
  nodes: Map<string, Shape>;
  edges: Map<string, Arrow>;
  roots: string[];
  groups: Map<string, string[]>;
}

/**
 * Canvas state snapshot
 */
export interface CanvasSnapshot {
  id: string;
  version: number;
  timestamp: number;
  shapes: Shape[];
  arrows: Arrow[];
  viewState: ViewState;
  metadata: {
    title: string;
    description?: string;
    author?: string;
  };
}

/**
 * View state (pan, zoom, scroll)
 */
export interface ViewState {
  offsetX: number;
  offsetY: number;
  zoom: number;
  width: number;
  height: number;
}

/**
 * Selection state
 */
export interface Selection {
  shapeIds: Set<string>;
  arrowIds: Set<string>;
  bounds?: Rect;
}

/**
 * Editor tool
 */
export type EditorTool =
  | "select"
  | "rectangle"
  | "circle"
  | "database"
  | "cache"
  | "service"
  | "loadbalancer"
  | "queue"
  | "cloud"
  | "apigateway"
  | "auth"
  | "cdn"
  | "message"
  | "code-block"
  | "annotation"
  | "comment-bubble"
  | "arrow"
  | "text"
  | "pan"
  | "zoom"
  | "group";

/**
 * Interaction mode represents the current state of user interaction
 * This is separate from the tool, allowing tools to be temporary
 */
export type InteractionMode =
  | "idle"
  | "drawing"
  | "editing-text"
  | "dragging"
  | "marquee-select"
  | "resizing"
  | "panning"
  | "creating-arrow";

/**
 * Central interaction state machine
 * Tracks the current interaction mode, active tool, and relevant state
 */
export interface InteractionState {
  // Current mode of interaction
  mode: InteractionMode;

  // Active tool (may differ from displayed tool during temporary operations)
  activeTool: EditorTool;

  // Pointer state
  pointerState: {
    isDown: boolean;
    worldX: number;
    worldY: number;
    screenX: number;
    screenY: number;
    startX: number;
    startY: number;
  };

  // Current focused/edited shape
  focusedShapeId: string | null;

  // Selection bounds for marquee selection
  selectionBounds?: Rect;

  // Shape being dragged or resized
  activeShapeId: string | null;

  // Resize handle being dragged
  resizeHandle: string | null;

  // Arrow creation state
  arrowSourceShapeId: string | null;

  // Timestamp of last interaction
  lastInteractionTime: number;
}

/**
 * Canvas editor state
 */
export interface EditorState {
  currentTool: EditorTool;
  selection: Selection;
  clipboard: (Shape | Arrow)[];
  history: CanvasSnapshot[];
  historyIndex: number;
  isDragging: boolean;
  isDrawing: boolean;
  dragStart?: Vec2;
  resizingShapeId?: string;
  resizeHandle?: string;
  hoveredShapeId?: string;
  editingShapeId?: string | null;
  detailShapeId?: string | null;
}

/**
 * AI Evaluation Result
 */
export interface AIEvaluation {
  architectureScore: number; // 0-100
  completenessScore: number;
  scalabilityScore: number;
  securityScore: number;
  findings: Finding[];
  recommendations: Recommendation[];
  overallFeedback: string;
  timestamp: Date;
}

export interface Finding {
  id: string;
  severity: "critical" | "high" | "medium" | "low" | "info";
  category: string;
  title: string;
  description: string;
  suggestion?: string;
  affectedShapeIds: string[];
}

export interface Recommendation {
  id: string;
  category: string;
  title: string;
  description: string;
  priority: number;
  relatedComponents: string[];
}

/**
 * Template for pre-built architectures
 */
export interface ArchitectureTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  shapes: Shape[];
  arrows: Arrow[];
  thumbnail?: string;
}
