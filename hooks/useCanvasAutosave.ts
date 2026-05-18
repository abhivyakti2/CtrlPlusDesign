"use client";

import { useCallback, useEffect, useRef } from "react";
import { useCanvasStore } from "@/store/canvasStore";
import { updateDesign } from "@/lib/actions/designs";
import { buildArchitectureGraphFromCanvas } from "@/canvas/architectureAdapter";
import {
  type CanvasAutosavePayload,
  fingerprintCanvas,
  writeLocalAutosave,
} from "@/lib/canvas-autosave";

const AUTOSAVE_DEBOUNCE_MS = 800;

interface UseCanvasAutosaveOptions {
  designId: string | null;
  title: string;
  /** Skip autosave until initial design load finishes (avoids overwriting server with empty canvas). */
  enabled?: boolean;
}

export function useCanvasAutosave({
  designId,
  title,
  enabled = true,
}: UseCanvasAutosaveOptions): void {
  const titleRef = useRef(title);
  titleRef.current = title;

  const designIdRef = useRef(designId);
  designIdRef.current = designId;

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fingerprintRef = useRef("");
  const pendingRef = useRef<CanvasAutosavePayload | null>(null);
  const savingRef = useRef(false);

  const buildPayload = useCallback((): CanvasAutosavePayload | null => {
    const store = useCanvasStore.getState();
    const id = designIdRef.current ?? "draft";
    return {
      designId: id,
      title: titleRef.current,
      shapes: store.getAllShapes(),
      arrows: store.getAllArrows(),
      savedAt: Date.now(),
    };
  }, []);

  const persist = useCallback(
    async (payload: CanvasAutosavePayload, options?: { localOnly?: boolean }) => {
      const activeDesignId = designIdRef.current;
      if (payload.designId !== (activeDesignId ?? "draft")) return;

      writeLocalAutosave(payload);

      if (options?.localOnly || !activeDesignId) return;

      const token = localStorage.getItem("authToken");
      if (!token) return;

      if (savingRef.current) return;
      savingRef.current = true;

      try {
        const architectureGraph = buildArchitectureGraphFromCanvas(
          payload.shapes,
          payload.arrows
        );

        await updateDesign(activeDesignId, token, {
          title: payload.title ?? titleRef.current,
          content: {
            shapes: payload.shapes,
            arrows: payload.arrows,
            groups: [],
            architectureGraph,
          },
        });
      } finally {
        savingRef.current = false;
      }
    },
    []
  );

  // Reset debounce state when switching designs so we don't leak prior canvas data
  useEffect(() => {
    fingerprintRef.current = "";
    pendingRef.current = null;
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, [designId]);

  const flushPending = useCallback(
    (localOnly = false) => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      const pending = pendingRef.current ?? buildPayload();
      if (!pending) return;
      pendingRef.current = null;
      void persist(pending, { localOnly }).catch((err) =>
        console.error("Canvas autosave failed:", err)
      );
    },
    [buildPayload, persist]
  );

  const queueSave = useCallback(() => {
    const payload = buildPayload();
    if (!payload) return;
    pendingRef.current = payload;

    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      const next = pendingRef.current;
      if (!next) return;
      pendingRef.current = null;
      void persist(next).catch((err) =>
        console.error("Canvas autosave failed:", err)
      );
    }, AUTOSAVE_DEBOUNCE_MS);
  }, [buildPayload, persist]);

  // Persist title edits even when canvas geometry is unchanged
  useEffect(() => {
    if (!enabled) return;
    queueSave();
  }, [title, enabled, queueSave]);

  useEffect(() => {
    if (!enabled) return;

    const unsub = useCanvasStore.subscribe((state) => {
      const fp = fingerprintCanvas(state.shapes, state.arrows);
      if (fp === fingerprintRef.current) return;
      fingerprintRef.current = fp;
      queueSave();
    });

    const onBeforeUnload = () => flushPending(true);

    window.addEventListener("beforeunload", onBeforeUnload);

    return () => {
      unsub();
      window.removeEventListener("beforeunload", onBeforeUnload);
      flushPending(true);
    };
  }, [enabled, queueSave, flushPending]);
}
