import { create } from 'zustand';
import type { Overlay } from '../canvas/OverlayLayer';
import type { ParsedSlide, SlideBackground } from '../importer/parsePresentation';
import { deriveSlideTitleFromHtml } from '../importer/parsePresentation';
import { DATA_BLOCK_ID } from './blockId';
import { flushPendingCommit } from './pendingCommit';

let slideSeq = 0;
const makeSlideId = () => `slide-new-${Date.now()}-${++slideSeq}`;

// Block IDs are stamped on the live DOM in useSlideEditing's useEffect but
// only flow into stored html via commitFromDom (typing debounce / Sortable).
// If the user clicks a block and triggers Copy / Paste / Delete without
// typing, the stored html has no matching id. This helper parses the slide
// html and copies live DOM block-ids onto the parsed copy so subsequent
// querySelector by id succeeds. Positional sync (children index) is safe
// because edits only commit through this same store path.
//
// useSlideEditing stamps ids on direct children of .slide-inner *and* on
// deeply-nested .code-block / .terminal elements, so we walk the live DOM
// and replay each id at its child-index path inside doc. A direct-children-
// only loop would miss the nested cases and Copy/Paste/Delete on those
// blocks would silently no-op until the first debounced commit landed the
// runtime ids in slide.html.
function parseSlideWithLiveIds(slideHtml: string): Document {
  const doc = new DOMParser().parseFromString(slideHtml, 'text/html');
  if (typeof document === 'undefined') return doc;
  const liveSlide = document.querySelector<HTMLElement>(
    '[data-canvas-role="main"] div.slide',
  );
  if (!liveSlide) return doc;
  const docSlide = doc.querySelector<HTMLElement>('div.slide');
  if (!docSlide) return doc;
  const innerLive = liveSlide.querySelector('.slide-inner');
  const innerDoc = doc.querySelector('.slide-inner');
  if (!innerLive || !innerDoc) return doc;
  // Pessimistic guard: if direct-children counts diverge between live and
  // stored, index-based path alignment can't be trusted (Sortable mid-flight,
  // out-of-band insertion). Bail here so we don't stamp ids onto the wrong
  // structurally-matched elements. In practice this rarely trips because
  // every reorder/insert path commits or bumps revision before the next
  // store action runs.
  if (innerLive.children.length !== innerDoc.children.length) return doc;

  const liveBlocks = liveSlide.querySelectorAll<HTMLElement>(`[${DATA_BLOCK_ID}]`);
  liveBlocks.forEach((live) => {
    const id = live.getAttribute(DATA_BLOCK_ID);
    if (!id) return;
    const path: number[] = [];
    let cursor: Element | null = live;
    while (cursor && cursor !== liveSlide) {
      const parent: HTMLElement | null = cursor.parentElement;
      if (!parent) return;
      const idx = Array.prototype.indexOf.call(parent.children, cursor);
      if (idx < 0) return;
      path.unshift(idx);
      cursor = parent;
    }
    if (cursor !== liveSlide) return;
    let target: Element | null = docSlide;
    for (const step of path) {
      target = target?.children[step] ?? null;
      if (!target) return;
    }
    if (!target.getAttribute(DATA_BLOCK_ID)) {
      target.setAttribute(DATA_BLOCK_ID, id);
    }
  });
  return doc;
}

const HISTORY_LIMIT = 50;

const BLANK_SLIDE_HTML = `
<div class="slide">
  <div class="slide-topbar"></div>
  <div class="slide-inner">
    <div class="t-chapter" data-slot="label">CH.0 · 새 슬라이드</div>
    <div class="t-title" data-slot="title">제목을 입력하세요</div>
    <div class="t-caption" data-slot="subtitle">부제를 입력하세요</div>
    <div class="t-body" data-slot="body" style="margin-top:16px;">본문을 입력하세요. Enter로 문단을 나눌 수 있습니다.</div>
  </div>
  <div class="slide-footer">
    <span class="slide-footer-left" data-slot="caption">Footer</span>
    <span class="slide-footer-right" data-slot="page-num">00</span>
  </div>
</div>
`.trim();

type Snapshot = {
  slides: ParsedSlide[];
  overlaysBySlide: Record<string, Overlay[]>;
  currentIndex: number;
};

type ClipboardEntry =
  | { kind: 'block'; html: string }
  | { kind: 'overlay'; data: Overlay }
  | { kind: 'slide'; html: string; title: string; sourceDeckId?: string };

// sessionStorage key for cross-deck slide clipboard. Tab-scoped, cleared on
// tab close — matches OS clipboard semantics. Survives switching decks via
// Library navigation (loadDeck wipes in-memory state but reads back here).
const SLIDE_CLIPBOARD_KEY = 'slide-clipboard';

function persistSlideClipboard(entry: ClipboardEntry | null): void {
  if (typeof sessionStorage === 'undefined') return;
  try {
    if (entry && entry.kind === 'slide') {
      sessionStorage.setItem(SLIDE_CLIPBOARD_KEY, JSON.stringify(entry));
    } else {
      sessionStorage.removeItem(SLIDE_CLIPBOARD_KEY);
    }
  } catch {
    // Quota or privacy mode — best-effort, fall through.
  }
}

function readSlideClipboardFromSession(): ClipboardEntry | null {
  if (typeof sessionStorage === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(SLIDE_CLIPBOARD_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && parsed.kind === 'slide' && typeof parsed.html === 'string') {
      return parsed as ClipboardEntry;
    }
  } catch {
    // Corrupted entry — ignore.
  }
  return null;
}

// Called once at app boot to rehydrate slide clipboard across deck loads /
// browser refreshes (within the same tab session).
export function loadSlideClipboardFromSession(): void {
  const entry = readSlideClipboardFromSession();
  if (entry) {
    useDeckStore.setState({ clipboard: entry });
  }
}

type DeckState = {
  slides: ParsedSlide[];
  currentIndex: number;
  overlaysBySlide: Record<string, Overlay[]>;
  selectedOverlayId: string | null;
  selectedBlockId: string | null;

  // Internal copy buffer for in-flow blocks and overlays. Survives slide
  // navigation but is discarded on full deck reload.
  clipboard: ClipboardEntry | null;

  past: Snapshot[];
  future: Snapshot[];
  // Bumped on undo/redo so consumers can force-remount the slide DOM. Not
  // bumped on commitSlideHtml (that flows DOM→store and the DOM is already
  // authoritative).
  revision: number;

  loadDeck: (slides: ParsedSlide[]) => void;
  loadDeckFull: (payload: {
    slides: ParsedSlide[];
    overlaysBySlide: Record<string, Overlay[]>;
    currentIndex: number;
  }) => void;
  setCurrentIndex: (i: number) => void;
  commitSlideHtml: (id: string, html: string) => void;
  setSlideBackground: (id: string, background: SlideBackground | null) => void;

  insertSlideAfter: (index: number, html?: string, title?: string) => void;
  duplicateSlide: (index: number) => void;
  removeSlide: (index: number) => void;
  reorderSlide: (from: number, to: number) => void;

  setSelectedOverlayId: (id: string | null) => void;
  setSelectedBlockId: (id: string | null) => void;
  addOverlay: (slideId: string, item: Overlay) => void;
  updateOverlay: (slideId: string, id: string, patch: Partial<Overlay>) => void;
  removeOverlay: (slideId: string, id: string) => void;

  // Programmatically appends a fresh block (raw HTML string) to .slide-inner
  // of the given slide. Bumps revision so SlideRenderer remounts and
  // useSlideEditing re-runs (drag handles, blockId stamping).
  insertBlock: (slideId: string, blockHtml: string) => void;

  // Atomic conversion: removes an in-flow block by id and adds an overlay
  // representing the same content at the supplied 1280×720 coords. Single
  // history entry so undo restores both halves at once.
  floatBlock: (slideId: string, blockId: string, overlay: Overlay) => void;

  // Copy / paste / remove for in-flow blocks. Paste anchors above or below
  // the supplied block id; if no anchor (or the anchor disappeared), paste
  // appends to the end of .slide-inner. Copy does NOT push a history entry
  // (pure read), paste/remove do.
  copyBlock: (slideId: string, blockId: string) => void;
  pasteBlock: (slideId: string, anchorBlockId: string | null, where: 'above' | 'below') => void;
  removeBlock: (slideId: string, blockId: string) => void;

  // Same trio for free-positioned overlays. Paste assigns a new id and
  // offsets x/y by +20px to make the duplicate visually distinguishable.
  copyOverlay: (slideId: string, overlayId: string) => void;
  pasteOverlay: (slideId: string) => void;

  // Slide-level clipboard for cross-deck reuse. copy mirrors to
  // sessionStorage so paste survives a deck switch (loadDeck resets in-memory
  // state). paste delegates to insertSlideAfter which already pushes history.
  copySlideToClipboard: (index: number, sourceDeckId?: string) => void;
  pasteSlideFromClipboard: (afterIndex: number) => boolean;

  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;
};

function snap(state: Pick<DeckState, 'slides' | 'overlaysBySlide' | 'currentIndex'>): Snapshot {
  return {
    slides: state.slides,
    overlaysBySlide: state.overlaysBySlide,
    currentIndex: state.currentIndex,
  };
}

function pushPast(past: Snapshot[], next: Snapshot): Snapshot[] {
  const trimmed = past.length >= HISTORY_LIMIT ? past.slice(past.length - HISTORY_LIMIT + 1) : past;
  return [...trimmed, next];
}

export const useDeckStore = create<DeckState>((set, get) => ({
  slides: [],
  currentIndex: 0,
  overlaysBySlide: {},
  selectedOverlayId: null,
  selectedBlockId: null,

  clipboard: null,

  past: [],
  future: [],
  revision: 0,

  loadDeck: (slides) =>
    set((state) => ({
      slides,
      currentIndex: 0,
      selectedOverlayId: null,
      selectedBlockId: null,
      overlaysBySlide: Object.fromEntries(slides.map((s) => [s.id, []])),
      // Fresh deck — discard any stale history.
      past: [],
      future: [],
      // Bump (not reset to 0) so SlideRenderer force-remounts and re-reads
      // initialHtml from store. Slide IDs from parsePresentationHTML are
      // deterministic (slide-1..N), so without a revision change the key
      // stays the same and stale HTML is shown.
      revision: state.revision + 1,
    })),

  loadDeckFull: ({ slides, overlaysBySlide, currentIndex }) =>
    set((state) => ({
      slides,
      currentIndex: Math.max(0, Math.min(currentIndex, slides.length - 1)),
      selectedOverlayId: null,
      selectedBlockId: null,
      overlaysBySlide,
      past: [],
      future: [],
      revision: state.revision + 1,
    })),

  setCurrentIndex: (i) => set({ currentIndex: i, selectedOverlayId: null, selectedBlockId: null }),

  // Selecting an overlay clears any block selection (mutually exclusive
  // selection so the Properties panel branches cleanly). Clearing one
  // does not touch the other.
  setSelectedOverlayId: (id) =>
    set((s) => (id ? { selectedOverlayId: id, selectedBlockId: null } : { ...s, selectedOverlayId: null })),
  setSelectedBlockId: (id) =>
    set((s) => (id ? { selectedBlockId: id, selectedOverlayId: null } : { ...s, selectedBlockId: null })),

  commitSlideHtml: (id, html) =>
    set((state) => {
      const current = state.slides.find((s) => s.id === id);
      if (!current || current.html === html) return state;
      // Re-extract the sidebar title from the freshly committed html so the
      // slide list reflects edits to [data-slot="title|label|subtitle"]
      // immediately. parsePresentation runs the same logic at import time;
      // mirroring it here keeps the sidebar in sync with what the user is
      // actually seeing on the canvas. When a slide has no title slot at
      // all, we keep `current.title` so an explicit "Slide N (copy)" set
      // by duplicateSlide isn't clobbered with a generic fallback.
      const nextTitle = deriveSlideTitleFromHtml(html, current.title);
      return {
        past: pushPast(state.past, snap(state)),
        future: [],
        slides: state.slides.map((s) =>
          s.id === id ? { ...s, html, title: nextTitle } : s,
        ),
      };
    }),

  setSlideBackground: (id, background) =>
    set((state) => {
      const current = state.slides.find((s) => s.id === id);
      if (!current) return state;
      // No-op when value matches — avoids spurious history entries when the
      // ColorPicker re-emits the same hex on focus blur.
      const same =
        (background === null && !current.background) ||
        (background &&
          current.background &&
          background.kind === current.background.kind &&
          JSON.stringify(background) === JSON.stringify(current.background));
      if (same) return state;
      return {
        past: pushPast(state.past, snap(state)),
        future: [],
        slides: state.slides.map((s) =>
          s.id === id ? { ...s, background: background ?? undefined } : s,
        ),
      };
    }),

  insertSlideAfter: (index, html = BLANK_SLIDE_HTML, title = '새 슬라이드') =>
    set((state) => {
      const id = makeSlideId();
      const newSlide: ParsedSlide = { id, html, title };
      const insertAt = Math.min(index + 1, state.slides.length);
      const slides = [
        ...state.slides.slice(0, insertAt),
        newSlide,
        ...state.slides.slice(insertAt),
      ];
      return {
        past: pushPast(state.past, snap(state)),
        future: [],
        slides,
        currentIndex: insertAt,
        selectedOverlayId: null,
        selectedBlockId: null,
        overlaysBySlide: { ...state.overlaysBySlide, [id]: [] },
      };
    }),

  duplicateSlide: (index) =>
    set((state) => {
      const src = state.slides[index];
      if (!src) return state;
      const id = makeSlideId();
      const copy: ParsedSlide = { id, html: src.html, title: `${src.title} (copy)` };
      const slides = [
        ...state.slides.slice(0, index + 1),
        copy,
        ...state.slides.slice(index + 1),
      ];
      const sourceOverlays = state.overlaysBySlide[src.id] ?? [];
      return {
        past: pushPast(state.past, snap(state)),
        future: [],
        slides,
        currentIndex: index + 1,
        selectedOverlayId: null,
        selectedBlockId: null,
        overlaysBySlide: {
          ...state.overlaysBySlide,
          [id]: sourceOverlays.map((o): Overlay => ({ ...o, id: `${o.id}-copy-${slideSeq}` })),
        },
      };
    }),

  removeSlide: (index) =>
    set((state) => {
      if (state.slides.length <= 1) return state;
      const victim = state.slides[index];
      if (!victim) return state;
      const slides = state.slides.filter((_, i) => i !== index);
      const { [victim.id]: _dropped, ...rest } = state.overlaysBySlide;
      void _dropped;
      const nextIndex = Math.min(state.currentIndex, slides.length - 1);
      return {
        past: pushPast(state.past, snap(state)),
        future: [],
        slides,
        currentIndex: nextIndex,
        selectedOverlayId: null,
        selectedBlockId: null,
        overlaysBySlide: rest,
      };
    }),

  reorderSlide: (from, to) =>
    set((state) => {
      if (from === to) return state;
      if (from < 0 || from >= state.slides.length) return state;
      if (to < 0 || to >= state.slides.length) return state;
      const slides = [...state.slides];
      const [moved] = slides.splice(from, 1);
      slides.splice(to, 0, moved);

      // Keep the active slide active by tracking where its index moved.
      let nextIndex = state.currentIndex;
      if (state.currentIndex === from) {
        nextIndex = to;
      } else if (from < state.currentIndex && to >= state.currentIndex) {
        nextIndex -= 1;
      } else if (from > state.currentIndex && to <= state.currentIndex) {
        nextIndex += 1;
      }

      return {
        past: pushPast(state.past, snap(state)),
        future: [],
        slides,
        currentIndex: nextIndex,
      };
    }),

  addOverlay: (slideId, item) =>
    set((state) => ({
      past: pushPast(state.past, snap(state)),
      future: [],
      overlaysBySlide: {
        ...state.overlaysBySlide,
        [slideId]: [...(state.overlaysBySlide[slideId] ?? []), item],
      },
    })),

  updateOverlay: (slideId, id, patch) =>
    set((state) => {
      const list = state.overlaysBySlide[slideId] ?? [];
      const current = list.find((it) => it.id === id);
      if (!current) return state;
      const changed = Object.entries(patch).some(
        ([k, v]) => (current as Record<string, unknown>)[k] !== v,
      );
      if (!changed) return state;
      return {
        past: pushPast(state.past, snap(state)),
        future: [],
        overlaysBySlide: {
          ...state.overlaysBySlide,
          [slideId]: list.map((it) =>
            it.id === id ? ({ ...it, ...patch } as Overlay) : it,
          ),
        },
      };
    }),

  removeOverlay: (slideId, id) =>
    set((state) => ({
      past: pushPast(state.past, snap(state)),
      future: [],
      selectedOverlayId: state.selectedOverlayId === id ? null : state.selectedOverlayId,
      overlaysBySlide: {
        ...state.overlaysBySlide,
        [slideId]: (state.overlaysBySlide[slideId] ?? []).filter((it) => it.id !== id),
      },
    })),

  insertBlock: (slideId, blockHtml) => {
    // Drain any in-flight DOM-debounced commit first so we're operating on
    // the latest authoritative html before splicing the new block.
    flushPendingCommit();
    set((state) => {
      const slide = state.slides.find((s) => s.id === slideId);
      if (!slide) return state;
      const doc = new DOMParser().parseFromString(slide.html, 'text/html');
      const inner = doc.querySelector('.slide-inner');
      if (!inner) return state;
      const tmp = doc.createElement('div');
      tmp.innerHTML = blockHtml;
      const block = tmp.firstElementChild;
      if (!block) return state;
      inner.appendChild(block);
      const slideEl = doc.querySelector('.slide');
      const newHtml = slideEl ? slideEl.outerHTML : slide.html;
      if (newHtml === slide.html) return state;
      return {
        past: pushPast(state.past, snap(state)),
        future: [],
        slides: state.slides.map((s) => (s.id === slideId ? { ...s, html: newHtml } : s)),
        revision: state.revision + 1,
      };
    });
  },

  floatBlock: (slideId, blockId, overlay) => {
    flushPendingCommit();
    set((state) => {
      const slide = state.slides.find((s) => s.id === slideId);
      if (!slide) return state;
      const doc = new DOMParser().parseFromString(slide.html, 'text/html');
      const block = doc.querySelector(`[${DATA_BLOCK_ID}="${blockId}"]`);
      if (!block) return state;
      block.remove();
      const slideEl = doc.querySelector('.slide');
      const newHtml = slideEl ? slideEl.outerHTML : slide.html;
      return {
        past: pushPast(state.past, snap(state)),
        future: [],
        slides: state.slides.map((s) =>
          s.id === slideId ? { ...s, html: newHtml } : s,
        ),
        overlaysBySlide: {
          ...state.overlaysBySlide,
          [slideId]: [...(state.overlaysBySlide[slideId] ?? []), overlay],
        },
        selectedBlockId: null,
        selectedOverlayId: overlay.id,
        revision: state.revision + 1,
      };
    });
  },

  copyBlock: (slideId, blockId) => {
    flushPendingCommit();
    const slide = get().slides.find((s) => s.id === slideId);
    if (!slide) return;
    const doc = parseSlideWithLiveIds(slide.html);
    const block = doc.querySelector(`[${DATA_BLOCK_ID}="${blockId}"]`);
    if (!block) return;
    // Strip ephemeral runtime decoration the source block accumulated:
    //   - data-block-id (pasted clone gets a fresh id from useSlideEditing)
    //   - .block-drag-handle (re-injected on mount)
    //   - .selected-block class (selection ring is transient)
    const clone = block.cloneNode(true) as HTMLElement;
    clone.removeAttribute(DATA_BLOCK_ID);
    clone.querySelectorAll('.block-drag-handle').forEach((n) => n.remove());
    clone.classList.remove('selected-block');
    // Force the pasted clone to size to its content. Tables, two-col grids,
    // and other layout wrappers commonly carry `flex: 1` (inline or via
    // class rules) so they fill the slide's empty space. When pasted into
    // an already-full slide-inner that auto-fill makes the new block
    // unmanageably squished — predictable content-sized default is what
    // a "duplicate" gesture should produce.
    clone.style.flex = '0 0 auto';
    set({ clipboard: { kind: 'block', html: clone.outerHTML } });
  },

  pasteBlock: (slideId, anchorBlockId, where) => {
    flushPendingCommit();
    set((state) => {
      const entry = state.clipboard;
      if (!entry || entry.kind !== 'block') return state;
      const slide = state.slides.find((s) => s.id === slideId);
      if (!slide) return state;
      const doc = parseSlideWithLiveIds(slide.html);
      const inner = doc.querySelector('.slide-inner');
      if (!inner) return state;
      const tmp = doc.createElement('div');
      tmp.innerHTML = entry.html;
      const fresh = tmp.firstElementChild;
      if (!fresh) return state;
      const anchor = anchorBlockId
        ? doc.querySelector(`[${DATA_BLOCK_ID}="${anchorBlockId}"]`)
        : null;
      // The anchor must be a direct child of .slide-inner — pasting a sibling
      // of a deeply-nested element would break the flex flow. Walk up to the
      // first child of .slide-inner if needed.
      let anchorChild: Element | null = anchor;
      while (anchorChild && anchorChild.parentElement !== inner) {
        anchorChild = anchorChild.parentElement;
      }
      if (anchorChild) {
        if (where === 'above') inner.insertBefore(fresh, anchorChild);
        else inner.insertBefore(fresh, anchorChild.nextSibling);
      } else {
        inner.appendChild(fresh);
      }
      const slideEl = doc.querySelector('.slide');
      const newHtml = slideEl ? slideEl.outerHTML : slide.html;
      if (newHtml === slide.html) return state;
      return {
        past: pushPast(state.past, snap(state)),
        future: [],
        slides: state.slides.map((s) => (s.id === slideId ? { ...s, html: newHtml } : s)),
        revision: state.revision + 1,
      };
    });
  },

  removeBlock: (slideId, blockId) => {
    flushPendingCommit();
    set((state) => {
      const slide = state.slides.find((s) => s.id === slideId);
      if (!slide) return state;
      const doc = parseSlideWithLiveIds(slide.html);
      const block = doc.querySelector(`[${DATA_BLOCK_ID}="${blockId}"]`);
      if (!block) return state;
      block.remove();
      const slideEl = doc.querySelector('.slide');
      const newHtml = slideEl ? slideEl.outerHTML : slide.html;
      if (newHtml === slide.html) return state;
      return {
        past: pushPast(state.past, snap(state)),
        future: [],
        slides: state.slides.map((s) => (s.id === slideId ? { ...s, html: newHtml } : s)),
        selectedBlockId: state.selectedBlockId === blockId ? null : state.selectedBlockId,
        revision: state.revision + 1,
      };
    });
  },

  copyOverlay: (slideId, overlayId) => {
    const list = get().overlaysBySlide[slideId] ?? [];
    const target = list.find((o) => o.id === overlayId);
    if (!target) return;
    set({ clipboard: { kind: 'overlay', data: target } });
  },

  pasteOverlay: (slideId) => {
    set((state) => {
      const entry = state.clipboard;
      if (!entry || entry.kind !== 'overlay') return state;
      const id = `ovl-paste-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      const offset = 20;
      const next: Overlay = {
        ...entry.data,
        id,
        x: entry.data.x + offset,
        y: entry.data.y + offset,
      };
      return {
        past: pushPast(state.past, snap(state)),
        future: [],
        overlaysBySlide: {
          ...state.overlaysBySlide,
          [slideId]: [...(state.overlaysBySlide[slideId] ?? []), next],
        },
        selectedOverlayId: id,
        selectedBlockId: null,
      };
    });
  },

  copySlideToClipboard: (index, sourceDeckId) => {
    const state = get();
    const slide = state.slides[index];
    if (!slide) return;
    const entry: ClipboardEntry = {
      kind: 'slide',
      html: slide.html,
      title: slide.title,
      sourceDeckId,
    };
    set({ clipboard: entry });
    persistSlideClipboard(entry);
  },

  pasteSlideFromClipboard: (afterIndex) => {
    const entry = get().clipboard;
    if (!entry || entry.kind !== 'slide') return false;
    // insertSlideAfter already pushes history and sets currentIndex to the
    // newly inserted slide — no extra bookkeeping needed.
    get().insertSlideAfter(afterIndex, entry.html, entry.title);
    return true;
  },

  undo: () =>
    set((state) => {
      const prev = state.past[state.past.length - 1];
      if (!prev) return state;
      return {
        past: state.past.slice(0, -1),
        future: [...state.future, snap(state)],
        slides: prev.slides,
        overlaysBySlide: prev.overlaysBySlide,
        currentIndex: Math.min(prev.currentIndex, prev.slides.length - 1),
        selectedOverlayId: null,
        selectedBlockId: null,
        revision: state.revision + 1,
      };
    }),

  redo: () =>
    set((state) => {
      const next = state.future[state.future.length - 1];
      if (!next) return state;
      return {
        past: [...state.past, snap(state)],
        future: state.future.slice(0, -1),
        slides: next.slides,
        overlaysBySlide: next.overlaysBySlide,
        currentIndex: Math.min(next.currentIndex, next.slides.length - 1),
        selectedOverlayId: null,
        selectedBlockId: null,
        revision: state.revision + 1,
      };
    }),

  canUndo: () => get().past.length > 0,
  canRedo: () => get().future.length > 0,
}));
