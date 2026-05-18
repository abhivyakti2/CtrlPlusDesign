// src/canvas/engine.ts

import { ViewState, Vec2, CanvasSnapshot, Shape, EditorTool, Rect } from "../types/canvas";
import { CanvasRenderer } from "./renderer";
import { useCanvasStore } from "../store/canvasStore";
import { Vec, screenToWorld, generateId, RectOps } from "./utils";
import { ZOOM_MIN, ZOOM_MAX, SHAPE_DEFAULTS, GRID_SIZE } from "./constants";
import { inferArrowDefaults } from "./semantic";
import { InteractionEngine, intersectsRect, pointInRect } from "./interactionEngine";

interface CanvasEngineOptions {
  onViewStateChange?: (viewState: ViewState) => void;
}

// ── Autosave helpers ──────────────────────────────────────────────────────────
const AUTOSAVE_KEY = "ctrl_design_autosave";

function saveToLocalStorage(): void {
  try {
    const store = useCanvasStore.getState();
    const data = {
      shapes: store.getAllShapes(),
      arrows: store.getAllArrows(),
      savedAt: Date.now(),
    };
    localStorage.setItem(AUTOSAVE_KEY, JSON.stringify(data));
  } catch {
    // quota exceeded or SSR — ignore
  }
}

export function loadFromLocalStorage(): { shapes: Shape[]; arrows: any[] } | null {
  try {
    const raw = localStorage.getItem(AUTOSAVE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export class CanvasEngine {
  private canvas: HTMLCanvasElement;
  private renderer: CanvasRenderer;
  private viewState: ViewState;
  private animFramePending = false;
  private onViewStateChange: (viewState: ViewState) => void;

  // Centralized interaction state machine
  private interaction: InteractionEngine;

  // Track drag start position in world coords to compute absolute delta
  private dragStartWorld: Vec2 = { x: 0, y: 0 };
  private dragStartShapePos: Vec2 = { x: 0, y: 0 };

  // Track resize start state
  private resizeStartShape: { x: number; y: number; w: number; h: number } | null = null;
  private resizeStartWorld: Vec2 = { x: 0, y: 0 };

  // Per-shape start positions for group drag
  private groupDragStartPositions: Map<string, Vec2> | null = null;

  // Autosave debounce timer
  private autosaveTimer: ReturnType<typeof setTimeout> | null = null;

  // Store subscription for autosave
  private storeUnsubscribe: (() => void) | null = null;
  private lastSavedShapesCount = 0;
  private lastSavedArrowsCount = 0;

  // Flag to prevent resize observer from triggering during renders
  private isRendering = false;

  // Bound handlers for clean teardown (prevents duplicate listeners on remount)
  private boundHandlers: {
    mousedown: (e: MouseEvent) => void;
    mousemove: (e: MouseEvent) => void;
    mouseup: (e: MouseEvent) => void;
    wheel: (e: WheelEvent) => void;
    dblclick: (e: MouseEvent) => void;
    contextmenu: (e: MouseEvent) => void;
    touchstart: (e: TouchEvent) => void;
    touchmove: (e: TouchEvent) => void;
    touchend: (e: TouchEvent) => void;
  } | null = null;
  private keyDownHandler: ((e: KeyboardEvent) => void) | null = null;
  private resizeObserver: ResizeObserver | null = null;
  private resizeDebounceTimer: ReturnType<typeof setTimeout> | null = null;
  private isTwoFingerTouch = false;
  private lastTouchDistance = 0;
  private lastTouchX = 0;
  private lastTouchY = 0;
  private destroyed = false;

  constructor(canvas: HTMLCanvasElement, options: CanvasEngineOptions = {}) {
    this.canvas = canvas;
    this.onViewStateChange = options.onViewStateChange ?? (() => undefined);

    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Could not get 2D context");

    this.renderer = new CanvasRenderer(ctx, canvas.width, canvas.height);
    this.viewState = {
      offsetX: 0,
      offsetY: 0,
      zoom: 1,
      width: canvas.width,
      height: canvas.height,
    };

    // Initialize interaction engine
    this.interaction = new InteractionEngine({
      onModeChange: () => this.render(),
      onToolChange: (tool) => {
        const store = useCanvasStore.getState();
        store.setTool(tool);
        this.render();
      },
    });

    // Subscribe to store tool changes to keep interaction engine in sync
    useCanvasStore.subscribe((state) => {
      const tool = state.editorState.currentTool;
      if (tool !== this.interaction.getActiveTool()) {
        this.interaction.setTool(tool);
      }
    });

    // Subscribe to store changes for autosave
    this.storeUnsubscribe = useCanvasStore.subscribe((state) => {
      const shapesCount = state.shapes.size;
      const arrowsCount = state.arrows.size;
      
      // Trigger autosave if shapes or arrows have changed
      if (shapesCount !== this.lastSavedShapesCount || arrowsCount !== this.lastSavedArrowsCount) {
        this.lastSavedShapesCount = shapesCount;
        this.lastSavedArrowsCount = arrowsCount;
        this.scheduleAutosave();
      }
    });

    this.setupEventListeners();
    this.emitViewStateChange();

    // Restore autosaved canvas on init
    this.restoreAutosave();
  }

  // ── Autosave ────────────────────────────────────────────────────────────────

  private scheduleAutosave(): void {
    if (this.autosaveTimer) clearTimeout(this.autosaveTimer);
    this.autosaveTimer = setTimeout(() => {
      saveToLocalStorage();
    }, 500);
  }

  private restoreAutosave(): void {
    // Don't restore if a design was explicitly loaded
    if (sessionStorage.getItem("design_loaded")) {
      // Clear autosave to prevent stale data
      localStorage.removeItem(AUTOSAVE_KEY);
      return;
    }

    const saved = loadFromLocalStorage();
    if (!saved || (!saved.shapes?.length && !saved.arrows?.length)) return;
    
    const store = useCanvasStore.getState();
    // Restore autosave on fresh canvas initialization
    if (store.getAllShapes().length === 0) {
      store.loadSnapshot({
        id: "autosave",
        version: 1,
        timestamp: Date.now(),
        shapes: saved.shapes ?? [],
        arrows: saved.arrows ?? [],
        viewState: this.viewState,
        metadata: { title: "Autosaved" },
      });
      // Update the counters after loading
      this.lastSavedShapesCount = saved.shapes?.length ?? 0;
      this.lastSavedArrowsCount = saved.arrows?.length ?? 0;
    }
  }

  public getViewState(): ViewState {
    return { ...this.viewState };
  }

  /**
   * Clear autosaved data (call after successful save to remote)
   */
  public clearAutosave(): void {
    localStorage.removeItem(AUTOSAVE_KEY);
  }

  /**
   * Set active tool and update interaction engine
   */
  public setActiveTool(tool: EditorTool): void {
    this.interaction.setTool(tool);
    this.render();
  }

  private emitViewStateChange(): void {
    this.onViewStateChange({ ...this.viewState });
  }

  /**
   * Remove all listeners. Must be called before discarding the engine instance.
   */
  public destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;

    // Clean up store subscription
    if (this.storeUnsubscribe) {
      this.storeUnsubscribe();
      this.storeUnsubscribe = null;
    }

    if (this.boundHandlers) {
      this.canvas.removeEventListener("mousedown", this.boundHandlers.mousedown);
      this.canvas.removeEventListener("mousemove", this.boundHandlers.mousemove);
      this.canvas.removeEventListener("mouseup", this.boundHandlers.mouseup);
      this.canvas.removeEventListener("wheel", this.boundHandlers.wheel);
      this.canvas.removeEventListener("dblclick", this.boundHandlers.dblclick);
      this.canvas.removeEventListener("contextmenu", this.boundHandlers.contextmenu);
      this.canvas.removeEventListener("touchstart", this.boundHandlers.touchstart);
      this.canvas.removeEventListener("touchmove", this.boundHandlers.touchmove);
      this.canvas.removeEventListener("touchend", this.boundHandlers.touchend);
      this.boundHandlers = null;
    }

    if (this.keyDownHandler) {
      window.removeEventListener("keydown", this.keyDownHandler);
      this.keyDownHandler = null;
    }

    this.resizeObserver?.disconnect();
    this.resizeObserver = null;

    if (this.autosaveTimer) clearTimeout(this.autosaveTimer);
    if (this.resizeDebounceTimer) clearTimeout(this.resizeDebounceTimer);
  }

  /** Screen coords relative to the canvas element (not the viewport). */
  private getCanvasScreenPoint(e: MouseEvent): Vec2 {
    const rect = this.canvas.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  private beginShapeDrag(worldPoint: Vec2, primaryShapeId: string): void {
    const store = useCanvasStore.getState();
    const selectedIds = store.editorState.selection.shapeIds;

    this.dragStartWorld = { ...worldPoint };

    if (selectedIds.size > 1) {
      this.groupDragStartPositions = new Map(
        Array.from(selectedIds).map((id) => {
          const s = store.getShape(id)!;
          return [id, { x: s.x, y: s.y }];
        })
      );
    } else {
      this.groupDragStartPositions = null;
      const shape = store.getShape(primaryShapeId);
      if (shape) {
        this.dragStartShapePos = { x: shape.x, y: shape.y };
      }
    }

    this.interaction.startDragging(primaryShapeId);
  }

  private ensureGroupDragStartPositions(): void {
    if (this.groupDragStartPositions) return;

    const store = useCanvasStore.getState();
    const selectedIds = store.editorState.selection.shapeIds;
    if (selectedIds.size <= 1) return;

    this.groupDragStartPositions = new Map(
      Array.from(selectedIds).map((id) => {
        const s = store.getShape(id)!;
        return [id, { x: s.x, y: s.y }];
      })
    );
  }

  private setupEventListeners(): void {
    this.boundHandlers = {
      mousedown: (e) => this.onMouseDown(e),
      mousemove: (e) => this.onMouseMove(e),
      mouseup: (e) => this.onMouseUp(e),
      wheel: (e) => this.onWheel(e),
      dblclick: (e) => this.onDoubleClick(e),
      contextmenu: (e) => this.onContextMenu(e),
      touchstart: (e) => this.onTouchStart(e),
      touchmove: (e) => this.onTouchMove(e),
      touchend: (e) => this.onTouchEnd(e),
    };

    this.canvas.addEventListener("mousedown", this.boundHandlers.mousedown);
    this.canvas.addEventListener("mousemove", this.boundHandlers.mousemove);
    this.canvas.addEventListener("mouseup", this.boundHandlers.mouseup);
    this.canvas.addEventListener("wheel", this.boundHandlers.wheel, { passive: false });
    this.canvas.addEventListener("dblclick", this.boundHandlers.dblclick);
    this.canvas.addEventListener("contextmenu", this.boundHandlers.contextmenu);
    this.canvas.addEventListener("touchstart", this.boundHandlers.touchstart, { passive: false });
    this.canvas.addEventListener("touchmove", this.boundHandlers.touchmove, { passive: false });
    this.canvas.addEventListener("touchend", this.boundHandlers.touchend, { passive: false });

    this.keyDownHandler = (e) => this.onKeyDown(e);
    window.addEventListener("keydown", this.keyDownHandler);

    this.resizeObserver = new ResizeObserver((entries) => {
      // Debounce resize handling during shape creation and rendering
      if (this.isRendering) return;
      
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (width <= 0 || height <= 0) continue;

        if (this.resizeDebounceTimer) clearTimeout(this.resizeDebounceTimer);
        this.resizeDebounceTimer = setTimeout(() => {
          if (Math.abs(this.canvas.width - width) < 1 && Math.abs(this.canvas.height - height) < 1) {
            return;
          }

          this.canvas.width = width;
          this.canvas.height = height;
          this.viewState.width = width;
          this.viewState.height = height;
          this.renderer.updateSize(width, height);
          this.emitViewStateChange();
          this.render();
        }, 100);
      }
    });
    this.resizeObserver.observe(this.canvas);
  }

  private screenToWorld(screenX: number, screenY: number): Vec2 {
    const rect = this.canvas.getBoundingClientRect();
    return screenToWorld(
      screenX - rect.left,
      screenY - rect.top,
      this.viewState.offsetX,
      this.viewState.offsetY,
      this.viewState.zoom
    );
  }

  private hitTestShapes(worldPoint: Vec2, excludeId?: string): string | null {
    const shapes = useCanvasStore.getState().getAllShapes();

    for (let i = shapes.length - 1; i >= 0; i--) {
      const shape = shapes[i];
      if (shape.id === excludeId) continue;
      if (RectOps.contains(shape, worldPoint)) return shape.id;
    }

    return null;
  }

  /**
   * Only used for container/group nesting — NOT for regular shape placement.
   * A shape is only considered a valid parent if it is explicitly typed as
   * a container/group to avoid accidental parenting.
   */
  private findContainerParent(worldPoint: Vec2, excludeId?: string): Shape | null {
    const shapes = useCanvasStore.getState().getAllShapes();
    for (let i = shapes.length - 1; i >= 0; i--) {
      const shape = shapes[i];
      if (shape.id === excludeId) continue;
      // Only container/group types can be parents
      if (shape.type !== "group" && shape.type !== "container") continue;
      if (RectOps.contains(shape, worldPoint)) return shape;
    }
    return null;
  }

  private hitTestResizeHandle(shapeId: string, screenPoint: Vec2): string | null {
    const shape = useCanvasStore.getState().getShape(shapeId);
    if (!shape) return null;

    const screenShape = {
      x: this.viewState.offsetX + shape.x * this.viewState.zoom,
      y: this.viewState.offsetY + shape.y * this.viewState.zoom,
      w: shape.w * this.viewState.zoom,
      h: shape.h * this.viewState.zoom,
    };

    const handles = [
      { id: "nw", x: screenShape.x, y: screenShape.y },
      { id: "ne", x: screenShape.x + screenShape.w, y: screenShape.y },
      { id: "se", x: screenShape.x + screenShape.w, y: screenShape.y + screenShape.h },
      { id: "sw", x: screenShape.x, y: screenShape.y + screenShape.h },
    ];

    const threshold = 10;
    for (const handle of handles) {
      if (Math.abs(screenPoint.x - handle.x) < threshold && Math.abs(screenPoint.y - handle.y) < threshold) {
        return handle.id;
      }
    }

    return null;
  }

  private hitTestDeleteButton(shapeId: string, screenPoint: Vec2): boolean {
    const shape = useCanvasStore.getState().getShape(shapeId);
    if (!shape) return false;

    const screenShape = {
      x: this.viewState.offsetX + shape.x * this.viewState.zoom,
      y: this.viewState.offsetY + shape.y * this.viewState.zoom,
      w: shape.w * this.viewState.zoom,
      h: shape.h * this.viewState.zoom,
    };

    // Delete button in top-right corner
    const buttonSize = 20;
    const buttonX = screenShape.x + screenShape.w + 8 * this.viewState.zoom;
    const buttonY = screenShape.y - 10 * this.viewState.zoom;
    const radius = (buttonSize / 2) * this.viewState.zoom;

    const dx = screenPoint.x - buttonX;
    const dy = screenPoint.y - buttonY;
    const distance = Math.sqrt(dx * dx + dy * dy);

    return distance < radius;
  }

  private createShapeFromTool(currentTool: EditorTool, worldPoint: Vec2): Shape | null {
    if (
      currentTool === "arrow" ||
      currentTool === "select" ||
      currentTool === "pan" ||
      currentTool === "zoom" ||
      currentTool === "group"
    ) {
      return null;
    }

    const toolToShapeMap: Partial<Record<EditorTool, Shape["type"]>> = {
      rectangle: "rectangle",
      circle: "circle",
      database: "cylinder",
      cache: "redis-cache",
      service: "service",
      loadbalancer: "load-balancer",
      queue: "queue",
      cloud: "rounded-rect",
      apigateway: "api-gateway",
      auth: "auth",
      cdn: "cdn",
      message: "message",
      text: "text",
      "code-block": "code-block",
      annotation: "annotation",
      "comment-bubble": "comment-bubble",
    };

    const shapeType = toolToShapeMap[currentTool] ?? "rectangle";
    const defaults = SHAPE_DEFAULTS[shapeType as keyof typeof SHAPE_DEFAULTS] ?? SHAPE_DEFAULTS.rectangle;

    const sizeMap: Partial<Record<EditorTool, [number, number]>> = {
      circle: [110, 110],
      database: [170, 100],
      loadbalancer: [120, 120],
      apigateway: [160, 100],
      auth: [130, 80],
      cdn: [150, 150],
      queue: [130, 100],
      text: [200, 80],
      "code-block": [300, 180],
      annotation: [220, 130],
      "comment-bubble": [200, 100],
    };

    const [w, h] = sizeMap[currentTool] ?? [140, 90];

    return {
      id: `shape-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      x: worldPoint.x - w / 2,
      y: worldPoint.y - h / 2,
      w,
      h,
      locked: false,
      rotation: 0,
      zIndex: 1,
      type: shapeType,
      label: "",
      fillColor: "transparent",
      strokeColor: defaults.strokeColor || "#3b82f6",
      strokeWidth: defaults.strokeWidth || 2,
      opacity: 1,
      metadata: {},
    };
  }

  private createSemanticArrow(sourceShapeId: string, targetShapeId: string): void {
    const store = useCanvasStore.getState();
    const fromShape = store.getShape(sourceShapeId);
    const toShape = store.getShape(targetShapeId);
    if (!fromShape || !toShape) return;

    const defaults = inferArrowDefaults(fromShape, toShape);

    store.addArrow({
      id: `arrow-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      fromShapeId: sourceShapeId,
      toShapeId: targetShapeId,
      fromPoint: "center",
      toPoint: "center",
      semanticType: defaults.semanticType,
      label: defaults.label,
      labelPosition: "above",
      strokeColor: defaults.strokeColor,
      strokeWidth: 2,
      strokeStyle: defaults.strokeStyle,
      bidirectional: false,
    });
    this.scheduleAutosave();
  }

  private attachDraggedShapeToParent(shapeId: string): void {
    const store = useCanvasStore.getState();
    const shape = store.getShape(shapeId);
    if (!shape) return;

    const center = {
      x: shape.x + shape.w / 2,
      y: shape.y + shape.h / 2,
    };
    const parent = this.findContainerParent(center, shapeId);

    if (parent && parent.id !== shape.parentId) {
      store.updateShape(shapeId, { parentId: parent.id });
    } else if (!parent && shape.parentId) {
      store.removeChildFromParent(shapeId);
    }
  }

  private onMouseDown(e: MouseEvent): void {
    e.preventDefault();
    const screenPoint = this.getCanvasScreenPoint(e);
    const worldPoint = this.screenToWorld(e.clientX, e.clientY);
    const store = useCanvasStore.getState();
    const iState = this.interaction.getState();

    // Update pointer state
    this.interaction.pointerDown(screenPoint.x, screenPoint.y, worldPoint.x, worldPoint.y);

    // PRIORITY 1: If editing text → commit/exit on outside click
    if (iState.mode === "editing-text") {
      const hitShape = this.hitTestShapes(worldPoint);
      if (hitShape !== iState.focusedShapeId) {
        // Click outside text editor - commit and exit
        store.stopEditing();
        this.interaction.stopTextEditing(true);
        store.clearSelection();
        this.render();
        return;
      }
    }

    // PRIORITY 2: If resizing → skip to resize logic
    if (iState.mode === "resizing") {
      this.render();
      return;
    }

    const activeTool = this.interaction.getActiveTool();

    // PRIORITY 3: Arrow tool - special two-click handling
    if (activeTool === "arrow") {
      const hitId = this.hitTestShapes(worldPoint);
      if (hitId) {
        if (!iState.arrowSourceShapeId) {
          // First click - start arrow from this shape
          this.interaction.startArrow(hitId);
          store.setSelection(new Set([hitId]));
        } else if (hitId !== iState.arrowSourceShapeId) {
          // Second click - complete arrow to target
          this.createSemanticArrow(iState.arrowSourceShapeId, hitId);
          this.interaction.cancelArrow();
          store.clearSelection();
        }
      } else {
        this.interaction.cancelArrow();
        store.clearSelection();
      }
      this.render();
      return;
    }

    // PRIORITY 4: Drawing tools - create shape and auto-return to select
    // Ignore extra mousedown while a shape is still being placed (mouseup completes it).
    if (iState.mode === "drawing") {
      this.render();
      return;
    }

    const newShape = this.createShapeFromTool(activeTool, worldPoint);
    if (newShape) {
      const parent = this.findContainerParent(worldPoint);
      if (parent) {
        store.addChildShape(parent.id, newShape);
      } else {
        store.addShape(newShape);
      }
      store.setSelection(new Set([newShape.id]));
      this.interaction.startDrawing(newShape.id);
      this.scheduleAutosave();
      // Only render once after all state updates
      return;
    }

    // PRIORITY 5: Delete button testing
    const selectedShapes = store.getSelectedShapes();
    if (selectedShapes.length === 1) {
      if (this.hitTestDeleteButton(selectedShapes[0].id, screenPoint)) {
        const shapeId = selectedShapes[0].id;
        store.deleteShape(shapeId);
        store.clearSelection();
        this.scheduleAutosave();
        this.render();
        return;
      }
    }

    // PRIORITY 6: Resize handle testing
    if (selectedShapes.length === 1) {
      const resizeHandle = this.hitTestResizeHandle(selectedShapes[0].id, screenPoint);
      if (resizeHandle) {
        const shape = selectedShapes[0];
        this.resizeStartShape = { x: shape.x, y: shape.y, w: shape.w, h: shape.h };
        this.resizeStartWorld = { ...worldPoint };
        this.interaction.startResizing(shape.id, resizeHandle);
        this.render();
        return;
      }
    }

    // PRIORITY 7: Shape hit testing
    const shapeId = this.hitTestShapes(worldPoint);

    // PRIORITY 8: Marquee selection (Shift) or pan (normal) on empty canvas with select tool
    if (!shapeId && activeTool === "select") {
      if (e.shiftKey) {
        // Shift+drag = marquee selection
        this.interaction.startMarqueeSelect(worldPoint.x, worldPoint.y);
        store.clearSelection();
      } else {
        // Normal drag on empty canvas = pan
        this.interaction.startPanning();
      }
      this.render();
      return;
    }

    // PRIORITY 9: Normal selection
    if (activeTool === "select") {
      if (shapeId) {
        const isMultiKey = e.ctrlKey || e.metaKey || e.shiftKey;
        if (isMultiKey) {
          if (store.isShapeSelected(shapeId)) {
            store.removeFromSelection(shapeId);
          } else {
            store.addToSelection(shapeId);
          }
          this.render();
          return;
        }

        // If clicking a shape that is already part of a multi-selection,
        // start group drag without resetting selection
        const currentSelection = store.editorState.selection.shapeIds;
        if (currentSelection.size > 1 && currentSelection.has(shapeId)) {
          this.beginShapeDrag(worldPoint, shapeId);
          this.render();
          return;
        }

        // Single select + drag
        store.setSelection(new Set([shapeId]));
        this.beginShapeDrag(worldPoint, shapeId);
      } else {
        store.clearSelection();
      }
    } else if (shapeId && activeTool === "pan") {
      // Pan mode
      this.interaction.startPanning();
    }

    this.render();
  }

  private onMouseMove(e: MouseEvent): void {
    const worldPoint = this.screenToWorld(e.clientX, e.clientY);
    const screenPoint = { x: e.clientX, y: e.clientY };
    const store = useCanvasStore.getState();

    // Read mode directly from mutable state (not frozen snapshot)
    const mode = this.interaction.getMode();

    if (mode === "marquee-select") {
      this.interaction.updateMarqueeSelect(worldPoint.x, worldPoint.y);
      this.render();
      return;
    }

    if (mode === "creating-arrow") {
      // Update arrow preview as mouse moves
      this.interaction.updatePointer(screenPoint.x, screenPoint.y, worldPoint.x, worldPoint.y);
      this.render();
      return;
    }

    if (mode === "dragging") {
      const activeShapeId = this.interaction.getState().activeShapeId;
      // Compute absolute delta from drag start to avoid accumulated rounding errors
      let rawDeltaX = worldPoint.x - this.dragStartWorld.x;
      let rawDeltaY = worldPoint.y - this.dragStartWorld.y;

      if (!e.shiftKey && GRID_SIZE > 0) {
        rawDeltaX = Math.round(rawDeltaX / GRID_SIZE) * GRID_SIZE;
        rawDeltaY = Math.round(rawDeltaY / GRID_SIZE) * GRID_SIZE;
      }

      const selectedIds = store.editorState.selection.shapeIds;

      if (selectedIds.size > 1) {
        this.ensureGroupDragStartPositions();
        const dragData = this.groupDragStartPositions;
        if (dragData) {
          dragData.forEach((startPos, id) => {
            store.updateShape(id, {
              x: startPos.x + rawDeltaX,
              y: startPos.y + rawDeltaY,
            });
          });
        }
      } else if (activeShapeId) {
        // Single shape drag using absolute position
        store.updateShape(activeShapeId, {
          x: this.dragStartShapePos.x + rawDeltaX,
          y: this.dragStartShapePos.y + rawDeltaY,
        });
      }

      this.render();
      return;
    }

    if (mode === "resizing") {
      const iState = this.interaction.getState();
      if (iState.activeShapeId && iState.resizeHandle && this.resizeStartShape) {
        let rawDeltaX = worldPoint.x - this.resizeStartWorld.x;
        let rawDeltaY = worldPoint.y - this.resizeStartWorld.y;

        if (!e.shiftKey && GRID_SIZE > 0) {
          rawDeltaX = Math.round(rawDeltaX / GRID_SIZE) * GRID_SIZE;
          rawDeltaY = Math.round(rawDeltaY / GRID_SIZE) * GRID_SIZE;
        }

        this.handleResize(
          iState.activeShapeId,
          { x: rawDeltaX, y: rawDeltaY },
          iState.resizeHandle
        );
      }
      this.render();
      return;
    }

    if (mode === "panning") {
      this.viewState.offsetX += e.movementX;
      this.viewState.offsetY += e.movementY;
      this.emitViewStateChange();
      this.render();
      return;
    }

    // Update hover cursor
    this.interaction.updatePointer(screenPoint.x, screenPoint.y, worldPoint.x, worldPoint.y);
    this.render();
  }

  private onMouseUp(_e: MouseEvent): void {
    const store = useCanvasStore.getState();
    const mode = this.interaction.getMode();
    const iState = this.interaction.getState();

    this.interaction.pointerUp();

    if (mode === "marquee-select") {
      const bounds = this.interaction.completeMarqueeSelect();
      if (bounds) {
        const shapes = store.getAllShapes();
        const selectedIds = shapes
          .filter((shape) => intersectsRect(bounds, shape))
          .map((s) => s.id);
        if (selectedIds.length > 0) {
          store.setSelection(new Set(selectedIds));
          // Record start positions for potential group drag
          this.groupDragStartPositions = new Map(
            selectedIds.map((id) => {
              const s = store.getShape(id)!;
              return [id, { x: s.x, y: s.y }];
            })
          );
        }
      }
    }

    if (mode === "dragging") {
      this.interaction.stopDragging();
      this.groupDragStartPositions = null;
      this.scheduleAutosave();
      this.pushHistorySnapshot();
    }

    if (mode === "creating-arrow") {
      const worldPoint = this.screenToWorld(_e.clientX, _e.clientY);
      const iState = this.interaction.getState();
      const targetId = this.hitTestShapes(worldPoint);

      // Complete arrow if we hit a different shape
      if (
        targetId &&
        iState.arrowSourceShapeId &&
        targetId !== iState.arrowSourceShapeId
      ) {
        this.createSemanticArrow(iState.arrowSourceShapeId, targetId);
        this.pushHistorySnapshot();
        this.scheduleAutosave();
      }

      // Cancel arrow mode
      this.interaction.cancelArrow();
      store.clearSelection();
    }

    if (mode === "resizing") {
      this.interaction.stopResizing();
      this.resizeStartShape = null;
      this.scheduleAutosave();
      this.pushHistorySnapshot();
    }

    if (mode === "panning") {
      this.interaction.stopPanning();
    }

    if (mode === "drawing") {
      this.interaction.completeDrawing();
      this.pushHistorySnapshot();
      this.scheduleAutosave();
    }

    this.render();
  }

  private pushHistorySnapshot(): void {
    const store = useCanvasStore.getState();
    const snapshot = this.getSnapshot();
    store.pushSnapshot(snapshot);
  }

  private onDoubleClick(e: MouseEvent): void {
    const worldPoint = this.screenToWorld(e.clientX, e.clientY);
    const shapeId = this.hitTestShapes(worldPoint);
    const store = useCanvasStore.getState();
    
    if (shapeId) {
      // Double-click on a shape: start text editing
      store.startEditing(shapeId);
      this.interaction.startTextEditing(shapeId);
      this.render();
    } else {
      // Double-click on empty canvas: start marquee/group selection
      this.interaction.startMarqueeSelect(worldPoint.x, worldPoint.y);
      store.clearSelection();
      this.render();
    }
  }

  private onContextMenu(e: MouseEvent): void {
    e.preventDefault();
    const worldPoint = this.screenToWorld(e.clientX, e.clientY);
    const shapeId = this.hitTestShapes(worldPoint);
    if (shapeId) {
      const store = useCanvasStore.getState();
      store.openDetailPanel(shapeId);
      store.setSelection(new Set([shapeId]));
      this.render();
    }
  }

  private getTouchDistance(touches: TouchList): number {
    if (touches.length < 2) return 0;
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.sqrt(dx * dx + dy * dy);
  }

  private getTouchCenterPoint(touches: TouchList): { x: number; y: number } {
    const x = (touches[0].clientX + touches[1].clientX) / 2;
    const y = (touches[0].clientY + touches[1].clientY) / 2;
    return { x, y };
  }

  private onTouchStart(e: TouchEvent): void {
    e.preventDefault();
    if (e.touches.length === 2) {
      this.isTwoFingerTouch = true;
      this.lastTouchDistance = this.getTouchDistance(e.touches);
      const center = this.getTouchCenterPoint(e.touches);
      this.lastTouchX = center.x;
      this.lastTouchY = center.y;
      this.interaction.startPanning();
    }
  }

  private onTouchMove(e: TouchEvent): void {
    e.preventDefault();
    if (this.isTwoFingerTouch && e.touches.length === 2) {
      const currentDistance = this.getTouchDistance(e.touches);
      const distanceDelta = Math.abs(currentDistance - this.lastTouchDistance);
      
      if (distanceDelta < 10) {
        // Pan mode - not pinching, just panning
        const center = this.getTouchCenterPoint(e.touches);
        const movementX = center.x - this.lastTouchX;
        const movementY = center.y - this.lastTouchY;
        
        this.viewState.offsetX += movementX;
        this.viewState.offsetY += movementY;
        
        this.lastTouchX = center.x;
        this.lastTouchY = center.y;
        this.emitViewStateChange();
        this.render();
      }
      
      this.lastTouchDistance = currentDistance;
    }
  }

  private onTouchEnd(e: TouchEvent): void {
    e.preventDefault();
    if (e.touches.length < 2) {
      this.isTwoFingerTouch = false;
      this.interaction.stopPanning();
      this.render();
    }
  }

  private onKeyDown(e: KeyboardEvent): void {
    const store = useCanvasStore.getState();
    const iState = this.interaction.getState();

    // Don't intercept keys while editing text (except Escape)
    if (iState.mode === "editing-text" && e.key !== "Escape") {
      return;
    }

    if (e.key === "Escape") {
      // Exit all editing modes and return to select
      this.interaction.reset();
      store.stopEditing();
      store.closeDetailPanel();
      store.clearSelection();
      store.setTool("select");
      this.render();
      return;
    }

    if (e.key === "Delete" || e.key === "Backspace") {
      store.editorState.selection.shapeIds.forEach((id) => store.deleteShape(id));
      store.clearSelection();
      this.scheduleAutosave();
      this.render();
      return;
    }

    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
      e.preventDefault();
      store.undo();
      this.render();
      return;
    }

    if ((e.ctrlKey || e.metaKey) && (e.key.toLowerCase() === "y" || (e.shiftKey && e.key.toLowerCase() === "z"))) {
      e.preventDefault();
      store.redo();
      this.render();
      return;
    }

    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "c") {
      store.copyToClipboard();
      return;
    }

    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "v") {
      store.pasteFromClipboard();
      this.pushHistorySnapshot();
      this.scheduleAutosave();
      this.render();
      return;
    }

    if (e.key === "[") {
      store.editorState.selection.shapeIds.forEach((id) => {
        const shape = store.getShape(id);
        if (shape) {
          store.updateShape(id, { zIndex: (shape.zIndex || 0) - 1 });
        }
      });
      this.pushHistorySnapshot();
      this.render();
      return;
    }

    if (e.key === "]") {
      store.editorState.selection.shapeIds.forEach((id) => {
        const shape = store.getShape(id);
        if (shape) {
          store.updateShape(id, { zIndex: (shape.zIndex || 0) + 1 });
        }
      });
      this.pushHistorySnapshot();
      this.render();
      return;
    }
  }

  private onWheel(e: WheelEvent): void {
    e.preventDefault();

    const zoomDelta = e.deltaY > 0 ? 0.9 : 1.1;
    const newZoom = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, this.viewState.zoom * zoomDelta));

    const rect = this.canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const zoomChange = newZoom / this.viewState.zoom;
    this.viewState.offsetX = mouseX - (mouseX - this.viewState.offsetX) * zoomChange;
    this.viewState.offsetY = mouseY - (mouseY - this.viewState.offsetY) * zoomChange;
    this.viewState.zoom = newZoom;

    this.emitViewStateChange();
    this.render();
  }

  private handleResize(shapeId: string, delta: Vec2, handle: string): void {
    if (!this.resizeStartShape) return;
    const store = useCanvasStore.getState();
    const MIN = 40;

    let { x, y, w, h } = this.resizeStartShape;

    switch (handle) {
      case "nw":
        x += delta.x; y += delta.y;
        w -= delta.x; h -= delta.y;
        break;
      case "ne":
        y += delta.y;
        w += delta.x; h -= delta.y;
        break;
      case "se":
        w += delta.x; h += delta.y;
        break;
      case "sw":
        x += delta.x;
        w -= delta.x; h += delta.y;
        break;
    }

    if (w < MIN || h < MIN) return;
    store.updateShape(shapeId, { x, y, w, h });
  }

  private drawShapeTree(shape: Shape, selectedIds: Set<string>, editingId: string | null | undefined): void {
    const isSelected = selectedIds.has(shape.id);
    const isEditing = editingId === shape.id;

    this.renderer.drawShape(shape, isSelected, isEditing);

    (shape.children ?? []).forEach((childId) => {
      const child = useCanvasStore.getState().getShape(childId);
      if (child) {
        this.drawShapeTree(child, selectedIds, editingId);
      }
    });
  }

  public render(): void {
    if (this.animFramePending) return;
    this.animFramePending = true;

    requestAnimationFrame(() => {
      this.animFramePending = false;
      this.isRendering = true;

      this.renderer.updateSize(this.canvas.width, this.canvas.height);
      this.renderer.clear();

      const store = useCanvasStore.getState();
      const shapes = store.getAllShapes();
      const arrows = store.getAllArrows();
      const selectedShapeIds = store.editorState.selection.shapeIds;
      const editingId = store.editorState.editingShapeId;
      const iState = this.interaction.getState();

      this.renderer.drawGrid(this.viewState);
      this.renderer.setViewTransform(this.viewState);

      arrows.forEach((arrow) => {
        const fromShape = store.getShape(arrow.fromShapeId);
        const toShape = store.getShape(arrow.toShapeId);
        if (fromShape && toShape) {
          const isSelected = selectedShapeIds.has(arrow.id);
          this.renderer.drawArrowConnector(arrow, fromShape, toShape, isSelected);
        }
      });

      shapes.filter((shape) => !shape.parentId).forEach((shape) => {
        this.drawShapeTree(shape, selectedShapeIds, editingId);
      });

      // Arrow creation preview line
      if (iState.mode === "creating-arrow" && iState.arrowSourceShapeId) {
        const srcShape = store.getShape(iState.arrowSourceShapeId);
        if (srcShape) {
          const cx = srcShape.x + srcShape.w / 2;
          const cy = srcShape.y + srcShape.h / 2;
          const wx = iState.pointerState.worldX;
          const wy = iState.pointerState.worldY;
          this.renderer.drawArrowPreview(cx, cy, wx, wy);
        }
      }

      this.renderer.restoreViewTransform();

      // Draw marquee selection in screen space (after view transform is restored)
      if (iState.mode === "marquee-select" && iState.selectionBounds) {
        const bounds = iState.selectionBounds;
        const x = this.viewState.offsetX + bounds.x * this.viewState.zoom;
        const y = this.viewState.offsetY + bounds.y * this.viewState.zoom;
        const w = bounds.w * this.viewState.zoom;
        const h = bounds.h * this.viewState.zoom;
        this.renderer.drawMarqueeSelection(x, y, w, h);
      }

      this.renderer.drawMinimap(shapes, this.viewState);
      this.isRendering = false;
    });
  }

  public zoom(delta: number): void {
    this.viewState.zoom = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, this.viewState.zoom * delta));
    this.emitViewStateChange();
    this.render();
  }

  public pan(dx: number, dy: number): void {
    this.viewState.offsetX += dx;
    this.viewState.offsetY += dy;
    this.emitViewStateChange();
    this.render();
  }

  public resetView(): void {
    this.viewState = {
      offsetX: 0,
      offsetY: 0,
      zoom: 1,
      width: this.canvas.width,
      height: this.canvas.height,
    };
    this.emitViewStateChange();
    this.render();
  }

  public getSnapshot(): CanvasSnapshot {
    const store = useCanvasStore.getState();
    return {
      id: generateId("snapshot"),
      version: 1,
      timestamp: Date.now(),
      shapes: store.getAllShapes(),
      arrows: store.getAllArrows(),
      viewState: this.viewState,
      metadata: {
        title: "Canvas Snapshot",
      },
    };
  }
}
