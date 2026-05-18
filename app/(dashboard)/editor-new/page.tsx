// src/app/(dashboard)/editor-new/page.tsx

"use client";

import React, { Suspense, useRef, useEffect, useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ProtectedRoute } from "@/components/protected-route";
import { useCanvasStore } from "@/store/canvasStore";
import { CanvasEngine } from "@/canvas/engine";
import { buildArchitectureGraphFromCanvas } from "@/canvas/architectureAdapter";
import { EditorTool, ViewState } from "@/types/canvas";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SiteHeader } from "@/components/site-header";
import { ToolsPanel } from "@/components/canvas/tools-panel";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { InlineTextEditor } from "@/components/canvas/InlineTextEditor";
import { ShapeDetailPanel } from "@/components/canvas/ShapeDetailPanel";
import { deleteDesign, getDesign, updateDesign } from "@/lib/actions/designs";
import { useCanvasAutosave } from "@/hooks/useCanvasAutosave";
import {
  clearLocalAutosave,
  readLocalAutosave,
  resolveCanvasFromAutosave,
} from "@/lib/canvas-autosave";
import {
  Download,
  Save,
  Trash2,
  Undo2,
  Redo2,
  Share2,
  Zap,
} from "lucide-react";

function parseDesignContent(content: unknown) {
  if (typeof content === "string") {
    try {
      return JSON.parse(content) as { shapes?: any[]; arrows?: any[]; groups?: any[] };
    } catch {
      return { shapes: [], arrows: [], groups: [] };
    }
  }

  if (content && typeof content === "object") {
    return content as { shapes?: any[]; arrows?: any[]; groups?: any[] };
  }

  return { shapes: [], arrows: [], groups: [] };
}

function EditorNewPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const designId = searchParams.get("designId");
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<CanvasEngine | null>(null);
  const unsubscribeRef = useRef<(() => void) | null>(null);
  const [title, setTitle] = useState("Untitled Design");
  const [isSaving, setIsSaving] = useState(false);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [evaluation, setEvaluation] = useState<any>(null);
  const [showEvaluation, setShowEvaluation] = useState(false);
  const [canvasReady, setCanvasReady] = useState(false);
  const [viewState, setViewState] = useState<ViewState>({
    offsetX: 0,
    offsetY: 0,
    zoom: 1,
    width: 0,
    height: 0,
  });

  const {
    shapes,
    arrows,
    canUndo,
    canRedo,
    undo,
    redo,
    clear,
    deleteShape,
    loadSnapshot,
    setTool,
  } = useCanvasStore();

  const hasSelection = useCanvasStore(
    (state) => state.editorState.selection.shapeIds.size > 0
  );

  const selectedShapeIds = useCanvasStore(
    (state) => state.editorState.selection.shapeIds
  );

  useCanvasAutosave({
    designId,
    title,
    enabled: canvasReady,
  });

  const containerRef = useCallback((container: HTMLDivElement | null) => {
    if (!container) {
      // Cleanup on unmount
      unsubscribeRef.current?.();
      unsubscribeRef.current = null;
      engineRef.current?.destroy();
      engineRef.current = null;
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;

    // Initialize engine once; it handles its own ResizeObserver internally
    if (!engineRef.current) {
      engineRef.current = new CanvasEngine(canvas, {
        onViewStateChange: setViewState,
      });
      console.log("✅ Engine created");

      // Subscribe to store updates and re-render
      unsubscribeRef.current = useCanvasStore.subscribe(() => {
        engineRef.current?.render();
      });
    }
  }, []); // no deps — stable callback

  useEffect(() => {
    setCanvasReady(false);
    useCanvasStore.getState().reset();

    const loadDesign = async () => {
      if (!designId) {
        const draft = readLocalAutosave("draft");
        if (draft?.shapes?.length || draft?.arrows?.length) {
          if (draft.title) setTitle(draft.title);
          loadSnapshot({
            id: "draft",
            version: 1,
            timestamp: draft.savedAt,
            shapes: draft.shapes,
            arrows: draft.arrows,
            viewState: {
              offsetX: 0,
              offsetY: 0,
              zoom: 1,
              width: canvasRef.current?.width ?? 0,
              height: canvasRef.current?.height ?? 0,
            },
            metadata: { title: draft.title ?? "Untitled Design" },
          });
          setTimeout(() => engineRef.current?.render(), 50);
        }
        setCanvasReady(true);
        return;
      }

      const token = localStorage.getItem("authToken");
      if (!token) {
        setCanvasReady(true);
        return;
      }

      try {
        const design = await getDesign(designId, token);
        const content = parseDesignContent(design.content);
        const serverUpdatedAt = new Date(design.updatedAt).getTime();

        const resolved = resolveCanvasFromAutosave(
          designId,
          content.shapes ?? [],
          content.arrows ?? [],
          serverUpdatedAt,
          design.title
        );

        if (resolved.title) setTitle(resolved.title);

        loadSnapshot({
          id: design.id,
          version: 1,
          timestamp: resolved.usedLocal ? Date.now() : serverUpdatedAt,
          shapes: resolved.shapes,
          arrows: resolved.arrows,
          viewState: {
            offsetX: 0,
            offsetY: 0,
            zoom: 1,
            width: canvasRef.current?.width ?? 0,
            height: canvasRef.current?.height ?? 0,
          },
          metadata: {
            title: resolved.title ?? design.title,
            description: design.description ?? undefined,
          },
        });

        setTimeout(() => engineRef.current?.render(), 50);
      } catch (err) {
        console.error("Failed to load design:", err);
      } finally {
        setCanvasReady(true);
      }
    };

    loadDesign();
  }, [designId, loadSnapshot]);

  const handleDeleteDesign = async () => {
    if (!designId) return;

    const confirmed = window.confirm(
      `Delete "${title}"? This cannot be undone.`
    );
    if (!confirmed) return;

    try {
      const token = localStorage.getItem("authToken");
      if (!token) throw new Error("Not authenticated");

      await deleteDesign(designId, token);
      clearLocalAutosave(designId);
      router.push("/designs");
    } catch {
      window.alert?.("Failed to delete design");
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const token = localStorage.getItem("authToken");
      if (!token || !designId) throw new Error("Missing design");

      const architectureGraph = buildArchitectureGraphFromCanvas(
        Array.from(shapes.values()),
        Array.from(arrows.values())
      );

      await updateDesign(designId, token, {
        title,
        content: {
          shapes: Array.from(shapes.values()),
          arrows: Array.from(arrows.values()),
          groups: [],
          architectureGraph,
        },
      });
      
      if (designId) clearLocalAutosave(designId);
      window.alert?.("Design saved successfully!");
    } catch {
      window.alert?.("Failed to save design");
    } finally {
      setIsSaving(false);
    }
  };

  const handleEvaluate = async () => {
    setIsEvaluating(true);
    try {
      const architectureGraph = buildArchitectureGraphFromCanvas(
        Array.from(shapes.values()),
        Array.from(arrows.values())
      );

      const response = await fetch("/api/evaluate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("authToken")}`,
        },
        body: JSON.stringify({
          designId,
          content: {
            shapes: Array.from(shapes.values()),
            arrows: Array.from(arrows.values()),
            groups: [],
            architectureGraph,
          },
        }),
      });

      if (!response.ok) throw new Error("Evaluation failed");
      const result = await response.json();
      setEvaluation(result);
      setShowEvaluation(true);
    } catch {
      window.alert?.("Failed to evaluate design");
    } finally {
      setIsEvaluating(false);
    }
  };

  const handleDownload = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const link = document.createElement("a");
    link.href = canvas.toDataURL("image/png");
    link.download = `${title}.png`;
    link.click();
  };

  const handleShare = async () => {
    try {
      const token = localStorage.getItem("authToken");
      if (!token) throw new Error("Not authenticated");

      // This will be handled by the updated server action imports
      // For now, we keep the fetch to /api/share since we still need the API endpoint
      const response = await fetch("/api/share", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          designId,
        }),
      });

      if (!response.ok) throw new Error("Failed to generate share link");
      const result = await response.json();
      
      const shareUrl = `${window.location.origin}${result.shareUrl}`;
      navigator.clipboard.writeText(shareUrl);
      window.alert?.("Share link copied to clipboard!");
    } catch {
      window.alert?.("Failed to create share link");
    }
  };

  return (
    <ProtectedRoute>
      <div className="flex h-screen bg-gray-950">
        {/* Tools Panel */}
        <ToolsPanel
          onClear={clear}
          onDelete={() => {
            selectedShapeIds.forEach(deleteShape);
          }}
          onDuplicate={() => {
            useCanvasStore.getState().copyToClipboard();
            useCanvasStore.getState().pasteFromClipboard();
          }}
          onGroup={() => {
            console.log("group:", Array.from(selectedShapeIds));
          }}
          hasSelection={hasSelection}
          onAddShape={(toolId) => {
            setTool(toolId as EditorTool);
            engineRef.current?.setActiveTool(toolId as EditorTool);
          }}
        />

        {/* Main Canvas Area */}
        <div className="flex-1 flex flex-col">
          {/* Toolbar */}
          <SiteHeader>
            <div className="flex-1 flex items-center gap-2">
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="max-w-xs bg-gray-800 border-gray-700"
                placeholder="Design title"
              />
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={undo}
                disabled={!canUndo()}
                title="Undo"
              >
                <Undo2 size={18} />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={redo}
                disabled={!canRedo()}
                title="Redo"
              >
                <Redo2 size={18} />
              </Button>

              <div className="w-px h-6 bg-gray-700" />

              <Button
                variant="secondary"
                size="sm"
                onClick={handleEvaluate}
                isLoading={isEvaluating}
              >
                <Zap size={18} className="mr-1" />
                Evaluate
              </Button>

              <Button
                variant="secondary"
                size="sm"
                onClick={handleShare}
              >
                <Share2 size={18} className="mr-1" />
                Share
              </Button>

              <Button
                variant="secondary"
                size="sm"
                onClick={handleDownload}
              >
                <Download size={18} className="mr-1" />
                Download
              </Button>

              <Button
                variant="primary"
                size="sm"
                onClick={handleSave}
                isLoading={isSaving}
              >
                <Save size={18} className="mr-1" />
                Save
              </Button>

              {designId && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleDeleteDesign}
                  title="Delete design"
                  className="text-red-400 hover:text-red-300 hover:bg-red-950/40"
                >
                  <Trash2 size={18} className="mr-1" />
                  Delete
                </Button>
              )}
            </div>
          </SiteHeader>

          {/* Canvas & Evaluation */}
          <div className="flex-1 flex gap-4 p-4" style={{ minHeight: 0 }}>
            {/* Canvas */}
            <div
              ref={containerRef}
              className="flex-1 min-w-0 relative overflow-hidden"
              style={{ minHeight: 0 }}
            >
              <canvas
                ref={canvasRef}
                style={{
                  position: "absolute",
                  inset: 0,
                  width: "100%",
                  height: "100%",
                  display: "block",
                  cursor: "crosshair",
                  borderRadius: "8px",
                  border: "1px solid #1f2937",
                  background: "linear-gradient(to bottom, #111827, #030712)",
                }}
              />

              <InlineTextEditor viewState={viewState} />

              <div className="absolute right-4 top-4 bottom-4 z-30 pointer-events-none">
                <div className="pointer-events-auto h-full">
                  <ShapeDetailPanel />
                </div>
              </div>
            </div>

            {/* Right Sidebar */}
            {showEvaluation && evaluation && (
              <div className="w-80 bg-gray-800 rounded-lg border border-gray-700 flex flex-col overflow-hidden">
                <Tabs defaultValue="findings" className="flex-1 flex flex-col">
                  <TabsList className="m-4 bg-gray-700 border-gray-600">
                    <TabsTrigger value="findings" className="flex-1">
                      Findings
                    </TabsTrigger>
                    <TabsTrigger value="recommendations" className="flex-1">
                      Tips
                    </TabsTrigger>
                  </TabsList>

                  {/* Findings Tab */}
                  <TabsContent value="findings" className="flex-1 p-4 overflow-y-auto space-y-3">
                    <div className="grid grid-cols-3 gap-2 mb-4">
                      <div className="bg-gray-700 rounded p-2 text-center">
                        <p className="text-2xl font-bold text-white">
                          {evaluation.score}
                        </p>
                        <p className="text-xs text-gray-400">Score</p>
                      </div>
                      <div className="bg-gray-700 rounded p-2 text-center">
                        <p className="text-2xl font-bold text-[#3ecf8e]">
                          {evaluation.scalabilityScore}
                        </p>
                        <p className="text-xs text-gray-400">Scalability</p>
                      </div>
                      <div className="bg-gray-700 rounded p-2 text-center">
                        <p className="text-2xl font-bold text-[#a78bfa]">
                          {evaluation.securityScore}
                        </p>
                        <p className="text-xs text-gray-400">Security</p>
                      </div>
                    </div>

                    {evaluation.findings?.length === 0 ? (
                      <p className="text-gray-400 text-sm text-center py-8">
                        No issues found!
                      </p>
                    ) : (
                      <div className="space-y-3">
                        {evaluation.findings?.map(
                          (finding: any, idx: number) => (
                            <div
                              key={idx}
                              className={`p-3 rounded border ${
                                finding.severity === "error"
                                  ? "bg-red-900 bg-opacity-20 border-red-700"
                                  : finding.severity === "warning"
                                  ? "bg-yellow-900 bg-opacity-20 border-yellow-700"
                                  : "bg-blue-900 bg-opacity-20 border-blue-700"
                              }`}
                            >
                              <p className="text-sm font-medium text-white mb-1">
                                {finding.type}
                              </p>
                              <p className="text-xs text-gray-300 mb-2">
                                {finding.message}
                              </p>
                              <p className="text-xs text-gray-400 italic">
                                💡 {finding.suggestion}
                              </p>
                            </div>
                          )
                        )}
                      </div>
                    )}
                  </TabsContent>

                  {/* Recommendations Tab */}
                  <TabsContent value="recommendations" className="flex-1 p-4 overflow-y-auto space-y-2">
                    {evaluation.recommendations?.map(
                      (rec: string, idx: number) => (
                        <div
                          key={idx}
                          className="text-sm text-gray-300 p-2 bg-gray-700 rounded flex gap-2"
                        >
                          <span className="text-[#3ecf8e] font-bold">➜</span>
                          <span>{rec}</span>
                        </div>
                      )
                    )}
                  </TabsContent>
                </Tabs>
              </div>
            )}
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}

export default function EditorNewPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-screen items-center justify-center bg-gray-950 text-gray-400">
          Loading editor…
        </div>
      }
    >
      <EditorNewPageContent />
    </Suspense>
  );
}
