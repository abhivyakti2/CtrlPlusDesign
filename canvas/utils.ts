// src/canvas/utils.ts

import type { Vec2, Shape, Arrow, Rect } from "@/types/canvas";

// Re-export types for convenience
export type { Rect };

/**
 * Vector utilities
 */
export const Vec = {
  add: (a: Vec2, b: Vec2): Vec2 => ({ x: a.x + b.x, y: a.y + b.y }),
  sub: (a: Vec2, b: Vec2): Vec2 => ({ x: a.x - b.x, y: a.y - b.y }),
  mul: (v: Vec2, scalar: number): Vec2 => ({ x: v.x * scalar, y: v.y * scalar }),
  div: (v: Vec2, scalar: number): Vec2 => ({ x: v.x / scalar, y: v.y / scalar }),
  dist: (a: Vec2, b: Vec2): number =>
    Math.sqrt(Math.pow(a.x - b.x, 2) + Math.pow(a.y - b.y, 2)),
  dot: (a: Vec2, b: Vec2): number => a.x * b.x + a.y * b.y,
  length: (v: Vec2): number => Math.sqrt(v.x * v.x + v.y * v.y),
  normalize: (v: Vec2): Vec2 => {
    const len = Vec.length(v);
    return len > 0 ? Vec.div(v, len) : { x: 0, y: 0 };
  },
};

/**
 * Rectangle utilities
 */
export const RectOps = {
  contains: (rect: Rect, point: Vec2): boolean =>
    point.x >= rect.x &&
    point.x <= rect.x + rect.w &&
    point.y >= rect.y &&
    point.y <= rect.y + rect.h,
  intersects: (a: Rect, b: Rect): boolean =>
    a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y,
  union: (a: Rect, b: Rect): Rect => {
    const x1 = Math.min(a.x, b.x);
    const y1 = Math.min(a.y, b.y);
    const x2 = Math.max(a.x + a.w, b.x + b.w);
    const y2 = Math.max(a.y + a.h, b.y + b.h);
    return { x: x1, y: y1, w: x2 - x1, h: y2 - y1 };
  },
  center: (rect: Rect): Vec2 => ({
    x: rect.x + rect.w / 2,
    y: rect.y + rect.h / 2,
  }),
  translate: (rect: Rect, offset: Vec2): Rect => ({
    ...rect,
    x: rect.x + offset.x,
    y: rect.y + offset.y,
  }),
};

/**
 * Color utilities
 */
export const Color = {
  hexToRgba: (hex: string, alpha = 1): string => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  },
  lighten: (hex: string, percent: number): string => {
    const num = parseInt(hex.replace("#", ""), 16);
    const amt = Math.round(2.55 * percent);
    const R = Math.min(255, (num >> 16) + amt);
    const G = Math.min(255, ((num >> 8) & 0x00ff) + amt);
    const B = Math.min(255, (num & 0x0000ff) + amt);
    return "#" + (0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1);
  },
  darken: (hex: string, percent: number): string => {
    const num = parseInt(hex.replace("#", ""), 16);
    const amt = Math.round(2.55 * percent);
    const R = Math.max(0, (num >> 16) - amt);
    const G = Math.max(0, ((num >> 8) & 0x00ff) - amt);
    const B = Math.max(0, (num & 0x0000ff) - amt);
    return "#" + (0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1);
  },
};

/**
 * ID generation
 */
export const generateId = (prefix: string): string => {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * Snapping utilities
 */
export const snap = (value: number, gridSize: number): number => {
  return Math.round(value / gridSize) * gridSize;
};

export const snapPoint = (point: Vec2, gridSize: number): Vec2 => ({
  x: snap(point.x, gridSize),
  y: snap(point.y, gridSize),
});

export const shouldSnap = (
  value: number,
  snapTo: number,
  threshold: number
): boolean => {
  const remainder = Math.abs(value % snapTo);
  return remainder < threshold || remainder > snapTo - threshold;
};

/**
 * Rotation utilities
 */
export const rotatePoint = (
  point: Vec2,
  origin: Vec2,
  angle: number
): Vec2 => {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const x = point.x - origin.x;
  const y = point.y - origin.y;
  return {
    x: origin.x + x * cos - y * sin,
    y: origin.y + x * sin + y * cos,
  };
};

export const degreesToRadians = (degrees: number): number =>
  (degrees * Math.PI) / 180;

export const radiansToDegrees = (radians: number): number =>
  (radians * 180) / Math.PI;

/**
 * Hit testing
 */
export const hitTestShape = (shape: Shape, point: Vec2): boolean => {
  return RectOps.contains(shape, point);
};

/**
 * Calculate the shortest distance from a point to a line segment
 */
const distancePointToSegment = (
  point: Vec2,
  segmentStart: Vec2,
  segmentEnd: Vec2
): number => {
  const dx = segmentEnd.x - segmentStart.x;
  const dy = segmentEnd.y - segmentStart.y;
  const lengthSquared = dx * dx + dy * dy;

  if (lengthSquared === 0) {
    // Segment is a point
    const pdx = point.x - segmentStart.x;
    const pdy = point.y - segmentStart.y;
    return Math.sqrt(pdx * pdx + pdy * pdy);
  }

  // Parameter t represents where on the segment the closest point is
  let t = ((point.x - segmentStart.x) * dx + (point.y - segmentStart.y) * dy) / lengthSquared;
  t = Math.max(0, Math.min(1, t));

  const closestX = segmentStart.x + t * dx;
  const closestY = segmentStart.y + t * dy;

  const pdx = point.x - closestX;
  const pdy = point.y - closestY;
  return Math.sqrt(pdx * pdx + pdy * pdy);
};

interface ArrowDisplayLine {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

function getArrowDisplayLine(
  metadata: Record<string, unknown> | undefined
): ArrowDisplayLine | null {
  const line = metadata?.displayLine;
  if (!line || typeof line !== "object") return null;
  const dl = line as Record<string, unknown>;
  if (
    typeof dl.x1 === "number" &&
    typeof dl.y1 === "number" &&
    typeof dl.x2 === "number" &&
    typeof dl.y2 === "number"
  ) {
    return { x1: dl.x1, y1: dl.y1, x2: dl.x2, y2: dl.y2 };
  }
  return null;
}

export const hitTestArrow = (
  arrow: Arrow,
  point: Vec2,
  threshold: number = 5
): boolean => {
  if (!arrow.fromShapeId || !arrow.toShapeId) {
    return false;
  }

  const displayLine = getArrowDisplayLine(arrow.metadata);
  if (displayLine) {
    const dist = distancePointToSegment(
      point,
      { x: displayLine.x1, y: displayLine.y1 },
      { x: displayLine.x2, y: displayLine.y2 }
    );
    return dist <= threshold;
  }

  return false;
};

/**
 * Array utilities
 */
export const flatten = <T>(arr: T[][]): T[] => arr.flat();

export const unique = <T>(arr: T[]): T[] => Array.from(new Set(arr));

export const groupBy = <T, K extends string | number>(
  arr: T[],
  key: (item: T) => K
): Record<K, T[]> => {
  return arr.reduce((groups, item) => {
    const k = key(item);
    if (!groups[k]) groups[k] = [];
    groups[k].push(item);
    return groups;
  }, {} as Record<K, T[]>);
};

/**
 * Canvas coordinate transforms
 */
export const screenToWorld = (
  screenX: number,
  screenY: number,
  offsetX: number,
  offsetY: number,
  zoom: number
): Vec2 => ({
  x: (screenX - offsetX) / zoom,
  y: (screenY - offsetY) / zoom,
});

export const worldToScreen = (
  worldX: number,
  worldY: number,
  offsetX: number,
  offsetY: number,
  zoom: number
): Vec2 => ({
  x: worldX * zoom + offsetX,
  y: worldY * zoom + offsetY,
});

/**
 * Shape geometry
 */
export const getShapeCenter = (shape: Shape): Vec2 => ({
  x: shape.x + shape.w / 2,
  y: shape.y + shape.h / 2,
});

export const getShapeBounds = (shapes: Shape[]): Rect => {
  if (shapes.length === 0) {
    return { x: 0, y: 0, w: 0, h: 0 };
  }

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  shapes.forEach((shape) => {
    minX = Math.min(minX, shape.x);
    minY = Math.min(minY, shape.y);
    maxX = Math.max(maxX, shape.x + shape.w);
    maxY = Math.max(maxY, shape.y + shape.h);
  });

  return {
    x: minX,
    y: minY,
    w: maxX - minX,
    h: maxY - minY,
  };
};

/**
 * Serialization
 */
export const serializeShapes = (shapes: Map<string, Shape>): Shape[] => {
  return Array.from(shapes.values());
};

export const deserializeShapes = (shapes: Shape[]): Map<string, Shape> => {
  const map = new Map<string, Shape>();
  shapes.forEach((shape) => map.set(shape.id, shape));
  return map;
};
