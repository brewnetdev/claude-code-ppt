import type { Overlay } from '../canvas/OverlayLayer';
import type { ParsedSlide } from '../importer/parsePresentation';

const KEY_PREFIX = 'claude-code-ppt:deck:v1';
const LEGACY_KEY = 'claude-code-ppt:deck:v1';
const LAST_DECK_KEY = 'claude-code-ppt:last-deck:v1';
const HIDDEN_DECKS_KEY = 'claude-code-ppt:hidden-decks:v1';
const SCHEMA_VERSION = 1;

function storageKeyFor(deckId: string): string {
  return `${KEY_PREFIX}:${deckId}`;
}

export type PersistedDeck = {
  version: number;
  savedAt: number;
  slides: ParsedSlide[];
  overlaysBySlide: Record<string, Overlay[]>;
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
  overlaysBySlide: Record<string, Overlay[]>,
): Promise<Record<string, Overlay[]>> {
  const out: Record<string, Overlay[]> = {};
  for (const [slideId, items] of Object.entries(overlaysBySlide)) {
    out[slideId] = await Promise.all(
      items.map(async (it): Promise<Overlay> => {
        // Treat legacy entries without `kind` as image overlays.
        const kind = (it as Partial<Overlay>).kind ?? 'image';
        if (kind === 'image') {
          const img = it as Extract<Overlay, { kind: 'image' }>;
          return { ...img, kind: 'image', src: await blobUrlToDataUrl(img.src) };
        }
        return it;
      }),
    );
  }
  return out;
}

export async function saveDeckToLocalStorage(
  deckId: string,
  input: {
    slides: ParsedSlide[];
    overlaysBySlide: Record<string, Overlay[]>;
    currentIndex: number;
  },
): Promise<SaveResult> {
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
    localStorage.setItem(storageKeyFor(deckId), json);
    localStorage.setItem(LAST_DECK_KEY, deckId);
    return { ok: true, size: json.length, savedAt: payload.savedAt };
  } catch (err) {
    return { ok: false, reason: err instanceof Error ? err.message : String(err) };
  }
}

export function loadDeckFromLocalStorage(deckId: string): PersistedDeck | null {
  try {
    const key = storageKeyFor(deckId);
    let raw = localStorage.getItem(key);

    // One-time migration from the original single-key layout. The brewnet
    // deck was the only thing the editor could load before deck-id scoping,
    // so any legacy payload belongs to it. We rename rather than copy so the
    // migration is idempotent.
    if (!raw && deckId === 'brewnet-presentation') {
      const legacy = localStorage.getItem(LEGACY_KEY);
      if (legacy && legacy !== '' && !localStorage.getItem(storageKeyFor('brewnet-presentation'))) {
        // The legacy key happens to equal KEY_PREFIX itself — so reading via
        // storageKeyFor('brewnet-presentation') returns null here. Move it.
        localStorage.setItem(key, legacy);
        localStorage.removeItem(LEGACY_KEY);
        raw = legacy;
      }
    }

    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<PersistedDeck>;
    if (parsed?.version !== SCHEMA_VERSION) return null;
    if (!Array.isArray(parsed.slides) || parsed.slides.length === 0) return null;
    if (typeof parsed.overlaysBySlide !== 'object' || parsed.overlaysBySlide === null) return null;
    return {
      version: parsed.version,
      savedAt: typeof parsed.savedAt === 'number' ? parsed.savedAt : Date.now(),
      slides: parsed.slides as ParsedSlide[],
      overlaysBySlide: parsed.overlaysBySlide as Record<string, Overlay[]>,
      currentIndex: typeof parsed.currentIndex === 'number' ? parsed.currentIndex : 0,
    };
  } catch {
    return null;
  }
}

export function clearDeckFromLocalStorage(deckId: string): void {
  try {
    localStorage.removeItem(storageKeyFor(deckId));
  } catch {
    /* swallow — storage may be disabled */
  }
}

export function getLastOpenedDeckId(): string | null {
  try {
    return localStorage.getItem(LAST_DECK_KEY);
  } catch {
    return null;
  }
}

export function setLastOpenedDeckId(deckId: string): void {
  try {
    localStorage.setItem(LAST_DECK_KEY, deckId);
  } catch {
    /* swallow */
  }
}

// Logical "delete" for built-in decks. The HTML source is bundled at build
// time so we can't physically remove it; instead we keep an id allowlist in
// localStorage and filter the library through it. Restoring just removes
// the id from the set — the bundle is still there.
export function getHiddenDeckIds(): string[] {
  try {
    const raw = localStorage.getItem(HIDDEN_DECKS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((v): v is string => typeof v === 'string');
  } catch {
    return [];
  }
}

function writeHiddenDeckIds(ids: string[]): void {
  try {
    localStorage.setItem(HIDDEN_DECKS_KEY, JSON.stringify(ids));
  } catch {
    /* swallow */
  }
}

export function addHiddenDeckId(deckId: string): void {
  const current = getHiddenDeckIds();
  if (current.includes(deckId)) return;
  writeHiddenDeckIds([...current, deckId]);
}

export function removeHiddenDeckId(deckId: string): void {
  const current = getHiddenDeckIds();
  const next = current.filter((id) => id !== deckId);
  if (next.length === current.length) return;
  writeHiddenDeckIds(next);
}
