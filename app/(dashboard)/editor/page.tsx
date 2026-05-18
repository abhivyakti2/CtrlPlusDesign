// src/app/(dashboard)/editor/page.tsx

"use client";

import React, { useRef, useEffect, useState } from "react";
import { ProtectedRoute } from "@/components/protected-route";
import { useCanvasStore } from "@/store/canvasStore";
import { CanvasEngine } from "@/canvas/engine";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SiteBrand, SiteHeader } from "@/components/site-header";
import { createDesign, updateDesign } from "@/lib/actions/designs";
import {
  Download,
  Save,
  Undo2,
  Redo2,
  Trash2,
} from "lucide-react";

export default function EditorPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [title, setTitle] = useState("Untitled Design");
  const [designId, setDesignId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const {
    shapes,
    arrows,
    selection,
    canUndo,
    canRedo,
    undo,
    redo,
    clear,
  } = useCanvasStore();

  useEffect(() => {
    // Mark that this is a fresh editor session (not a loaded design)
    // This prevents autosave from being restored for unsaved designs
    sessionStorage.setItem("design_loaded", "true");
    
    return () => {
      // Cleanup on unmount
      sessionStorage.removeItem("design_loaded");
    };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let engine: CanvasEngine | null = null;
    let raf = 0;

    const init = () => {
      // Ensure layout has occurred so we don't mount 0x0
      if (canvas.offsetWidth === 0 || canvas.offsetHeight === 0) {
        raf = window.requestAnimationFrame(init);
        return;
      }
      engine = new CanvasEngine(canvas);
      engine.render();
    };

    raf = window.requestAnimationFrame(init);

    return () => {
      if (raf) window.cancelAnimationFrame(raf);
      engine?.destroy();
      engine = null;
      clear();
    };
  }, [clear]);


  const handleSave = async () => {
    setIsSaving(true);
    try {
      const token = localStorage.getItem("authToken");
      if (!token) throw new Error("Not authenticated");

      const content = {
        shapes: Array.from(shapes.values()),
        arrows: Array.from(arrows.values()),
        groups: [],
      };

      if (designId) {
        await updateDesign(designId, token, { title, content });
      } else {
        const design = await createDesign(token, { title });
        await updateDesign(design.id, token, { title, content });
        setDesignId(design.id);
      }

      // Clear autosave after successful save
      localStorage.removeItem("ctrl_design_autosave");
      alert("Design saved successfully!");
    } catch {
      alert("Failed to save design");
    } finally {
      setIsSaving(false);
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

  return (
    <ProtectedRoute>
      <div className="flex h-screen bg-gray-950">
        {/* Left Sidebar - Tools */}
        <div className="w-20 bg-gray-900 border-r border-gray-800 flex flex-col items-center py-4 gap-4">
          <SiteBrand showName={false} />

          <div className="flex-1" />

          <div className="flex flex-col gap-2">
            <Button
              variant="ghost"
              size="sm"
              title="Undo"
              disabled={!canUndo}
              onClick={undo}
            >
              <Undo2 size={18} />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              title="Redo"
              disabled={!canRedo}
              onClick={redo}
            >
              <Redo2 size={18} />
            </Button>
          </div>
        </div>

        {/* Main Canvas Area */}
        <div className="flex-1 flex flex-col">
          {/* Top Toolbar */}
          <SiteHeader>
            <div className="flex-1">
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="max-w-xs"
                placeholder="Design title"
              />
            </div>

            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => clear()}
                title="Clear canvas"
              >
                <Trash2 size={18} />
                <span className="ml-1">Clear</span>
              </Button>

              <Button
                variant="secondary"
                size="sm"
                onClick={handleDownload}
                title="Download as PNG"
              >
                <Download size={18} />
                <span className="ml-1">Download</span>
              </Button>

              <Button
                variant="primary"
                size="sm"
                onClick={handleSave}
                isLoading={isSaving}
              >
                <Save size={18} />
                <span className="ml-1">Save</span>
              </Button>
            </div>
          </SiteHeader>

          {/* Canvas */}
          <div className="flex-1 overflow-hidden relative">
            <canvas
              ref={canvasRef}
              className="w-full h-full bg-gradient-to-b from-gray-900 to-gray-950 cursor-crosshair"
            />
          </div>
        </div>

        {/* Right Sidebar - Properties */}
        <div className="w-64 bg-gray-900 border-l border-gray-800 p-4 overflow-y-auto">
          <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-4">
            Properties
          </h3>

          {selection.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500 text-sm">Select an object to edit</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="block text-xs uppercase text-gray-500 mb-2">
                  ID
                </label>
                <p className="text-white text-sm font-mono">{selection[0]}</p>
              </div>

              <Button variant="secondary" size="sm" className="w-full">
                <Trash2 size={16} />
                <span className="ml-2">Delete</span>
              </Button>
            </div>
          )}
        </div>
      </div>
    </ProtectedRoute>
  );
}
