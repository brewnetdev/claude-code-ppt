import type { OverlayImage } from '../canvas/OverlayLayer';
import type { ParsedSlide } from '../importer/parsePresentation';

const STORAGE_KEY = 'claude-code-ppt:deck:v1';
const SCHEMA_VERSION = 1;

export type PersistedDeck = {
  version: number;
  savedAt: number;
  slides: ParsedSlide[];
  overlaysBySlide: Record<string, OverlayImage[]>;
  currentIndex: number;
};

export type SaveResult =
  | { ok: true; size: number; savedAt: number }
  | { ok: false; reason: string };

async function blobUrlToDataUrl(url: string): Promise<string> {
  // Already inlined or remote — keep as is.
  if (!url.startsWith('blob:')) return url;
  const res = await fetch(url);
  const blob = await res.blob();
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error ?? new Error('FileReader failed'));
    reader.readAsDataURL(blob);
  });
}

async function inlineOverlays(
  overlaysBySlide: Record<string, OverlayImage[]>,
): Promise<Record<string, OverlayImage[]>> {
  const out: Record<string, OverlayImage[]> = {};
  for (const [slideId, items] of Object.entries(overlaysBySlide)) {
    out[slideId] = await Promise.all(
      items.map(async (it) => ({ ...it, src: await blobUrlToDataUrl(it.src) })),
    );
  }
  return out;
}

export async function saveDeckToLocalStorage(input: {
  slides: ParsedSlide[];
  overlaysBySlide: Record<string, OverlayImage[]>;
  currentIndex: number;
}): Promise<SaveResult> {
  try {
    const overlaysBySlide = await inlineOverlays(input.overlaysBySlide);
    const payload: PersistedDeck = {
      version: SCHEMA_VERSION,
      savedAt: Date.now(),
      slides: input.slides,
      overlaysBySlide,
      currentIndex: input.currentIndex,
    };
    const json = JSON.stringify(payload);
    localStorage.setItem(STORAGE_KEY, json);
    return { ok: true, size: json.length, savedAt: payload.savedAt };
  } catch (err) {
    return { ok: false, reason: err instanceof Error ? err.message : String(err) };
  }
}

export function loadDeckFromLocalStorage(): PersistedDeck | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<PersistedDeck>;
    if (parsed?.version !== SCHEMA_VERSION) return null;
    if (!Array.isArray(parsed.slides) || parsed.slides.length === 0) return null;
    if (typeof parsed.overlaysBySlide !== 'object' || parsed.overlaysBySlide === null) return null;
    return {
      version: parsed.version,
      savedAt: typeof parsed.savedAt === 'number' ? parsed.savedAt : Date.now(),
      slides: parsed.slides as ParsedSlide[],
      overlaysBySlide: parsed.overlaysBySlide as Record<string, OverlayImage[]>,
      currentIndex: typeof parsed.currentIndex === 'number' ? parsed.currentIndex : 0,
    };
  } catch {
    return null;
  }
}

export function clearDeckFromLocalStorage(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* swallow — storage may be disabled */
  }
}
