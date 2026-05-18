import type { Arrow, Shape } from "@/types/canvas";

const AUTOSAVE_PREFIX = "ctrl_design_autosave:";
const LEGACY_AUTOSAVE_KEY = "ctrl_design_autosave";

export interface CanvasAutosavePayload {
  designId: string;
  title?: string;
  shapes: Shape[];
  arrows: Arrow[];
  savedAt: number;
}

export function autosaveStorageKey(designId: string): string {
  return `${AUTOSAVE_PREFIX}${designId}`;
}

export function fingerprintCanvas(
  shapes: Map<string, Shape>,
  arrows: Map<string, Arrow>
): string {
  return JSON.stringify({
    shapes: Array.from(shapes.values()),
    arrows: Array.from(arrows.values()),
  });
}

export function writeLocalAutosave(payload: CanvasAutosavePayload): void {
  try {
    localStorage.setItem(autosaveStorageKey(payload.designId), JSON.stringify(payload));
  } catch {
    // quota exceeded — ignore
  }
}

export function readLocalAutosave(designId: string): CanvasAutosavePayload | null {
  try {
    const raw = localStorage.getItem(autosaveStorageKey(designId));
    if (!raw) {
      // Legacy global key only applies to draft sessions — never to a specific design
      if (designId === "draft") return readLegacyAutosave(designId);
      return null;
    }
    const parsed = JSON.parse(raw) as CanvasAutosavePayload;
    if (!parsed?.shapes || !parsed?.savedAt) return null;
    if (parsed.designId && parsed.designId !== designId) return null;
    return parsed;
  } catch {
    return null;
  }
}

/** Migrate one-shot legacy key (no design id) for draft sessions only. */
function readLegacyAutosave(designId: string): CanvasAutosavePayload | null {
  try {
    const raw = localStorage.getItem(LEGACY_AUTOSAVE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as {
      shapes?: Shape[];
      arrows?: Arrow[];
      savedAt?: number;
    };
    if (!parsed?.shapes) return null;
    return {
      designId,
      shapes: parsed.shapes,
      arrows: parsed.arrows ?? [],
      savedAt: parsed.savedAt ?? Date.now(),
    };
  } catch {
    return null;
  }
}

export function clearLocalAutosave(designId: string): void {
  try {
    localStorage.removeItem(autosaveStorageKey(designId));
    localStorage.removeItem(LEGACY_AUTOSAVE_KEY);
  } catch {
    // ignore
  }
}

export function resolveCanvasFromAutosave(
  designId: string,
  serverShapes: Shape[],
  serverArrows: Arrow[],
  serverUpdatedAt: number,
  serverTitle?: string
): {
  shapes: Shape[];
  arrows: Arrow[];
  title?: string;
  usedLocal: boolean;
} {
  const local = readLocalAutosave(designId);
  if (local && local.designId === designId && local.savedAt > serverUpdatedAt) {
    return {
      shapes: local.shapes,
      arrows: local.arrows,
      title: local.title ?? serverTitle,
      usedLocal: true,
    };
  }
  return {
    shapes: serverShapes,
    arrows: serverArrows,
    title: serverTitle,
    usedLocal: false,
  };
}
