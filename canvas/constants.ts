// src/canvas/constants.ts

/**
 * Canvas rendering constants
 */

export const GRID_SIZE = 16;
export const SNAP_THRESHOLD = 10;
export const HANDLE_SIZE = 8;
export const MINIMAP_WIDTH = 140;
export const MINIMAP_HEIGHT = 90;

/**
 * Default styling
 */
export const DEFAULT_STROKE_WIDTH = 2;
export const DEFAULT_OPACITY = 1;
export const DEFAULT_ROTATION = 0;

/**
 * Shape dimensions
 */
export const SHAPE_MIN_SIZE = 20;
export const SHAPE_DEFAULT_WIDTH = 120;
export const SHAPE_DEFAULT_HEIGHT = 80;

/**
 * Colors
 */
export const COLORS = {
  accent: "#5b7fff",
  accentHover: "#4965dd",
  error: "#ff5c5c",
  success: "#3ecf8e",
  warning: "#f5a623",
  purple: "#a78bfa",
  gold: "#ffd700",
  textPrimary: "#ffffff",
  textSecondary: "#b4b4b4",
  border: "#2d2d2d",
  borderLight: "#3a3a3a",
  bgPrimary: "#0f0f0f",
  bgSecondary: "#1a1a1a",
  bgTertiary: "#252525",
  canvasBg: "#1a1a1a",
};

/**
 * Shape defaults - Architecture diagram style
 * Uses transparent/subtle fills with emphasized outlines
 * Matches Figma/Excalidraw/tldraw aesthetic
 */
export const SHAPE_DEFAULTS = {
  rectangle: {
    fillColor: "transparent",
    strokeColor: "#5b7fff",
    strokeWidth: 2,
  },
  circle: {
    fillColor: "transparent",
    strokeColor: "#9333ea",
    strokeWidth: 2,
  },
  database: {
    fillColor: "transparent",
    strokeColor: "#06b6d4",
    strokeWidth: 2,
  },
  cylinder: {
    fillColor: "transparent",
    strokeColor: "#06b6d4",
    strokeWidth: 2,
  },
  "api-gateway": {
    fillColor: "transparent",
    strokeColor: "#8b5cf6",
    strokeWidth: 2,
  },
  "load-balancer": {
    fillColor: "transparent",
    strokeColor: "#ec4899",
    strokeWidth: 2,
  },
  queue: {
    fillColor: "transparent",
    strokeColor: "#f59e0b",
    strokeWidth: 2,
  },
  "redis-cache": {
    fillColor: "transparent",
    strokeColor: "#ef4444",
    strokeWidth: 2,
  },
  cdn: {
    fillColor: "transparent",
    strokeColor: "#10b981",
    strokeWidth: 2,
  },
  kafka: {
    fillColor: "transparent",
    strokeColor: "#6b7280",
    strokeWidth: 2,
  },
  service: {
    fillColor: "transparent",
    strokeColor: "#3b82f6",
    strokeWidth: 2,
  },
  auth: {
    fillColor: "transparent",
    strokeColor: "#d946ef",
    strokeWidth: 2,
  },
  message: {
    fillColor: "transparent",
    strokeColor: "#06b6d4",
    strokeWidth: 2,
  },
  arrow: {
    fillColor: "transparent",
    strokeColor: "#f59e0b",
    strokeWidth: 2,
  },
  text: {
    fillColor: "transparent",
    strokeColor: "#fef3c7",
    strokeWidth: 1,
  },
  "code-block": {
    fillColor: "rgba(17, 24, 39, 0.4)",
    strokeColor: "#334155",
    strokeWidth: 1,
  },
  annotation: {
    fillColor: "rgba(254, 243, 199, 0.1)",
    strokeColor: "#f59e0b",
    strokeWidth: 1,
  },
  "comment-bubble": {
    fillColor: "rgba(15, 23, 42, 0.3)",
    strokeColor: "#3b82f6",
    strokeWidth: 1,
  },
};

/**
 * Zoom constraints
 */
export const ZOOM_MIN = 0.1;
export const ZOOM_MAX = 5;
export const ZOOM_STEP = 0.1;
export const ZOOM_SMOOTH_FACTOR = 1.1;

/**
 * Animation timings
 */
export const ANIMATION_DURATION = 150;
export const SELECTION_HIGHLIGHT_OFFSET = 4;

/**
 * Keyboard shortcuts
 */
export const SHORTCUTS = {
  delete: ["Delete", "Backspace"],
  undo: ["Control+z", "Meta+z"],
  redo: ["Control+y", "Control+Shift+z", "Meta+Shift+z"],
  copy: ["Control+c", "Meta+c"],
  paste: ["Control+v", "Meta+v"],
  duplicate: ["Control+d", "Meta+d"],
  selectAll: ["Control+a", "Meta+a"],
  group: ["Control+g", "Meta+g"],
  ungroup: ["Control+Shift+g", "Meta+Shift+g"],
  zoomIn: ["Control+Plus", "Meta+Plus"],
  zoomOut: ["Control+Minus", "Meta+Minus"],
  resetZoom: ["Control+0", "Meta+0"],
  fitToScreen: ["Control+1", "Meta+1"],
};

/**
 * Z-index layers
 */
export const Z_INDEX = {
  canvas: 0,
  shapes: 10,
  selectedShapes: 20,
  arrows: 5,
  selectedArrows: 15,
  handles: 30,
  minimap: 40,
  zoomControls: 40,
  contextMenu: 1000,
  modal: 1001,
};
