// src/store/canvasStore.ts

import { create } from "zustand";
import type {
  Shape,
  Arrow,
  EditorState,
  EditorTool,
  CanvasSnapshot,
  SemanticGraph,
  SemanticEdge,
  Annotation,
  CodeBlock,
  ContentStore,
  CodeArtifact,
  DocumentEntity,
  SchemaArtifact,
  RichTextDocument,
  CommentThread,
  CommentMessage,
  SemanticData,
  ArchitectureNode,
} from "@/types/canvas";
import {
  inferArrowDefaults,
} from "@/canvas/semantic";

interface CanvasStore {
  shapes: Map<string, Shape>;
  arrows: Map<string, Arrow>;
  selection: string[];
  editorState: EditorState;
  history: CanvasSnapshot[];
  historyIndex: number;

  addShape: (shape: Shape) => void;
  updateShape: (id: string, updates: Partial<Shape>) => void;
  deleteShape: (id: string) => void;
  getShape: (id: string) => Shape | undefined;
  getAllShapes: () => Shape[];

  addChildShape: (parentId: string, child: Shape) => void;
  removeChildFromParent: (childId: string) => void;
  getChildren: (parentId: string) => Shape[];
  getRootShapes: () => Shape[];

  addArrow: (arrow: Arrow) => void;
  updateArrow: (id: string, updates: Partial<Arrow>) => void;
  deleteArrow: (id: string) => void;
  getArrow: (id: string) => Arrow | undefined;
  getAllArrows: () => Arrow[];
  getArrowsForShape: (shapeId: string) => Arrow[];

  getSemanticGraph: () => SemanticGraph;
  getSemanticEdges: () => SemanticEdge[];
  getArchitectureNode: (shapeId: string) => ArchitectureNode | undefined;
  getNodeContent: (shapeId: string) => ContentStore;
  updateNodeSemantic: (shapeId: string, updates: Partial<SemanticData>) => void;

  addDocument: (shapeId: string, doc: DocumentEntity) => void;
  updateDocument: (shapeId: string, docId: string, updates: Partial<DocumentEntity>) => void;
  deleteDocument: (shapeId: string, docId: string) => void;

  addCodeArtifact: (shapeId: string, artifact: CodeArtifact) => void;
  updateCodeArtifact: (shapeId: string, artifactId: string, updates: Partial<CodeArtifact>) => void;
  deleteCodeArtifact: (shapeId: string, artifactId: string) => void;

  addSchemaArtifact: (shapeId: string, schema: SchemaArtifact) => void;
  updateSchemaArtifact: (shapeId: string, schemaId: string, updates: Partial<SchemaArtifact>) => void;
  deleteSchemaArtifact: (shapeId: string, schemaId: string) => void;

  addNote: (shapeId: string, note: RichTextDocument) => void;
  updateNote: (shapeId: string, noteId: string, updates: Partial<RichTextDocument>) => void;
  deleteNote: (shapeId: string, noteId: string) => void;

  addCommentThread: (shapeId: string, thread: CommentThread) => void;
  addCommentMessage: (shapeId: string, threadId: string, message: CommentMessage) => void;
  updateCommentThread: (shapeId: string, threadId: string, updates: Partial<CommentThread>) => void;
  deleteCommentThread: (shapeId: string, threadId: string) => void;

  addAnnotation: (shapeId: string, annotation: Annotation) => void;
  updateAnnotation: (shapeId: string, annotationId: string, updates: Partial<Annotation>) => void;
  deleteAnnotation: (shapeId: string, annotationId: string) => void;

  addCodeBlock: (shapeId: string, block: CodeBlock) => void;
  updateCodeBlock: (shapeId: string, blockId: string, updates: Partial<CodeBlock>) => void;
  deleteCodeBlock: (shapeId: string, blockId: string) => void;
  toggleCodeBlockCollapsed: (shapeId: string, blockId: string) => void;

  setSelection: (shapeIds: Set<string>, arrowIds?: Set<string>) => void;
  addToSelection: (shapeId: string) => void;
  removeFromSelection: (shapeId: string) => void;
  clearSelection: () => void;
  getSelectedShapes: () => Shape[];
  isShapeSelected: (id: string) => boolean;

  startEditing: (shapeId: string) => void;
  stopEditing: () => void;
  openDetailPanel: (shapeId: string) => void;
  closeDetailPanel: () => void;

  setTool: (tool: EditorTool) => void;
  getCurrentTool: () => EditorTool;

  pushSnapshot: (snapshot: CanvasSnapshot) => void;
  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;

  copyToClipboard: () => void;
  pasteFromClipboard: () => void;
  clearClipboard: () => void;

  clear: () => void;
  reset: () => void;
  loadSnapshot: (snapshot: CanvasSnapshot) => void;
}

const initialEditorState: EditorState = {
  currentTool: "select",
  selection: { shapeIds: new Set(), arrowIds: new Set() },
  clipboard: [],
  history: [],
  historyIndex: -1,
  isDragging: false,
  isDrawing: false,
  editingShapeId: null,
  detailShapeId: null,
};

function cloneMetadata(metadata: Shape["metadata"]): NonNullable<Shape["metadata"]> {
  return JSON.parse(JSON.stringify(metadata ?? {}));
}

function createEmptyContentStore(): ContentStore {
  return {
    documents: [],
    codeArtifacts: [],
    schemas: [],
    notes: [],
    comments: [],
  };
}

function codeBlockToArtifact(block: CodeBlock): CodeArtifact {
  return {
    id: block.id,
    language: block.language,
    type: block.isSchema ? "database-schema" : "source-code",
    title: block.title ?? `${block.language} artifact`,
    content: block.code,
    collapsed: block.collapsed,
  };
}

function artifactToCodeBlock(artifact: CodeArtifact): CodeBlock {
  return {
    id: artifact.id,
    language: artifact.language,
    code: artifact.content,
    title: artifact.title,
    collapsed: artifact.collapsed,
    isSchema: artifact.type === "database-schema" || artifact.type === "api-spec",
  };
}

function annotationToNote(annotation: Annotation): RichTextDocument {
  return {
    id: annotation.id,
    title: "Note",
    markdown: annotation.markdown,
    updatedAt: annotation.updatedAt,
  };
}

function noteToAnnotation(note: RichTextDocument): Annotation {
  return {
    id: note.id,
    markdown: note.markdown,
    createdAt: note.updatedAt,
    updatedAt: note.updatedAt,
    resolved: false,
  };
}

function inferNodeType(shape: Shape): SemanticData["nodeType"] {
  switch (shape.type) {
    case "database":
    case "cylinder":
      return "database";
    case "queue":
    case "kafka":
    case "message":
      return "queue";
    case "redis-cache":
      return "cache";
    case "api-gateway":
      return "gateway";
    case "auth":
      return "auth";
    case "load-balancer":
      return "load-balancer";
    case "cdn":
      return "external";
    case "service":
      return "service";
    default:
      return "custom";
  }
}

function getContentStore(shape: Shape): ContentStore {
  const metadata = shape.metadata ?? {};
  if (metadata.contentStore) {
    return JSON.parse(JSON.stringify(metadata.contentStore)) as ContentStore;
  }

  const fromLegacy: ContentStore = createEmptyContentStore();
  fromLegacy.codeArtifacts = (metadata.codeBlocks ?? []).map(codeBlockToArtifact);
  fromLegacy.notes = (metadata.annotations ?? []).map(annotationToNote);
  fromLegacy.comments = (metadata.annotations ?? []).map((annotation) => ({
    id: `thread-${annotation.id}`,
    targetType: "node",
    targetId: shape.id,
    resolved: annotation.resolved,
    messages: [
      {
        id: `msg-${annotation.id}`,
        author: annotation.author,
        body: annotation.markdown,
        createdAt: annotation.createdAt,
      },
    ],
  }));
  return fromLegacy;
}

function syncLegacyMetadataFromContent(metadata: NonNullable<Shape["metadata"]>, content: ContentStore): void {
  metadata.codeBlocks = content.codeArtifacts.map(artifactToCodeBlock);
  metadata.annotations = content.notes.map(noteToAnnotation);
}

function getSemanticData(shape: Shape): SemanticData {
  const metadata = shape.metadata ?? {};
  if (metadata.semanticData) {
    return JSON.parse(JSON.stringify(metadata.semanticData)) as SemanticData;
  }

  return {
    nodeType: metadata.nodeType ?? inferNodeType(shape),
    role: metadata.semanticRole,
    technologies: metadata.techStack ?? [],
    protocols: (metadata.ports ?? []).map((port) => port.protocol),
    scaling: metadata.scalingPolicy ? { mode: metadata.scalingPolicy as "horizontal" | "vertical" | "auto" | "none" } : undefined,
    ownership: metadata.teamOwner ? { owner: metadata.teamOwner } : undefined,
  };
}

function normalizeShapeMetadata(shape: Shape): Shape["metadata"] {
  const metadata = cloneMetadata(shape.metadata);
  const contentStore = getContentStore({ ...shape, metadata });
  metadata.contentStore = contentStore;
  metadata.semanticData = getSemanticData({ ...shape, metadata });
  syncLegacyMetadataFromContent(metadata, contentStore);
  return metadata;
}

function normalizeShape(shape: Shape): Shape {
  return {
    ...shape,
    metadata: normalizeShapeMetadata(shape),
  };
}

function buildArchitectureNode(shape: Shape): ArchitectureNode {
  const metadata = shape.metadata ?? {};
  const semantic = metadata.semanticData ?? getSemanticData(shape);
  const content = metadata.contentStore ?? getContentStore(shape);
  return {
    id: shape.id,
    visual: {
      x: shape.x,
      y: shape.y,
      width: shape.w,
      height: shape.h,
      collapsed: false,
      selected: false,
      zIndex: shape.zIndex ?? 0,
      style: {
        fill: shape.fillColor,
        stroke: shape.strokeColor,
        opacity: shape.opacity,
      },
    },
    semantic,
    content,
    runtime: metadata.runtime,
    ai: metadata.aiContext,
  };
}

function updateShapeContent(
  shapes: Map<string, Shape>,
  shapeId: string,
  updater: (content: ContentStore) => ContentStore
): Map<string, Shape> {
  const shape = shapes.get(shapeId);
  if (!shape) return shapes;

  const metadata = cloneMetadata(shape.metadata);
  const current = getContentStore({ ...shape, metadata });
  const updated = updater(current);
  metadata.contentStore = updated;
  syncLegacyMetadataFromContent(metadata, updated);
  shapes.set(shapeId, { ...shape, metadata });
  return shapes;
}

function normalizeArrow(arrow: Arrow, fromShape?: Shape, toShape?: Shape): Arrow {
  const defaults = inferArrowDefaults(fromShape, toShape, arrow);
  return {
    ...arrow,
    semanticType: arrow.semanticType ?? defaults.semanticType,
    label: arrow.label ?? defaults.label,
    labelPosition: arrow.labelPosition ?? defaults.labelPosition,
    strokeColor: arrow.strokeColor ?? defaults.strokeColor,
    strokeStyle: arrow.strokeStyle ?? defaults.strokeStyle,
    metadata: arrow.metadata ?? {},
  };
}

function setParentChildLinks(shapes: Map<string, Shape>, childId: string, parentId?: string) {
  const child = shapes.get(childId);
  if (!child) return;

  const previousParentId = child.parentId;
  if (previousParentId && previousParentId !== parentId) {
    const previousParent = shapes.get(previousParentId);
    if (previousParent) {
      shapes.set(previousParent.id, {
        ...previousParent,
        children: (previousParent.children ?? []).filter((id) => id !== childId),
      });
    }
  }

  if (!parentId) {
    shapes.set(childId, { ...child, parentId: undefined });
    return;
  }

  const parent = shapes.get(parentId);
  if (!parent) return;

  shapes.set(parentId, {
    ...parent,
    children: Array.from(new Set([...(parent.children ?? []), childId])),
  });
  shapes.set(childId, { ...child, parentId });
}

function snapshotToMaps(snapshot: CanvasSnapshot) {
  const shapes = new Map<string, Shape>();
  snapshot.shapes.forEach((shape) => shapes.set(shape.id, normalizeShape(shape)));

  const arrows = new Map<string, Arrow>();
  snapshot.arrows.forEach((arrow) => {
    const fromShape = shapes.get(arrow.fromShapeId);
    const toShape = shapes.get(arrow.toShapeId);
    arrows.set(arrow.id, normalizeArrow(arrow, fromShape, toShape));
  });

  return { shapes, arrows };
}

export const useCanvasStore = create<CanvasStore>((set, get) => ({
  shapes: new Map(),
  arrows: new Map(),
  get selection() {
    return Array.from(get().editorState.selection.shapeIds);
  },
  editorState: { ...initialEditorState },
  history: [],
  historyIndex: -1,

  addShape: (shape) => {
    set((state) => {
      const shapes = new Map(state.shapes);
      shapes.set(shape.id, normalizeShape(shape));

      if (shape.parentId) {
        setParentChildLinks(shapes, shape.id, shape.parentId);
      }

      return { shapes };
    });
  },

  updateShape: (id, updates) => {
    set((state) => {
      const shapes = new Map(state.shapes);
      const existing = shapes.get(id);
      if (!existing) return {};

      shapes.set(id, normalizeShape({ ...existing, ...updates }));

      if (updates.parentId !== undefined && updates.parentId !== existing.parentId) {
        setParentChildLinks(shapes, id, updates.parentId);
      }

      return { shapes };
    });
  },

  deleteShape: (id) => {
    set((state) => {
      const shapes = new Map(state.shapes);
      const arrows = new Map(state.arrows);
      const shape = shapes.get(id);

      if (shape?.children?.length) {
        shape.children.forEach((childId) => {
          const child = shapes.get(childId);
          if (child) {
            shapes.set(childId, { ...child, parentId: undefined });
          }
        });
      }

      if (shape?.parentId) {
        const parent = shapes.get(shape.parentId);
        if (parent) {
          shapes.set(parent.id, {
            ...parent,
            children: (parent.children ?? []).filter((childId) => childId !== id),
          });
        }
      }

      Array.from(arrows.values()).forEach((arrow) => {
        if (arrow.fromShapeId === id || arrow.toShapeId === id) {
          arrows.delete(arrow.id);
        }
      });

      shapes.delete(id);
      return { shapes, arrows };
    });
  },

  getShape: (id) => get().shapes.get(id),
  getAllShapes: () => Array.from(get().shapes.values()),

  addChildShape: (parentId, child) => {
    set((state) => {
      const shapes = new Map(state.shapes);
      const parent = shapes.get(parentId);
      if (!parent) return {};

      shapes.set(child.id, normalizeShape({ ...child, parentId }));
      shapes.set(parentId, {
        ...parent,
        children: Array.from(new Set([...(parent.children ?? []), child.id])),
      });
      return { shapes };
    });
  },

  removeChildFromParent: (childId) => {
    set((state) => {
      const shapes = new Map(state.shapes);
      const child = shapes.get(childId);
      if (!child?.parentId) return {};

      const parent = shapes.get(child.parentId);
      if (parent) {
        shapes.set(parent.id, {
          ...parent,
          children: (parent.children ?? []).filter((id) => id !== childId),
        });
      }

      shapes.set(childId, { ...child, parentId: undefined });
      return { shapes };
    });
  },

  getChildren: (parentId) => {
    const parent = get().shapes.get(parentId);
    return (parent?.children ?? [])
      .map((childId) => get().shapes.get(childId))
      .filter((shape): shape is Shape => Boolean(shape));
  },

  getRootShapes: () => {
    return Array.from(get().shapes.values()).filter((shape) => !shape.parentId);
  },

  addArrow: (arrow) => {
    set((state) => {
      const arrows = new Map(state.arrows);
      const fromShape = state.shapes.get(arrow.fromShapeId);
      const toShape = state.shapes.get(arrow.toShapeId);
      arrows.set(arrow.id, normalizeArrow(arrow, fromShape, toShape));
      return { arrows };
    });
  },

  updateArrow: (id, updates) => {
    set((state) => {
      const arrows = new Map(state.arrows);
      const existing = arrows.get(id);
      if (existing) {
        arrows.set(id, normalizeArrow({ ...existing, ...updates }));
      }
      return { arrows };
    });
  },

  deleteArrow: (id) => {
    set((state) => {
      const arrows = new Map(state.arrows);
      arrows.delete(id);
      return { arrows };
    });
  },

  getArrow: (id) => get().arrows.get(id),
  getAllArrows: () => Array.from(get().arrows.values()),

  getArrowsForShape: (shapeId) => {
    return Array.from(get().arrows.values()).filter(
      (arrow) => arrow.fromShapeId === shapeId || arrow.toShapeId === shapeId
    );
  },

  getSemanticGraph: () => {
    const { shapes, arrows } = get();
    const roots = Array.from(shapes.values())
      .filter((shape) => !shape.parentId)
      .map((shape) => shape.id);

    const groups = new Map<string, string[]>();
    shapes.forEach((shape) => {
      if (!shape.groupId) return;
      const members = groups.get(shape.groupId) ?? [];
      members.push(shape.id);
      groups.set(shape.groupId, members);
    });

    return {
      nodes: new Map(shapes),
      edges: new Map(arrows),
      roots,
      groups,
    };
  },

  getSemanticEdges: () => {
    return Array.from(get().arrows.values()).map((arrow) => ({
      id: arrow.id,
      fromId: arrow.fromShapeId,
      toId: arrow.toShapeId,
      type: arrow.semanticType ?? "depends-on",
      label: arrow.label,
      metadata: arrow.metadata,
    }));
  },

  getArchitectureNode: (shapeId) => {
    const shape = get().shapes.get(shapeId);
    if (!shape) return undefined;
    return buildArchitectureNode(shape);
  },

  getNodeContent: (shapeId) => {
    const shape = get().shapes.get(shapeId);
    if (!shape) return createEmptyContentStore();
    return getContentStore(shape);
  },

  updateNodeSemantic: (shapeId, updates) => {
    set((state) => {
      const shapes = new Map(state.shapes);
      const shape = shapes.get(shapeId);
      if (!shape) return {};

      const metadata = cloneMetadata(shape.metadata);
      const semantic = {
        ...getSemanticData({ ...shape, metadata }),
        ...updates,
      };

      metadata.semanticData = semantic;
      metadata.nodeType = semantic.nodeType;
      metadata.semanticRole = semantic.role;
      metadata.techStack = semantic.technologies;
      metadata.scalingPolicy = semantic.scaling?.mode;
      metadata.teamOwner = semantic.ownership?.owner;
      shapes.set(shapeId, { ...shape, metadata });
      return { shapes };
    });
  },

  addDocument: (shapeId, doc) => {
    set((state) => {
      const shapes = updateShapeContent(new Map(state.shapes), shapeId, (content) => ({
        ...content,
        documents: [...content.documents, doc],
      }));
      return { shapes };
    });
  },

  updateDocument: (shapeId, docId, updates) => {
    set((state) => {
      const shapes = updateShapeContent(new Map(state.shapes), shapeId, (content) => ({
        ...content,
        documents: content.documents.map((doc) =>
          doc.id === docId ? { ...doc, ...updates, updatedAt: Date.now() } : doc
        ),
      }));
      return { shapes };
    });
  },

  deleteDocument: (shapeId, docId) => {
    set((state) => {
      const shapes = updateShapeContent(new Map(state.shapes), shapeId, (content) => ({
        ...content,
        documents: content.documents.filter((doc) => doc.id !== docId),
      }));
      return { shapes };
    });
  },

  addCodeArtifact: (shapeId, artifact) => {
    set((state) => {
      const shapes = updateShapeContent(new Map(state.shapes), shapeId, (content) => ({
        ...content,
        codeArtifacts: [...content.codeArtifacts, artifact],
      }));
      return { shapes };
    });
  },

  updateCodeArtifact: (shapeId, artifactId, updates) => {
    set((state) => {
      const shapes = updateShapeContent(new Map(state.shapes), shapeId, (content) => ({
        ...content,
        codeArtifacts: content.codeArtifacts.map((artifact) =>
          artifact.id === artifactId ? { ...artifact, ...updates } : artifact
        ),
      }));
      return { shapes };
    });
  },

  deleteCodeArtifact: (shapeId, artifactId) => {
    set((state) => {
      const shapes = updateShapeContent(new Map(state.shapes), shapeId, (content) => ({
        ...content,
        codeArtifacts: content.codeArtifacts.filter((artifact) => artifact.id !== artifactId),
      }));
      return { shapes };
    });
  },

  addSchemaArtifact: (shapeId, schema) => {
    set((state) => {
      const shapes = updateShapeContent(new Map(state.shapes), shapeId, (content) => ({
        ...content,
        schemas: [...content.schemas, schema],
      }));
      return { shapes };
    });
  },

  updateSchemaArtifact: (shapeId, schemaId, updates) => {
    set((state) => {
      const shapes = updateShapeContent(new Map(state.shapes), shapeId, (content) => ({
        ...content,
        schemas: content.schemas.map((schema) =>
          schema.id === schemaId ? { ...schema, ...updates, updatedAt: Date.now() } : schema
        ),
      }));
      return { shapes };
    });
  },

  deleteSchemaArtifact: (shapeId, schemaId) => {
    set((state) => {
      const shapes = updateShapeContent(new Map(state.shapes), shapeId, (content) => ({
        ...content,
        schemas: content.schemas.filter((schema) => schema.id !== schemaId),
      }));
      return { shapes };
    });
  },

  addNote: (shapeId, note) => {
    set((state) => {
      const shapes = updateShapeContent(new Map(state.shapes), shapeId, (content) => ({
        ...content,
        notes: [...content.notes, note],
      }));
      return { shapes };
    });
  },

  updateNote: (shapeId, noteId, updates) => {
    set((state) => {
      const shapes = updateShapeContent(new Map(state.shapes), shapeId, (content) => ({
        ...content,
        notes: content.notes.map((note) =>
          note.id === noteId ? { ...note, ...updates, updatedAt: Date.now() } : note
        ),
      }));
      return { shapes };
    });
  },

  deleteNote: (shapeId, noteId) => {
    set((state) => {
      const shapes = updateShapeContent(new Map(state.shapes), shapeId, (content) => ({
        ...content,
        notes: content.notes.filter((note) => note.id !== noteId),
      }));
      return { shapes };
    });
  },

  addCommentThread: (shapeId, thread) => {
    set((state) => {
      const shapes = updateShapeContent(new Map(state.shapes), shapeId, (content) => ({
        ...content,
        comments: [...content.comments, thread],
      }));
      return { shapes };
    });
  },

  addCommentMessage: (shapeId, threadId, message) => {
    set((state) => {
      const shapes = updateShapeContent(new Map(state.shapes), shapeId, (content) => ({
        ...content,
        comments: content.comments.map((thread) =>
          thread.id === threadId ? { ...thread, messages: [...thread.messages, message] } : thread
        ),
      }));
      return { shapes };
    });
  },

  updateCommentThread: (shapeId, threadId, updates) => {
    set((state) => {
      const shapes = updateShapeContent(new Map(state.shapes), shapeId, (content) => ({
        ...content,
        comments: content.comments.map((thread) =>
          thread.id === threadId ? { ...thread, ...updates } : thread
        ),
      }));
      return { shapes };
    });
  },

  deleteCommentThread: (shapeId, threadId) => {
    set((state) => {
      const shapes = updateShapeContent(new Map(state.shapes), shapeId, (content) => ({
        ...content,
        comments: content.comments.filter((thread) => thread.id !== threadId),
      }));
      return { shapes };
    });
  },

  addAnnotation: (shapeId, annotation) => {
    const note: RichTextDocument = {
      id: annotation.id,
      title: "Note",
      markdown: annotation.markdown,
      updatedAt: annotation.updatedAt,
    };
    get().addNote(shapeId, note);
  },

  updateAnnotation: (shapeId, annotationId, updates) => {
    get().updateNote(shapeId, annotationId, {
      markdown: updates.markdown,
      updatedAt: Date.now(),
    });
  },

  deleteAnnotation: (shapeId, annotationId) => {
    get().deleteNote(shapeId, annotationId);
  },

  addCodeBlock: (shapeId, block) => {
    get().addCodeArtifact(shapeId, codeBlockToArtifact(block));
  },

  updateCodeBlock: (shapeId, blockId, updates) => {
    const patch: Partial<CodeArtifact> = {
      title: updates.title,
      content: updates.code,
      collapsed: updates.collapsed,
      language: updates.language,
    };
    if (updates.isSchema !== undefined) {
      patch.type = updates.isSchema ? "database-schema" : "source-code";
    }
    get().updateCodeArtifact(shapeId, blockId, patch);
  },

  deleteCodeBlock: (shapeId, blockId) => {
    get().deleteCodeArtifact(shapeId, blockId);
  },

  toggleCodeBlockCollapsed: (shapeId, blockId) => {
    const content = get().getNodeContent(shapeId);
    const artifact = content.codeArtifacts.find((item) => item.id === blockId);
    if (!artifact) return;
    get().updateCodeArtifact(shapeId, blockId, { collapsed: !artifact.collapsed });
  },

  setSelection: (shapeIds, arrowIds = new Set()) => {
    set((state) => ({
      editorState: {
        ...state.editorState,
        selection: { shapeIds, arrowIds },
      },
    }));
  },

  addToSelection: (shapeId) => {
    set((state) => {
      const shapeIds = new Set(state.editorState.selection.shapeIds);
      shapeIds.add(shapeId);
      return {
        editorState: {
          ...state.editorState,
          selection: { ...state.editorState.selection, shapeIds },
        },
      };
    });
  },

  removeFromSelection: (shapeId) => {
    set((state) => {
      const shapeIds = new Set(state.editorState.selection.shapeIds);
      shapeIds.delete(shapeId);
      return {
        editorState: {
          ...state.editorState,
          selection: { ...state.editorState.selection, shapeIds },
        },
      };
    });
  },

  clearSelection: () => {
    set((state) => ({
      editorState: {
        ...state.editorState,
        selection: { shapeIds: new Set(), arrowIds: new Set() },
      },
    }));
  },

  getSelectedShapes: () => {
    const { shapes, editorState } = get();
    return Array.from(editorState.selection.shapeIds)
      .map((id) => shapes.get(id))
      .filter((shape): shape is Shape => Boolean(shape));
  },

  isShapeSelected: (id) => get().editorState.selection.shapeIds.has(id),

  startEditing: (shapeId) => {
    set((state) => ({
      editorState: { ...state.editorState, editingShapeId: shapeId },
    }));
  },

  stopEditing: () => {
    set((state) => ({
      editorState: { ...state.editorState, editingShapeId: null },
    }));
  },

  openDetailPanel: (shapeId) => {
    set((state) => ({
      editorState: { ...state.editorState, detailShapeId: shapeId },
    }));
  },

  closeDetailPanel: () => {
    set((state) => ({
      editorState: { ...state.editorState, detailShapeId: null },
    }));
  },

  setTool: (tool) => {
    set((state) => ({
      editorState: { ...state.editorState, currentTool: tool },
    }));
  },

  getCurrentTool: () => get().editorState.currentTool,

  pushSnapshot: (snapshot) => {
    set((state) => {
      const history = state.history.slice(0, state.historyIndex + 1);
      history.push(snapshot);
      return { history, historyIndex: history.length - 1 };
    });
  },

  undo: () => {
    set((state) => {
      if (state.historyIndex <= 0) return state;
      const nextIndex = state.historyIndex - 1;
      const snapshot = state.history[nextIndex];
      const { shapes, arrows } = snapshotToMaps(snapshot);
      return {
        shapes,
        arrows,
        historyIndex: nextIndex,
      };
    });
  },

  redo: () => {
    set((state) => {
      if (state.historyIndex >= state.history.length - 1) return state;
      const nextIndex = state.historyIndex + 1;
      const snapshot = state.history[nextIndex];
      const { shapes, arrows } = snapshotToMaps(snapshot);
      return {
        shapes,
        arrows,
        historyIndex: nextIndex,
      };
    });
  },

  canUndo: () => get().historyIndex > 0,
  canRedo: () => {
    const { history, historyIndex } = get();
    return historyIndex < history.length - 1;
  },

  copyToClipboard: () => {
    set((state) => {
      const selectedShapes = Array.from(state.editorState.selection.shapeIds)
        .map((id) => state.shapes.get(id))
        .filter((shape): shape is Shape => Boolean(shape))
        .map((shape) => JSON.parse(JSON.stringify(shape)) as Shape);

      return {
        editorState: {
          ...state.editorState,
          clipboard: selectedShapes,
        },
      };
    });
  },

  pasteFromClipboard: () => {
    const { editorState } = get();
    const clipboard = editorState.clipboard as Shape[];

    if (clipboard.length > 0) {
      const offset = 20;
      const newShapes = clipboard.map((shape) => ({
        ...shape,
        id: `shape-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        x: shape.x + offset,
        y: shape.y + offset,
        parentId: undefined,
        children: [],
      }));

      newShapes.forEach((shape) => get().addShape(shape));
    }
  },

  clearClipboard: () => {
    set((state) => ({
      editorState: { ...state.editorState, clipboard: [] },
    }));
  },

  clear: () => {
    set({
      shapes: new Map(),
      arrows: new Map(),
      editorState: { ...initialEditorState },
      history: [],
      historyIndex: -1,
    });
  },

  reset: () => {
    set({
      shapes: new Map(),
      arrows: new Map(),
      editorState: { ...initialEditorState },
    });
  },

  loadSnapshot: (snapshot) => {
    const { shapes, arrows } = snapshotToMaps(snapshot);
    set({
      shapes,
      arrows,
      history: [snapshot],
      historyIndex: 0,
      editorState: {
        ...get().editorState,
        editingShapeId: null,
        detailShapeId: null,
      },
    });
  },
}));
