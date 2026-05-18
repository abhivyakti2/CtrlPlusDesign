// src/components/canvas/InlineTextEditor.tsx

"use client";

import React, { useEffect, useRef, useState } from "react";
import { useCanvasStore } from "@/store/canvasStore";
import { ViewState } from "@/types/canvas";

interface InlineTextEditorProps {
  viewState: ViewState;
}

export function InlineTextEditor({ viewState }: InlineTextEditorProps) {
  const { editorState, getShape, updateShape, stopEditing } = useCanvasStore();
  const ref = useRef<HTMLTextAreaElement>(null);
  const [value, setValue] = useState("");
  const [fontSizeMultiplier, setFontSizeMultiplier] = useState(1);
  const commitInProgressRef = useRef(false);

  const shapeId = editorState.editingShapeId;
  const shape = shapeId ? getShape(shapeId) : null;

  useEffect(() => {
    if (shape) {
      setValue(shape.label ?? "");
      requestAnimationFrame(() => ref.current?.focus());
    }
  }, [shapeId, shape]);

  if (!shape) return null;

  const screenX = viewState.offsetX + shape.x * viewState.zoom;
  const screenY = viewState.offsetY + shape.y * viewState.zoom;
  const screenW = shape.w * viewState.zoom;
  const screenH = shape.h * viewState.zoom;

  const commit = () => {
    // Prevent multiple commits
    if (commitInProgressRef.current) return;
    commitInProgressRef.current = true;

    try {
      // Always save the text before stopping editing
      const finalValue = value.trim();
      if (finalValue !== (shape.label ?? "")) {
        // Save only if text changed
        updateShape(shape.id, { label: finalValue });
      }
    } finally {
      stopEditing();
      commitInProgressRef.current = false;
    }
  };

  return (
    <div
      style={{
        position: "absolute",
        left: screenX,
        top: screenY,
        width: screenW,
        height: screenH,
        zIndex: 1000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        pointerEvents: "none",
        flexDirection: "column",
        gap: "4px",
      }}
    >
      <div
        style={{
          pointerEvents: "all",
          display: "flex",
          gap: "4px",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <button
          onMouseDown={(e) => {
            e.preventDefault();
            setFontSizeMultiplier((prev) => Math.max(0.5, prev - 0.2));
          }}
          style={{
            padding: "4px 8px",
            background: "rgba(91,127,255,0.8)",
            border: "none",
            borderRadius: "4px",
            color: "#fff",
            cursor: "pointer",
            fontSize: "12px",
            fontWeight: "bold",
          }}
          title="Decrease font size"
        >
          −
        </button>
        <span
          style={{
            color: "#fff",
            fontSize: "12px",
            minWidth: "40px",
            textAlign: "center",
          }}
        >
          {Math.round(fontSizeMultiplier * 100)}%
        </span>
        <button
          onMouseDown={(e) => {
            e.preventDefault();
            setFontSizeMultiplier((prev) => Math.min(3, prev + 0.2));
          }}
          style={{
            padding: "4px 8px",
            background: "rgba(91,127,255,0.8)",
            border: "none",
            borderRadius: "4px",
            color: "#fff",
            cursor: "pointer",
            fontSize: "12px",
            fontWeight: "bold",
          }}
          title="Increase font size"
        >
          +
        </button>
      </div>
      <textarea
        ref={ref}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            e.preventDefault();
            commit();
          }
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            commit();
          }
        }}
        style={{
          pointerEvents: "all",
          width: "90%",
          background: "rgba(15,15,20,0.85)",
          border: "1.5px solid transparent",
          borderRadius: 6,
          color: "#fff",
          fontSize: Math.max(10, 12 * viewState.zoom * fontSizeMultiplier),
          textAlign: "center",
          padding: "4px 8px",
          outline: "transparent",
          resize: "none",
          backdropFilter: "blur(4px)",
          boxShadow: "0 0 0 3px rgba(91,127,255,0.25)",
          fontFamily: "inherit",
          lineHeight: 1.4,
          minHeight: Math.max(24, screenH * 0.6),
        }}
        placeholder="Label…"
      />
    </div>
  );
}