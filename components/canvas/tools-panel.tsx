// src/components/canvas/tools-panel.tsx

"use client";

import React from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useCanvasStore } from "@/store/canvasStore";
import {
  Square,
  Circle,
  Database,
  Cloud,
  Server,
  Router,
  Zap,
  Lock,
  GitBranch,
  MessageSquare,
  ArrowRight,
  Layers,
  Trash2,
  Copy,
  Settings,
  Group,
  Code2,
  StickyNote,
  MousePointer2,
  Hand,
} from "lucide-react";

const CANVAS_TOOLS = [
  { id: "select", name: "Select", icon: <MousePointer2 size={18} /> },
  { id: "pan", name: "Pan", icon: <Hand size={18} /> },
];

interface ToolsPanelProps {
  onAddShape?: (type: string) => void;
  onClear?: () => void;
  onDelete?: () => void;
  onDuplicate?: () => void;
  onGroup?: () => void;
  hasSelection?: boolean;
}

const SHAPE_TOOLS = [
  { id: "rectangle", name: "Rectangle", icon: <Square size={18} /> },
  { id: "circle", name: "Circle", icon: <Circle size={18} /> },
  { id: "database", name: "Database", icon: <Database size={18} /> },
  { id: "cache", name: "Cache", icon: <Zap size={18} /> },
  { id: "service", name: "Service", icon: <Server size={18} /> },
  { id: "loadbalancer", name: "Load Balancer", icon: <Router size={18} /> },
  { id: "queue", name: "Queue", icon: <Layers size={18} /> },
  { id: "cloud", name: "Cloud", icon: <Cloud size={18} /> },
  { id: "apigateway", name: "API Gateway", icon: <Router size={18} /> },
  { id: "auth", name: "Auth", icon: <Lock size={18} /> },
  { id: "cdn", name: "CDN", icon: <GitBranch size={18} /> },
  { id: "message", name: "Message Bus", icon: <MessageSquare size={18} /> },
  { id: "code-block", name: "Code Block", icon: <Code2 size={18} /> },
  { id: "annotation", name: "Annotation", icon: <StickyNote size={18} /> },
  { id: "comment-bubble", name: "Comment Bubble", icon: <MessageSquare size={18} /> },
  { id: "arrow", name: "Arrow", icon: <ArrowRight size={18} /> },
];

export const ToolsPanel: React.FC<ToolsPanelProps> = ({
  onAddShape,
  onClear,
  onDelete,
  onDuplicate,
  onGroup,
  hasSelection = false,
}) => {
  // Read current tool directly from store — stays in sync even when engine resets it
  const currentTool = useCanvasStore((state) => state.editorState.currentTool);

  const selectTool = (toolId: string) => {
    onAddShape?.(toolId);
  };

  const isActive = (toolId: string) => currentTool === toolId;

  const activeClasses = "!bg-blue-600 !text-white !border-blue-500";

  return (
    <div className="bg-gray-900 border-r border-gray-800 w-80 overflow-y-auto flex flex-col">
      <div className="p-4 border-b border-gray-800">
        <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wide">Tools & Shapes</h3>
        {currentTool !== "select" && <p className="text-xs text-blue-400 mt-1">Active: {currentTool}</p>}
      </div>

      <div className="px-4 pt-4">
        <p className="text-xs text-gray-500 uppercase tracking-wide mb-2">Canvas</p>
        <div className="grid grid-cols-2 gap-2">
          {CANVAS_TOOLS.map((tool) => (
            <button
              key={tool.id}
              type="button"
              onClick={() => selectTool(tool.id)}
              className={`flex flex-col items-center justify-center py-2 px-2 gap-1 text-xs rounded border border-gray-700 ${
                isActive(tool.id) ? activeClasses : "bg-gray-800 hover:bg-gray-700"
              }`}
            >
              {tool.icon}
              <span>{tool.name}</span>
            </button>
          ))}
        </div>
        <p className="text-xs text-gray-500 mt-2">
          {currentTool === "pan"
            ? "Drag the canvas to pan. Use two-finger swipe on touch."
            : currentTool === "select"
              ? "Drag shapes to move. Empty drag box-selects. Shift adds to selection."
              : null}
        </p>
      </div>

      <Tabs defaultValue="shapes" className="flex-1 flex flex-col">
        <TabsList className="mx-4 mt-4 bg-gray-800">
          <TabsTrigger value="shapes" className="flex-1">Shapes</TabsTrigger>
          <TabsTrigger value="tools" className="flex-1">Tools</TabsTrigger>
        </TabsList>

        <TabsContent value="shapes" className="flex-1 p-3">
          <div className="grid grid-cols-2 gap-2">
            {SHAPE_TOOLS.map((tool) => (
              <button
                key={tool.id}
                type="button"
                onClick={() => selectTool(tool.id)}
                className={`flex flex-col items-center justify-center h-auto py-2 px-2 gap-1 text-xs rounded border border-gray-700 ${
                  isActive(tool.id) ? activeClasses : "bg-gray-800 hover:bg-gray-700"
                }`}
              >
                {tool.icon}
                <span className="text-center leading-tight">{tool.name}</span>
              </button>
            ))}
          </div>
          <p className="text-xs text-gray-500 mt-3">
            {currentTool === "arrow"
              ? "Click a source shape, then click a target shape to connect them."
              : "Select a shape, then click the canvas to place it."}
          </p>
        </TabsContent>

        <TabsContent value="tools" className="flex-1 p-3 space-y-2">
          <button
            type="button"
            onClick={() => selectTool("text")}
            className={`w-full text-left flex items-center py-2 px-3 rounded border border-gray-700 ${
              isActive("text") ? activeClasses : "bg-gray-800 hover:bg-gray-700"
            }`}
          >
            <MessageSquare size={16} className="mr-2" />
            Comment
          </button>

          <button
            type="button"
            onClick={() => onGroup?.()}
            disabled={!hasSelection}
            className={`w-full text-left flex items-center py-2 px-3 rounded border border-gray-700 ${
              hasSelection ? "bg-gray-800 hover:bg-gray-700" : "opacity-50 cursor-not-allowed"
            }`}
          >
            <Group size={16} className="mr-2" />
            Group Selected
          </button>

          <div className="border-t border-gray-700 pt-2 space-y-2">
            <button
              type="button"
              onClick={() => onDuplicate?.()}
              disabled={!hasSelection}
              className={`w-full text-left flex items-center py-2 px-3 rounded border border-gray-700 ${
                hasSelection ? "bg-gray-800 hover:bg-gray-700" : "opacity-50 cursor-not-allowed"
              }`}
            >
              <Copy size={16} className="mr-2" />
              Duplicate
            </button>

            <button
              type="button"
              onClick={() => onDelete?.()}
              disabled={!hasSelection}
              className={`w-full text-left flex items-center py-2 px-3 rounded border border-gray-700 text-red-400 ${
                hasSelection ? "hover:text-red-300 bg-gray-800" : "opacity-50 cursor-not-allowed"
              }`}
            >
              <Trash2 size={16} className="mr-2" />
              Delete Selected
            </button>

            <button
              type="button"
              onClick={onClear}
              className="w-full text-left flex items-center py-2 px-3 rounded border border-gray-700 text-red-400 hover:text-red-300 bg-gray-800"
            >
              <Trash2 size={16} className="mr-2" />
              Clear All
            </button>
          </div>
        </TabsContent>
      </Tabs>

      <div className="p-4 border-t border-gray-800">
        <button type="button" className="w-full justify-center flex items-center py-2 px-3 rounded border border-gray-700 bg-gray-800 hover:bg-gray-700">
          <Settings size={16} className="mr-2" />
          Advanced Options
        </button>
      </div>
    </div>
  );
};
