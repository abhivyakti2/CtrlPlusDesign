/**
 * Centralized Interaction State Machine
 * 
 * Manages all interaction modes and ensures professional editor UX:
 * - Tools return to select after temporary drawing
 * - Text editing terminates on outside click
 * - Proper event routing with priority
 * - Marquee selection support
 * - Shift+click multiselect
 */

import {
  InteractionState,
  InteractionMode,
  EditorTool,
  Vec2,
  Rect,
} from "@/types/canvas";

interface InteractionEngineOptions {
  onModeChange?: (mode: InteractionMode) => void;
  onToolChange?: (tool: EditorTool) => void;
}

export class InteractionEngine {
  private state: InteractionState;
  private onModeChange: (mode: InteractionMode) => void;
  private onToolChange: (tool: EditorTool) => void;

  // Persistent tools (remain active after creation)
  private readonly PERSISTENT_TOOLS: Set<EditorTool> = new Set([
    "select",
    "pan",
    "zoom",
  ]);

  private readonly TEMPORARY_TOOLS: Set<EditorTool> = new Set([
    "rectangle",
    "circle",
    "database",
    "cache",
    "diamond",
    "queue",
    "octagon",
    "auth",
    "text",
    "arrow",
  ]);

  constructor(options: InteractionEngineOptions = {}) {
    this.onModeChange = options.onModeChange ?? (() => {});
    this.onToolChange = options.onToolChange ?? (() => {});

    this.state = {
      mode: "idle",
      activeTool: "select",
      pointerState: {
        isDown: false,
        worldX: 0,
        worldY: 0,
        screenX: 0,
        screenY: 0,
        startX: 0,
        startY: 0,
      },
      focusedShapeId: null,
      activeShapeId: null,
      resizeHandle: null,
      arrowSourceShapeId: null,
      lastInteractionTime: Date.now(),
    };
  }

  /**
   * Get current interaction state
   */
  public getState(): Readonly<InteractionState> {
    return Object.freeze({ ...this.state });
  }

  /**
   * Get current mode
   */
  public getMode(): InteractionMode {
    return this.state.mode;
  }

  /**
   * Get active tool
   */
  public getActiveTool(): EditorTool {
    return this.state.activeTool;
  }

  /**
   * Set the active tool and handle tool transitions
   */
  public setTool(tool: EditorTool): void {
    if (this.state.activeTool === tool) return;

    // When switching away from temporary tool, if we were in drawing mode, stay in select
    if (this.TEMPORARY_TOOLS.has(this.state.activeTool) && this.state.mode === "drawing") {
      this.setMode("idle");
    }

    this.state.activeTool = tool;
    this.state.lastInteractionTime = Date.now();
    this.onToolChange(tool);
  }

  /**
   * Set the interaction mode
   */
  public setMode(mode: InteractionMode): void {
    if (this.state.mode === mode) return;

    // When exiting editing, clear focused shape
    if (this.state.mode === "editing-text" && mode !== "editing-text") {
      this.state.focusedShapeId = null;
    }

    // When exiting marquee, clear selection bounds
    if (this.state.mode === "marquee-select" && mode !== "marquee-select") {
      this.state.selectionBounds = undefined;
    }

    this.state.mode = mode;
    this.state.lastInteractionTime = Date.now();
    this.onModeChange(mode);
  }

  /**
   * Update pointer position
   */
  public updatePointer(screenX: number, screenY: number, worldX: number, worldY: number): void {
    this.state.pointerState.screenX = screenX;
    this.state.pointerState.screenY = screenY;
    this.state.pointerState.worldX = worldX;
    this.state.pointerState.worldY = worldY;
  }

  /**
   * Handle pointer down
   */
  public pointerDown(screenX: number, screenY: number, worldX: number, worldY: number): void {
    this.state.pointerState.isDown = true;
    this.state.pointerState.screenX = screenX;
    this.state.pointerState.screenY = screenY;
    this.state.pointerState.worldX = worldX;
    this.state.pointerState.worldY = worldY;
    this.state.pointerState.startX = worldX;
    this.state.pointerState.startY = worldY;
    this.state.lastInteractionTime = Date.now();
  }

  /**
   * Handle pointer up
   */
  public pointerUp(): void {
    this.state.pointerState.isDown = false;
    this.state.lastInteractionTime = Date.now();

    // After completing a temporary tool draw, return to select
    if (
      this.TEMPORARY_TOOLS.has(this.state.activeTool) &&
      this.state.mode === "drawing"
    ) {
      this.setMode("idle");
      this.setTool("select");
    }

    // Clean up active shape tracking if not dragging anymore
    if (this.state.mode !== "dragging" && this.state.mode !== "resizing") {
      this.state.activeShapeId = null;
      this.state.resizeHandle = null;
    }
  }

  /**
   * Start drawing a shape
   */
  public startDrawing(shapeId: string): void {
    this.state.activeShapeId = shapeId;
    this.setMode("drawing");
    this.state.lastInteractionTime = Date.now();
  }

  /**
   * Complete drawing (will auto-return to select if temporary tool)
   */
  public completeDrawing(): void {
    this.state.activeShapeId = null;
    if (this.TEMPORARY_TOOLS.has(this.state.activeTool)) {
      this.setMode("idle");
      this.setTool("select");
    }
    this.state.lastInteractionTime = Date.now();
  }

  /**
   * Start text editing
   */
  public startTextEditing(shapeId: string): void {
    this.state.focusedShapeId = shapeId;
    this.setMode("editing-text");
    this.state.lastInteractionTime = Date.now();
  }

  /**
   * Stop text editing and optionally return to select
   */
  public stopTextEditing(returnToSelect: boolean = true): void {
    this.state.focusedShapeId = null;
    if (returnToSelect) {
      this.setMode("idle");
      this.setTool("select");
    } else {
      this.setMode("idle");
    }
    this.state.lastInteractionTime = Date.now();
  }

  /**
   * Start dragging a shape
   */
  public startDragging(shapeId: string): void {
    this.state.activeShapeId = shapeId;
    this.setMode("dragging");
    this.state.lastInteractionTime = Date.now();
  }

  /**
   * Stop dragging
   */
  public stopDragging(): void {
    this.state.activeShapeId = null;
    this.setMode("idle");
    this.state.lastInteractionTime = Date.now();
  }

  /**
   * Start resizing a shape
   */
  public startResizing(shapeId: string, handle: string): void {
    this.state.activeShapeId = shapeId;
    this.state.resizeHandle = handle;
    this.setMode("resizing");
    this.state.lastInteractionTime = Date.now();
  }

  /**
   * Stop resizing
   */
  public stopResizing(): void {
    this.state.activeShapeId = null;
    this.state.resizeHandle = null;
    this.setMode("idle");
    this.state.lastInteractionTime = Date.now();
  }

  /**
   * Start marquee selection
   */
  public startMarqueeSelect(x: number, y: number): void {
    this.state.selectionBounds = {
      x,
      y,
      w: 0,
      h: 0,
    };
    this.setMode("marquee-select");
    this.state.lastInteractionTime = Date.now();
  }

  /**
   * Update marquee selection bounds
   */
  public updateMarqueeSelect(endX: number, endY: number): void {
    if (!this.state.selectionBounds) return;

    const startX = this.state.selectionBounds.x;
    const startY = this.state.selectionBounds.y;

    this.state.selectionBounds = {
      x: Math.min(startX, endX),
      y: Math.min(startY, endY),
      w: Math.abs(endX - startX),
      h: Math.abs(endY - startY),
    };
    this.state.lastInteractionTime = Date.now();
  }

  /**
   * Complete marquee selection
   */
  public completeMarqueeSelect(): Rect | null {
    const bounds = this.state.selectionBounds;
    this.state.selectionBounds = undefined;
    this.setMode("idle");
    this.state.lastInteractionTime = Date.now();
    return bounds ?? null;
  }

  /**
   * Start panning
   */
  public startPanning(): void {
    this.setMode("panning");
    this.state.lastInteractionTime = Date.now();
  }

  /**
   * Stop panning
   */
  public stopPanning(): void {
    this.setMode("idle");
    this.state.lastInteractionTime = Date.now();
  }

  /**
   * Start creating arrow
   */
  public startArrow(sourceShapeId: string): void {
    this.state.arrowSourceShapeId = sourceShapeId;
    this.setMode("creating-arrow");
    this.state.lastInteractionTime = Date.now();
  }

  /**
   * Complete arrow (connect to target)
   */
  public completeArrow(targetShapeId: string): { source: string; target: string } | null {
    const source = this.state.arrowSourceShapeId;
    this.state.arrowSourceShapeId = null;
    this.setMode("idle");
    this.state.lastInteractionTime = Date.now();

    if (!source || source === targetShapeId) return null;
    return { source, target: targetShapeId };
  }

  /**
   * Cancel arrow creation
   */
  public cancelArrow(): void {
    this.state.arrowSourceShapeId = null;
    this.setMode("idle");
    this.state.lastInteractionTime = Date.now();
  }

  /**
   * Get event priority/routing decision
   * Returns which handler should process this event
   * PRIORITY ORDER:
   * 1. if editing text → commit/exit editing
   * 2. if resizing → resize
   * 3. if dragging → drag
   * 4. if marquee → update selection
   * 5. if select tool → select entity
   * 6. if drawing tool → create shape
   */
  public getEventRoutingPriority(): number {
    switch (this.state.mode) {
      case "editing-text":
        return 10; // Highest
      case "resizing":
        return 9;
      case "dragging":
        return 8;
      case "marquee-select":
        return 7;
      case "drawing":
        return 6;
      case "creating-arrow":
        return 5;
      case "panning":
        return 4;
      case "idle":
        // In idle, depends on tool
        return this.state.activeTool === "select" ? 3 : 2;
      default:
        return 0;
    }
  }

  /**
   * Check if we should commit text editing on outside click
   */
  public shouldCommitTextOnOutsideClick(): boolean {
    return this.state.mode === "editing-text";
  }

  /**
   * Check if tool is temporary (auto-returns to select)
   */
  public isTemporaryTool(tool: EditorTool): boolean {
    return this.TEMPORARY_TOOLS.has(tool);
  }

  /**
   * Check if tool is persistent (stays active)
   */
  public isPersistentTool(tool: EditorTool): boolean {
    return this.PERSISTENT_TOOLS.has(tool);
  }

  /**
   * Reset to idle state
   */
  public reset(): void {
    this.state.mode = "idle";
    this.state.activeTool = "select";
    this.state.focusedShapeId = null;
    this.state.activeShapeId = null;
    this.state.resizeHandle = null;
    this.state.arrowSourceShapeId = null;
    this.state.selectionBounds = undefined;
    this.state.pointerState.isDown = false;
    this.state.lastInteractionTime = Date.now();
  }
}

/**
 * Check if two rectangles intersect
 */
export function intersectsRect(rect1: Rect, rect2: Rect): boolean {
  return !(
    rect1.x + rect1.w < rect2.x ||
    rect2.x + rect2.w < rect1.x ||
    rect1.y + rect1.h < rect2.y ||
    rect2.y + rect2.h < rect1.y
  );
}

/**
 * Check if point is inside rectangle
 */
export function pointInRect(point: Vec2, rect: Rect): boolean {
  return (
    point.x >= rect.x &&
    point.x <= rect.x + rect.w &&
    point.y >= rect.y &&
    point.y <= rect.y + rect.h
  );
}
