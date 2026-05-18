import type { Arrow, SemanticRelType, Shape } from "@/types/canvas";

const SEMANTIC_LABELS: Record<SemanticRelType, string> = {
  "api-call": "API call",
  "async-event": "Async event",
  "data-read": "Data read",
  "data-write": "Data write",
  replication: "Replication",
  "cache-lookup": "Cache lookup",
  owns: "Owns",
  "depends-on": "Depends on",
  extends: "Extends",
  implements: "Implements",
  "deploys-to": "Deploys to",
  authenticates: "Authenticates",
  custom: "Custom",
};

const SEMANTIC_COLORS: Partial<Record<SemanticRelType, string>> = {
  "api-call": "#5b7fff",
  "async-event": "#f59e0b",
  "data-read": "#3ecf8e",
  "data-write": "#ef4444",
  replication: "#a78bfa",
  "cache-lookup": "#06b6d4",
  authenticates: "#d946ef",
  owns: "#6b7280",
  "depends-on": "#6b7280",
};

const SEMANTIC_STROKES: Partial<Record<SemanticRelType, "solid" | "dashed" | "dotted">> = {
  "async-event": "dashed",
  replication: "dotted",
  "depends-on": "dashed",
};

function normalizeText(value: string | undefined): string {
  return (value ?? "")
    .toLowerCase()
    .replace(/[_\s-]+/g, " ")
    .trim();
}

function collectShapeTerms(shape?: Shape): string {
  if (!shape) return "";

  const metadata = shape.metadata ?? {};
  const parts = [shape.type, shape.label, metadata.semanticRole, ...(metadata.techStack ?? [])];
  return normalizeText(parts.filter(Boolean).join(" "));
}

export function semanticRelLabel(type: SemanticRelType): string {
  return SEMANTIC_LABELS[type] ?? "Custom";
}

export function semanticRelColor(type: SemanticRelType): string {
  return SEMANTIC_COLORS[type] ?? "#6b7280";
}

export function semanticRelStrokeStyle(type: SemanticRelType): "solid" | "dashed" | "dotted" {
  return SEMANTIC_STROKES[type] ?? "solid";
}

export function inferSemanticRelType(fromShape?: Shape, toShape?: Shape): SemanticRelType {
  const fromTerms = collectShapeTerms(fromShape);
  const toTerms = collectShapeTerms(toShape);

  if (
    (fromTerms.includes("frontend") || fromTerms.includes("ui") || fromTerms.includes("web")) &&
    (toTerms.includes("backend") || toTerms.includes("service") || toTerms.includes("api gateway") || toTerms.includes("apigateway"))
  ) {
    return "api-call";
  }

  if (
    (fromTerms.includes("service") || fromTerms.includes("worker") || fromTerms.includes("api")) &&
    (toTerms.includes("queue") || toTerms.includes("kafka") || toTerms.includes("message") || toTerms.includes("event"))
  ) {
    return "async-event";
  }

  if (
    (fromTerms.includes("service") || fromTerms.includes("backend")) &&
    (toTerms.includes("database") || toTerms.includes("cylinder") || toTerms.includes("sql"))
  ) {
    return "data-write";
  }

  if (
    (fromTerms.includes("database") || fromTerms.includes("primary db") || fromTerms.includes("primary-database")) &&
    (toTerms.includes("database") || toTerms.includes("replica"))
  ) {
    return "replication";
  }

  if (
    (fromTerms.includes("service") || fromTerms.includes("backend")) &&
    (toTerms.includes("redis") || toTerms.includes("cache"))
  ) {
    return "cache-lookup";
  }

  if (fromTerms.includes("auth") && (toTerms.includes("service") || toTerms.includes("backend"))) {
    return "authenticates";
  }

  if (fromTerms.includes("read") || toTerms.includes("read")) {
    return "data-read";
  }

  if (fromTerms.includes("write") || toTerms.includes("write")) {
    return "data-write";
  }

  return "depends-on";
}

export function inferArrowDefaults(fromShape?: Shape, toShape?: Shape, arrow?: Partial<Arrow>) {
  const semanticType = arrow?.semanticType ?? inferSemanticRelType(fromShape, toShape);

  return {
    semanticType,
    strokeColor: arrow?.strokeColor ?? semanticRelColor(semanticType),
    strokeStyle: arrow?.strokeStyle ?? semanticRelStrokeStyle(semanticType),
    label: arrow?.label ?? semanticRelLabel(semanticType),
    labelPosition: arrow?.labelPosition ?? "above",
  } as const;
}