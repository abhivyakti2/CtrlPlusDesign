import { create } from "zustand";
import {
  ArchitectureNode, ArchitectureEdge, ArchitectureDocument,
  ViewState, EditorUiState, EditorTool,
  NodeType, RelationshipType, NodeContent, CodeBlock, RichTextBlock,
  AnnotationThread, CodeLanguage,
} from "@/types/architecture";
import { inferRelationshipType, relColor, relStroke } from "@/canvas/semantics";

const NODE_COLORS: Record<NodeType, string> = {
  service: "#3b82f6",
  database: "#06b6d4",
  cache: "#ef4444",
  queue: "#f59e0b",
  gateway: "#8b5cf6",
  "load-balancer": "#ec4899",
  cdn: "#10b981",
  auth: "#d946ef",
  frontend: "#5b7fff",
  mobile: "#64748b",
  worker: "#f97316",
  scheduler: "#84cc16",
  storage: "#0ea5e9",
  monitoring: "#a16207",
  container: "#1e293b",
  group: "#1e293b",
  code: "#0f172a",
  markdown: "#fef3c7",
  annotation: "#fef9c3",
};

const NODE_SIZES: Partial<Record<NodeType, [number, number]>> = {
  service: [200, 120],
  database: [180, 110],
  cache: [160, 100],
  queue: [180, 100],
  gateway: [200, 110],
  "load-balancer": [160, 110],
  cdn: [160, 110],
  auth: [160, 100],
  frontend: [200, 120],
  worker: [180, 100],
  container: [400, 300],
  group: [360, 280],
  code: [380, 240],
  markdown: [320, 200],
  annotation: [260, 120],
};

function makeDefaultContent(): NodeContent { return { blocks: [] }; }

function makeNode(nodeType: NodeType, x: number, y: number, overrides: Partial<ArchitectureNode> = {}): ArchitectureNode {
  const [w, h] = NODE_SIZES[nodeType] ?? [200, 120];
  return {
    id: `node-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    nodeType,
    title: nodeType.charAt(0).toUpperCase() + nodeType.slice(1),
    visual: { x: x - w / 2, y: y - h / 2, w, h, zIndex: 1, color: NODE_COLORS[nodeType], collapsed: false, locked: false },
    content: makeDefaultContent(),
    semantics: {},
    children: [],
    ...overrides,
  };
}

interface ArchitectureStore {
  nodes: Record<string, ArchitectureNode>;
  edges: Record<string, ArchitectureEdge>;
  ui: EditorUiState;
  viewState: ViewState;
  addNode: (nodeType: NodeType, x: number, y: number) => ArchitectureNode;
  updateNode: (id: string, updates: Partial<ArchitectureNode>) => void;
  updateNodeVisual: (id: string, visual: Partial<ArchitectureNode["visual"]>) => void;
  updateNodeSemantics: (id: string, semantics: Partial<ArchitectureNode["semantics"]>) => void;
  deleteNode: (id: string) => void;
  getNode: (id: string) => ArchitectureNode | undefined;
  getAllNodes: () => ArchitectureNode[];
  getRootNodes: () => ArchitectureNode[];
  setParent: (nodeId: string, parentId: string | null) => void;
  getChildren: (nodeId: string) => ArchitectureNode[];
  addEdge: (fromId: string, toId: string, overrides?: Partial<ArchitectureEdge>) => ArchitectureEdge;
  updateEdge: (id: string, updates: Partial<ArchitectureEdge>) => void;
  deleteEdge: (id: string) => void;
  getEdge: (id: string) => ArchitectureEdge | undefined;
  getAllEdges: () => ArchitectureEdge[];
  getEdgesForNode: (nodeId: string) => ArchitectureEdge[];
  addCodeBlock: (nodeId: string, lang: CodeLanguage, title?: string) => void;
  updateCodeBlock: (nodeId: string, blockId: string, patch: Partial<CodeBlock>) => void;
  deleteCodeBlock: (nodeId: string, blockId: string) => void;
  toggleCodeCollapse: (nodeId: string, blockId: string) => void;
  addRichTextBlock: (nodeId: string, title?: string) => void;
  updateRichTextBlock: (nodeId: string, blockId: string, patch: Partial<RichTextBlock>) => void;
  deleteRichTextBlock: (nodeId: string, blockId: string) => void;
  addAnnotation: (nodeId: string) => void;
  updateAnnotation: (nodeId: string, annId: string, patch: Partial<AnnotationThread>) => void;
  deleteAnnotation: (nodeId: string, annId: string) => void;
  select: (nodeIds: string[], edgeIds?: string[]) => void;
  addToSelection: (nodeId: string) => void;
  clearSelection: () => void;
  isSelected: (nodeId: string) => boolean;
  openNodePanel: (nodeId: string) => void;
  closeNodePanel: () => void;
  startTitleEdit: (nodeId: string) => void;
  stopTitleEdit: () => void;
  setTool: (tool: EditorTool) => void;
  setArrowFrom: (nodeId: string | null) => void;
  setViewState: (vs: Partial<ViewState>) => void;
  pushHistory: () => void;
  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;
  copy: () => void;
  paste: () => void;
  loadDocument: (doc: ArchitectureDocument) => void;
  exportDocument: () => ArchitectureDocument;
  clear: () => void;
}

const initialUi: EditorUiState = {
  currentTool: "select",
  selectedNodeIds: new Set(),
  selectedEdgeIds: new Set(),
  openNodeId: null,
  editingNodeId: null,
  arrowFromNodeId: null,
  hoveredNodeId: null,
  clipboard: [],
  history: [],
  historyIndex: -1,
};

const initialViewState: ViewState = { offsetX: 0, offsetY: 0, zoom: 1, width: 0, height: 0 };

function cloneDocState(nodes: Record<string, ArchitectureNode>, edges: Record<string, ArchitectureEdge>): ArchitectureDocument {
  return {
    id: `snap-${Date.now()}`,
    version: 1,
    timestamp: Date.now(),
    nodes: JSON.parse(JSON.stringify(nodes)),
    edges: JSON.parse(JSON.stringify(edges)),
    roots: Object.values(nodes).filter(n => !n.parentId).map(n => n.id),
    metadata: { title: "Snapshot" },
  };
}

function uid(): string { return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`; }

export const useArchStore = create<ArchitectureStore>((set, get) => ({
  nodes: {},
  edges: {},
  ui: { ...initialUi, selectedNodeIds: new Set(), selectedEdgeIds: new Set(), clipboard: [], history: [], historyIndex: -1 },
  viewState: { ...initialViewState },

  addNode: (nodeType, x, y) => {
    const node = makeNode(nodeType, x, y);
    set(s => ({ nodes: { ...s.nodes, [node.id]: node } }));
    return node;
  },

  updateNode: (id, updates) => set(s => ({ nodes: { ...s.nodes, [id]: { ...s.nodes[id], ...updates } } })),

  updateNodeVisual: (id, visual) => set(s => ({ nodes: { ...s.nodes, [id]: { ...s.nodes[id], visual: { ...s.nodes[id].visual, ...visual } } } })),

  updateNodeSemantics: (id, semantics) => set(s => ({ nodes: { ...s.nodes, [id]: { ...s.nodes[id], semantics: { ...s.nodes[id].semantics, ...semantics } } } })),

  deleteNode: (id) => {
    set(s => {
      const nodes = { ...s.nodes };
      const node = nodes[id];
      if (!node) return {};
      node.children.forEach(cid => { if (nodes[cid]) nodes[cid] = { ...nodes[cid], parentId: undefined }; });
      if (node.parentId && nodes[node.parentId]) { nodes[node.parentId] = { ...nodes[node.parentId], children: nodes[node.parentId].children.filter(c => c !== id) }; }
      delete nodes[id];
      const edges = Object.fromEntries(Object.entries(s.edges).filter(([, e]) => e.fromNodeId !== id && e.toNodeId !== id));
      return { nodes, edges };
    });
  },

  getNode: (id) => get().nodes[id],
  getAllNodes: () => Object.values(get().nodes),
  getRootNodes: () => Object.values(get().nodes).filter(n => !n.parentId),

  setParent: (nodeId, parentId) => {
    set(s => {
      const nodes = { ...s.nodes };
      const node = nodes[nodeId];
      if (!node) return {};
      if (node.parentId && nodes[node.parentId]) { nodes[node.parentId] = { ...nodes[node.parentId], children: nodes[node.parentId].children.filter(c => c !== nodeId) }; }
      if (parentId && nodes[parentId]) { nodes[parentId] = { ...nodes[parentId], children: [...new Set([...nodes[parentId].children, nodeId])] }; }
      nodes[nodeId] = { ...node, parentId: parentId ?? undefined };
      return { nodes };
    });
  },

  getChildren: (nodeId) => { const { nodes } = get(); return (nodes[nodeId]?.children ?? []).map(id => nodes[id]).filter(Boolean); },

  addEdge: (fromId, toId, overrides = {}) => {
    const from = get().nodes[fromId];
    const to = get().nodes[toId];
    const relType = overrides.relationshipType ?? inferRelationshipType(from, to);
    const edge: ArchitectureEdge = {
      id: `edge-${uid()}`,
      fromNodeId: fromId,
      toNodeId: toId,
      relationshipType: relType,
      strokeColor: relColor(relType),
      strokeStyle: relStroke(relType),
      strokeWidth: 2,
      animated: relType === "async-event",
      ...overrides,
    };
    set(s => ({ edges: { ...s.edges, [edge.id]: edge } }));
    return edge;
  },

  updateEdge: (id, updates) => set(s => ({ edges: { ...s.edges, [id]: { ...s.edges[id], ...updates } } })),

  deleteEdge: (id) => set(s => { const edges = { ...s.edges }; delete edges[id]; return { edges }; }),

  getEdge: (id) => get().edges[id],
  getAllEdges: () => Object.values(get().edges),
  getEdgesForNode: (nodeId) => Object.values(get().edges).filter(e => e.fromNodeId === nodeId || e.toNodeId === nodeId),

  addCodeBlock: (nodeId, lang, title) => {
    const block: CodeBlock = { id: `cb-${uid()}`, language: lang, code: "", title: title ?? `${lang} block`, collapsed: false };
    set(s => { const node = s.nodes[nodeId]; if (!node) return {}; return { nodes: { ...s.nodes, [nodeId]: { ...node, content: { blocks: [...node.content.blocks, { kind: "code" as const, data: block }] } } } }; });
  },

  updateCodeBlock: (nodeId, blockId, patch) => { set(s => { const node = s.nodes[nodeId]; if (!node) return {}; return { nodes: { ...s.nodes, [nodeId]: { ...node, content: { blocks: node.content.blocks.map(b => b.kind === "code" && b.data.id === blockId ? { ...b, data: { ...b.data, ...patch } } : b) } } } }; }); },

  deleteCodeBlock: (nodeId, blockId) => { set(s => { const node = s.nodes[nodeId]; if (!node) return {}; return { nodes: { ...s.nodes, [nodeId]: { ...node, content: { blocks: node.content.blocks.filter(b => !(b.kind === "code" && b.data.id === blockId)) } } } }; }); },

  toggleCodeCollapse: (nodeId, blockId) => { get().updateCodeBlock(nodeId, blockId, { collapsed: !(get().nodes[nodeId]?.content.blocks.find(b => b.kind === "code" && b.data.id === blockId) as any)?.data?.collapsed, }); },

  addRichTextBlock: (nodeId, title) => { const block: RichTextBlock = { id: `rt-${uid()}`, markdown: "", title }; set(s => { const node = s.nodes[nodeId]; if (!node) return {}; return { nodes: { ...s.nodes, [nodeId]: { ...node, content: { blocks: [...node.content.blocks, { kind: "richtext" as const, data: block }] } } } }; }); },

  updateRichTextBlock: (nodeId, blockId, patch) => { set(s => { const node = s.nodes[nodeId]; if (!node) return {}; return { nodes: { ...s.nodes, [nodeId]: { ...node, content: { blocks: node.content.blocks.map(b => b.kind === "richtext" && b.data.id === blockId ? { ...b, data: { ...b.data, ...patch } } : b) } } } }; }); },

  deleteRichTextBlock: (nodeId, blockId) => { set(s => { const node = s.nodes[nodeId]; if (!node) return {}; return { nodes: { ...s.nodes, [nodeId]: { ...node, content: { blocks: node.content.blocks.filter(b => !(b.kind === "richtext" && b.data.id === blockId)) } } } }; }); },

  addAnnotation: (nodeId) => { const ann: AnnotationThread = { id: `ann-${uid()}`, markdown: "", createdAt: Date.now(), updatedAt: Date.now(), resolved: false }; set(s => { const node = s.nodes[nodeId]; if (!node) return {}; return { nodes: { ...s.nodes, [nodeId]: { ...node, content: { blocks: [...node.content.blocks, { kind: "annotation" as const, data: ann }] } } } }; }); },

  updateAnnotation: (nodeId, annId, patch) => { set(s => { const node = s.nodes[nodeId]; if (!node) return {}; return { nodes: { ...s.nodes, [nodeId]: { ...node, content: { blocks: node.content.blocks.map(b => b.kind === "annotation" && b.data.id === annId ? { ...b, data: { ...b.data, ...patch, updatedAt: Date.now() } } : b) } } } }; }); },

  deleteAnnotation: (nodeId, annId) => { set(s => { const node = s.nodes[nodeId]; if (!node) return {}; return { nodes: { ...s.nodes, [nodeId]: { ...node, content: { blocks: node.content.blocks.filter(b => !(b.kind === "annotation" && b.data.id === annId)) } } } }; }); },

  select: (nodeIds, edgeIds = []) => set(s => ({ ui: { ...s.ui, selectedNodeIds: new Set(nodeIds), selectedEdgeIds: new Set(edgeIds) } })),

  addToSelection: (nodeId) => set(s => { const selectedNodeIds = new Set(s.ui.selectedNodeIds); selectedNodeIds.add(nodeId); return { ui: { ...s.ui, selectedNodeIds } }; }),

  clearSelection: () => set(s => ({ ui: { ...s.ui, selectedNodeIds: new Set(), selectedEdgeIds: new Set() } })),

  isSelected: (id) => get().ui.selectedNodeIds.has(id),

  openNodePanel: (nodeId) => set(s => ({ ui: { ...s.ui, openNodeId: nodeId } })),
  closeNodePanel: () => set(s => ({ ui: { ...s.ui, openNodeId: null } })),
  startTitleEdit: (nodeId) => set(s => ({ ui: { ...s.ui, editingNodeId: nodeId } })),
  stopTitleEdit: () => set(s => ({ ui: { ...s.ui, editingNodeId: null } })),

  setTool: (tool) => set(s => ({ ui: { ...s.ui, currentTool: tool } })),
  setArrowFrom: (nodeId) => set(s => ({ ui: { ...s.ui, arrowFromNodeId: nodeId } })),
  setViewState: (vs) => set(s => ({ viewState: { ...s.viewState, ...vs } })),

  pushHistory: () => { set(s => { const snap = cloneDocState(s.nodes, s.edges); const history = [...s.ui.history.slice(0, s.ui.historyIndex + 1), snap]; return { ui: { ...s.ui, history, historyIndex: history.length - 1 } }; }); },

  undo: () => { set(s => { if (s.ui.historyIndex <= 0) return s; const idx = s.ui.historyIndex - 1; const snap = s.ui.history[idx]; return { nodes: snap.nodes, edges: snap.edges, ui: { ...s.ui, historyIndex: idx } }; }); },

  redo: () => { set(s => { if (s.ui.historyIndex >= s.ui.history.length - 1) return s; const idx = s.ui.historyIndex + 1; const snap = s.ui.history[idx]; return { nodes: snap.nodes, edges: snap.edges, ui: { ...s.ui, historyIndex: idx } }; }); },

  canUndo: () => get().ui.historyIndex > 0,
  canRedo: () => get().ui.historyIndex < get().ui.history.length - 1,

  copy: () => { const { nodes, ui } = get(); const copied = Array.from(ui.selectedNodeIds).map(id => nodes[id]).filter(Boolean); set(s => ({ ui: { ...s.ui, clipboard: copied } })); },

  paste: () => { const { ui } = get(); ui.clipboard.forEach((node: ArchitectureNode) => { const newId = `node-${uid()}`; set(s => ({ nodes: { ...s.nodes, [newId]: { ...JSON.parse(JSON.stringify(node)), id: newId, parentId: undefined, children: [], visual: { ...node.visual, x: node.visual.x + 30, y: node.visual.y + 30 }, }, }, })); }); },

  loadDocument: (doc) => { set({ nodes: doc.nodes, edges: doc.edges, ui: { ...initialUi, selectedNodeIds: new Set(), selectedEdgeIds: new Set(), clipboard: [], history: [], historyIndex: -1 }, }); },

  exportDocument: () => { const { nodes, edges } = get(); return cloneDocState(nodes, edges); },

  clear: () => { set({ nodes: {}, edges: {}, ui: { ...initialUi, selectedNodeIds: new Set(), selectedEdgeIds: new Set(), clipboard: [], history: [], historyIndex: -1 }, }); },
}));
