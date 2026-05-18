import { ViewState, ArchitectureNode } from "@/types/architecture";
import { CanvasRenderer } from "./renderer";
import { useArchStore } from "@/store/architectureStore";

export interface Vec2 { x: number; y: number; }

export const Vec = {
  add: (a: Vec2, b: Vec2): Vec2 => ({ x: a.x + b.x, y: a.y + b.y }),
  sub: (a: Vec2, b: Vec2): Vec2 => ({ x: a.x - b.x, y: a.y - b.y }),
  mul: (v: Vec2, s: number): Vec2 => ({ x: v.x * s, y: v.y * s }),
  normalize: (v: Vec2): Vec2 => { const len = Math.sqrt(v.x * v.x + v.y * v.y); return len > 0 ? { x: v.x / len, y: v.y / len } : { x: 0, y: 0 }; },
};

export const RectOps = {
  contains: (rect: { x: number; y: number; w: number; h: number }, pt: Vec2): boolean => pt.x >= rect.x && pt.x <= rect.x + rect.w && pt.y >= rect.y && pt.y <= rect.y + rect.h,
};

export function screenToWorld(sx: number, sy: number, ox: number, oy: number, z: number): Vec2 {
  return { x: (sx - ox) / z, y: (sy - oy) / z };
}

interface EngineOptions { onViewStateChange?: (vs: ViewState) => void; }

export class CanvasEngine {
  private canvas: HTMLCanvasElement;
  private renderer: CanvasRenderer;
  private vs: ViewState;
  private animPending = false;
  private opts: EngineOptions;

  private isDragging = false;
  private dragStart: Vec2 | null = null;
  private dragNodeId: string | null = null;
  private dragOrigin: Vec2 | null = null;
  private resizingId: string | null = null;
  private resizeHandle: string | null = null;

  constructor(canvas: HTMLCanvasElement, opts: EngineOptions = {}) {
    this.canvas = canvas; this.opts = opts;
    const ctx = canvas.getContext("2d"); if (!ctx) throw new Error("No 2D context");
    this.renderer = new CanvasRenderer(ctx);
    this.vs = { offsetX: 0, offsetY: 0, zoom: 1, width: canvas.width, height: canvas.height };
    this.setup(); this.render();
  }

  getViewState(): ViewState { return { ...this.vs }; }

  private setup(): void {
    const c = this.canvas;
    c.addEventListener("mousedown", e => this.onMouseDown(e));
    c.addEventListener("mousemove", e => this.onMouseMove(e));
    c.addEventListener("mouseup", e => this.onMouseUp(e));
    c.addEventListener("dblclick", e => this.onDblClick(e));
    c.addEventListener("contextmenu", e => this.onContextMenu(e));
    c.addEventListener("wheel", e => this.onWheel(e), { passive: false });
    window.addEventListener("keydown", e => this.onKey(e));

    let timer: ReturnType<typeof setTimeout> | null = null;
    new ResizeObserver(entries => {
      for (const en of entries) {
        const { width, height } = en.contentRect;
        if (!width || !height) continue;
        if (timer) clearTimeout(timer);
        timer = setTimeout(() => {
          if (Math.abs(c.width - width) < 1 && Math.abs(c.height - height) < 1) return;
          c.width = Math.floor(width); c.height = Math.floor(height);
          this.vs.width = c.width; this.vs.height = c.height;
          useArchStore.getState().setViewState(this.vs);
          this.render();
        }, 40);
      }
    }).observe(c);
  }

  private toWorld(cx: number, cy: number): Vec2 {
    const r = this.canvas.getBoundingClientRect();
    return screenToWorld(cx - r.left, cy - r.top, this.vs.offsetX, this.vs.offsetY, this.vs.zoom);
  }

  private hitNode(wp: Vec2, exclude?: string): string | null {
    const nodes = useArchStore.getState().getAllNodes();
    for (let i = nodes.length - 1; i >= 0; i--) { const n = nodes[i]; if (n.id === exclude) continue; if (RectOps.contains(n.visual, wp)) return n.id; }
    return null;
  }

  private hitResizeHandle(nodeId: string, sp: Vec2): string | null {
    const node = useArchStore.getState().getNode(nodeId); if (!node) return null;
    const { x, y, w, h } = node.visual; const ox = this.vs.offsetX, oy = this.vs.offsetY, z = this.vs.zoom;
    const sx = ox + x * z, sy = oy + y * z, sw = w * z, sh = h * z;
    const handles = [{ id: "nw", x: sx, y: sy }, { id: "ne", x: sx + sw, y: sy }, { id: "se", x: sx + sw, y: sy + sh }, { id: "sw", x: sx, y: sy + sh },];
    for (const h of handles) { if (Math.abs(sp.x - h.x) < 10 && Math.abs(sp.y - h.y) < 10) return h.id; }
    return null;
  }

  private onMouseDown(e: MouseEvent): void {
    e.preventDefault(); const sp = { x: e.clientX, y: e.clientY }; const wp = this.toWorld(e.clientX, e.clientY);
    const store = useArchStore.getState(); const tool = store.ui.currentTool;

    if (tool === "arrow") {
      const hitId = this.hitNode(wp);
      const from = store.ui.arrowFromNodeId;
      if (hitId) {
        if (!from) { store.setArrowFrom(hitId); store.select([hitId]); }
        else if (hitId !== from) { store.addEdge(from, hitId); store.setArrowFrom(null); store.clearSelection(); store.pushHistory(); }
      } else { store.setArrowFrom(null); store.clearSelection(); }
      this.render(); return;
    }

    const DRAW_TOOLS = new Set(["service", "database", "cache", "queue", "gateway", "auth", "cdn", "load-balancer", "frontend", "worker", "storage", "container", "code", "markdown", "annotation"]);
    if (DRAW_TOOLS.has(tool)) {
      const node = store.addNode(tool as any, wp.x, wp.y);
      const parentHit = this.hitNode(wp, node.id);
      const parentNode = parentHit ? store.getNode(parentHit) : null;
      if (parentNode?.nodeType === "container" || parentNode?.nodeType === "group") { store.setParent(node.id, parentHit!); }
      store.select([node.id]); store.pushHistory(); this.render(); return;
    }

    const selected = store.ui.selectedNodeIds;
    if (selected.size === 1) {
      const [selId] = Array.from(selected); const rh = this.hitResizeHandle(selId, sp);
      if (rh) { this.resizingId = selId; this.resizeHandle = rh; this.dragStart = wp; this.isDragging = true; return; }
    }

    const hitId = this.hitNode(wp);
    if (e.ctrlKey || e.metaKey) { if (hitId) store.addToSelection(hitId); }
    else if (hitId) { if (!store.isSelected(hitId)) store.select([hitId]); const node = store.getNode(hitId)!; this.dragNodeId = hitId; this.dragOrigin = { x: node.visual.x, y: node.visual.y }; this.dragStart = wp; }
    else { store.clearSelection(); }

    this.isDragging = true; this.dragStart = this.dragStart ?? wp; this.render();
  }

  private onMouseMove(e: MouseEvent): void {
    if (!this.isDragging || !this.dragStart) { this.render(); return; }
    const wp = this.toWorld(e.clientX, e.clientY); const delta = Vec.sub(wp, this.dragStart); const store = useArchStore.getState();
    if (this.resizingId) { this.handleResize(this.resizingId, delta); }
    else if (this.dragNodeId && this.dragOrigin) { store.updateNodeVisual(this.dragNodeId, { x: this.dragOrigin.x + delta.x, y: this.dragOrigin.y + delta.y }); }
    else { this.vs.offsetX += e.movementX; this.vs.offsetY += e.movementY; this.opts.onViewStateChange?.(this.vs); store.setViewState(this.vs); }
    this.render();
  }

  private onMouseUp(_e: MouseEvent): void {
    if (this.dragNodeId) {
      const store = useArchStore.getState(); const node = store.getNode(this.dragNodeId);
      if (node) {
        const center = { x: node.visual.x + node.visual.w / 2, y: node.visual.y + node.visual.h / 2 };
        const parentHit = this.hitNode(center, this.dragNodeId); const parentNode = parentHit ? store.getNode(parentHit) : null;
        if (parentNode?.nodeType === "container" || parentNode?.nodeType === "group") { if (node.parentId !== parentHit) store.setParent(this.dragNodeId, parentHit!); }
        else if (node.parentId) { store.setParent(this.dragNodeId, null); }
      }
      store.pushHistory();
    }
    this.isDragging = false; this.dragNodeId = null; this.dragOrigin = null; this.resizingId = null; this.resizeHandle = null; this.dragStart = null; this.render();
  }

  private onDblClick(e: MouseEvent): void { const wp = this.toWorld(e.clientX, e.clientY); const hitId = this.hitNode(wp); if (hitId) { useArchStore.getState().openNodePanel(hitId); useArchStore.getState().select([hitId]); this.render(); } }

  private onContextMenu(e: MouseEvent): void { e.preventDefault(); const wp = this.toWorld(e.clientX, e.clientY); const hitId = this.hitNode(wp); if (hitId) { useArchStore.getState().openNodePanel(hitId); useArchStore.getState().select([hitId]); this.render(); } }

  private onWheel(e: WheelEvent): void { e.preventDefault(); const factor = e.deltaY > 0 ? 0.9 : 1.1; const newZoom = Math.max(0.1, Math.min(5, this.vs.zoom * factor)); const rect = this.canvas.getBoundingClientRect(); const mx = e.clientX - rect.left, my = e.clientY - rect.top; const zc = newZoom / this.vs.zoom; this.vs.offsetX = mx - (mx - this.vs.offsetX) * zc; this.vs.offsetY = my - (my - this.vs.offsetY) * zc; this.vs.zoom = newZoom; this.opts.onViewStateChange?.(this.vs); useArchStore.getState().setViewState(this.vs); this.render(); }

  private onKey(e: KeyboardEvent): void {
    const store = useArchStore.getState(); if (store.ui.editingNodeId) return; const mod = e.ctrlKey || e.metaKey;
    if (e.key === "Delete" || e.key === "Backspace") { Array.from(store.ui.selectedNodeIds).forEach(id => store.deleteNode(id)); store.clearSelection(); store.pushHistory(); this.render(); }
    if (mod && e.key === "z") { e.preventDefault(); store.undo(); this.render(); }
    if (mod && (e.key === "y" || (e.shiftKey && e.key === "z"))) { e.preventDefault(); store.redo(); this.render(); }
    if (mod && e.key === "c") store.copy();
    if (mod && e.key === "v") { store.paste(); store.pushHistory(); this.render(); }
    if (e.key === "Escape") { store.setArrowFrom(null); store.clearSelection(); store.setTool("select"); this.render(); }
  }

  private handleResize(nodeId: string, delta: Vec2): void {
    const store = useArchStore.getState(); const node = store.getNode(nodeId); if (!node || !this.resizeHandle) return; const MIN = 80; let { x, y, w, h } = node.visual;
    switch (this.resizeHandle) {
      case "nw": x += delta.x; y += delta.y; w -= delta.x; h -= delta.y; break;
      case "ne": y += delta.y; w += delta.x; h -= delta.y; break;
      case "se": w += delta.x; h += delta.y; break;
      case "sw": x += delta.x; w -= delta.x; h += delta.y; break;
    }
    if (w >= MIN && h >= MIN) { store.updateNodeVisual(nodeId, { x, y, w, h }); if (this.dragStart) this.dragStart = Vec.add(this.dragStart, delta); }
  }

  public render(): void {
    if (this.animPending) return; this.animPending = true; requestAnimationFrame(() => {
      this.animPending = false; const store = useArchStore.getState(); const nodes = store.getAllNodes(); const edges = store.getAllEdges(); const { selectedNodeIds, arrowFromNodeId } = store.ui;
      this.renderer.resize(this.canvas.width, this.canvas.height); this.renderer.clear(); this.renderer.drawGrid(this.vs); this.renderer.beginWorld(this.vs);

      nodes.filter(n => n.nodeType === "container" || n.nodeType === "group").forEach(n => this.renderer.drawContainerNode(n, selectedNodeIds.has(n.id)));

      edges.forEach(e => { const from = store.getNode(e.fromNodeId); const to = store.getNode(e.toNodeId); if (from && to) this.renderer.drawEdge(e, from, to, selectedNodeIds.has(e.id)); });

      nodes.filter(n => n.nodeType !== "container" && n.nodeType !== "group").sort((a, b) => (a.visual.zIndex ?? 0) - (b.visual.zIndex ?? 0)).forEach(n => this.renderer.drawNode(n, selectedNodeIds.has(n.id)));

      if (arrowFromNodeId) { const n = store.getNode(arrowFromNodeId); if (n) this.renderer.drawArrowFromIndicator(n); }

      this.renderer.endWorld();
    });
  }

  public resetView(): void { this.vs = { offsetX: 0, offsetY: 0, zoom: 1, width: this.canvas.width, height: this.canvas.height }; this.render(); }

  public fitToContent(): void {
    const nodes = useArchStore.getState().getAllNodes(); if (!nodes.length) { this.resetView(); return; }
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity; nodes.forEach(n => { minX = Math.min(minX, n.visual.x); minY = Math.min(minY, n.visual.y); maxX = Math.max(maxX, n.visual.x + n.visual.w); maxY = Math.max(maxY, n.visual.y + n.visual.h); });
    const pad = 80, cw = this.canvas.width, ch = this.canvas.height; const zoom = Math.min(0.95, Math.min(cw / (maxX - minX + 2 * pad), ch / (maxY - minY + 2 * pad)));
    this.vs.zoom = zoom; this.vs.offsetX = cw / 2 - ((minX + maxX) / 2) * zoom; this.vs.offsetY = ch / 2 - ((minY + maxY) / 2) * zoom; this.render();
  }
}
