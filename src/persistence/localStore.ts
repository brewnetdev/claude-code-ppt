import type { Overlay } from '../canvas/OverlayLayer';
import type { ParsedSlide } from '../importer/parsePresentation';
import { idbDeleteDeck, idbGetDeck, idbPutDeck } from './idb';

// Deck payloads live in IndexedDB (no 5MB ceiling — important when a deck has
// several data-URL inlined images). The bookkeeping below stays in
// localStorage because it's tiny and benefits from a sync read at boot.
const LAST_DECK_KEY = 'claude-code-ppt:last-deck:v1';
const HIDDEN_DECKS_KEY = 'claude-code-ppt:hidden-decks:v1';
const ZOOM_PERCENT_KEY = 'claude-code-ppt:zoom-percent:v1';
// Legacy localStorage keys we sweep on first boot after the IDB migration.
const LEGACY_DECK_KEY_PREFIX = 'claude-code-ppt:deck:v1:';
const LEGACY_BARE_DECK_KEY = 'claude-code-ppt:deck:v1';
const MIGRATION_FLAG_KEY = 'claude-code-ppt:migrated-to-idb:v1';
const SCHEMA_VERSION = 1;

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

function isPersistedDeck(value: unknown): value is PersistedDeck {
  if (!value || typeof value !== 'object') return false;
  const v = value as Partial<PersistedDeck>;
  if (v.version !== SCHEMA_VERSION) return false;
  if (!Array.isArray(v.slides) || v.slides.length === 0) return false;
  if (typeof v.overlaysBySlide !== 'object' || v.overlaysBySlide === null) return false;
  return true;
}

// One-shot sweep of pre-IDB localStorage entries into IndexedDB. Idempotent —
// the flag prevents re-running once it has succeeded. We never block the
// caller on failure; users with data in localStorage simply won't see it
// migrated until a future boot succeeds.
let migrationPromise: Promise<void> | null = null;
async function migrateLegacyLocalStorageOnce(): Promise<void> {
  if (migrationPromise) return migrationPromise;
  migrationPromise = (async () => {
    try {
      if (localStorage.getItem(MIGRATION_FLAG_KEY) === '1') return;
      const candidates: { deckId: string; key: string; payload: string }[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (!key || !key.startsWith(LEGACY_DECK_KEY_PREFIX)) continue;
        const deckId = key.slice(LEGACY_DECK_KEY_PREFIX.length);
        if (!deckId) continue;
        const payload = localStorage.getItem(key);
        if (payload) candidates.push({ deckId, key, payload });
      }
      // The original layout used a bare `claude-code-ppt:deck:v1` key for the
      // brewnet-presentation deck before deck-id scoping was introduced.
      const bareLegacy = localStorage.getItem(LEGACY_BARE_DECK_KEY);
      if (bareLegacy) {
        candidates.push({
          deckId: 'brewnet-presentation',
          key: LEGACY_BARE_DECK_KEY,
          payload: bareLegacy,
        });
      }

      for (const { deckId, key, payload } of candidates) {
        try {
          const parsed = JSON.parse(payload) as unknown;
          if (!isPersistedDeck(parsed)) {
            localStorage.removeItem(key);
            continue;
          }
          const existing = await idbGetDeck(deckId);
          if (!existing) {
            await idbPutDeck(deckId, parsed);
          }
          localStorage.removeItem(key);
        } catch {
          // Leave this entry behind — next boot will retry it.
        }
      }
      localStorage.setItem(MIGRATION_FLAG_KEY, '1');
    } catch {
      // If anything explodes (e.g. IDB unavailable) leave the flag unset so a
      // future boot can try again. Don't surface to caller — the load path
      // handles "no persisted deck" gracefully.
    }
  })();
  return migrationPromise;
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
    await migrateLegacyLocalStorageOnce();
    const overlaysBySlide = await inlineOverlays(input.overlaysBySlide);
    const payload: PersistedDeck = {
      version: SCHEMA_VERSION,
      savedAt: Date.now(),
      slides: input.slides,
      overlaysBySlide,
      currentIndex: input.currentIndex,
    };
    await idbPutDeck(deckId, payload);
    try {
      localStorage.setItem(LAST_DECK_KEY, deckId);
    } catch {
      /* swallow — last-deck pointer is best-effort */
    }
    // size is informational; estimate from JSON length to keep parity with
    // the previous return shape.
    const size = JSON.stringify(payload).length;
    return { ok: true, size, savedAt: payload.savedAt };
  } catch (err) {
    return { ok: false, reason: err instanceof Error ? err.message : String(err) };
  }
}

export async function loadDeckFromLocalStorage(deckId: string): Promise<PersistedDeck | null> {
  try {
    await migrateLegacyLocalStorageOnce();
    const raw = await idbGetDeck(deckId);
    if (!isPersistedDeck(raw)) return null;
    return raw;
  } catch {
    return null;
  }
}

export async function clearDeckFromLocalStorage(deckId: string): Promise<void> {
  try {
    await idbDeleteDeck(deckId);
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

// Generic helpers for tiny localStorage payloads. Shared so the swallow-on-
// error contract stays uniform across hidden-deck tracking, applied-migration
// tracking, and any future single-key bookkeeping.
export function safeReadStringArray(key: string): string[] {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((v): v is string => typeof v === 'string');
  } catch {
    return [];
  }
}

export function safeWriteJson(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* swallow — best-effort */
  }
}

// Logical "delete" for built-in decks. The HTML source is bundled at build
// time so we can't physically remove it; instead we keep an id allowlist in
// localStorage and filter the library through it.
export function getHiddenDeckIds(): string[] {
  return safeReadStringArray(HIDDEN_DECKS_KEY);
}

function writeHiddenDeckIds(ids: string[]): void {
  safeWriteJson(HIDDEN_DECKS_KEY, ids);
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

// Zoom percent for the editor canvas. Tiny integer, sync access matters at
// mount, so localStorage rather than IDB. Returns null when no preference is
// stored or the stored value is out of bounds; callers fall back to 100.
export function getZoomPercent(): number | null {
  try {
    const raw = localStorage.getItem(ZOOM_PERCENT_KEY);
    if (!raw) return null;
    const n = Number(raw);
    if (!Number.isFinite(n) || n < 25 || n > 200) return null;
    return Math.round(n);
  } catch {
    return null;
  }
}

export function setZoomPercent(n: number): void {
  try {
    localStorage.setItem(ZOOM_PERCENT_KEY, String(Math.round(n)));
  } catch {
    /* swallow */
  }
}
