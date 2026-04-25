import { create } from 'zustand';
import type { OverlayImage } from '../canvas/OverlayLayer';
import type { ParsedSlide } from '../importer/parsePresentation';

let slideSeq = 0;
const makeSlideId = () => `slide-new-${Date.now()}-${++slideSeq}`;

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
  overlaysBySlide: Record<string, OverlayImage[]>;
  currentIndex: number;
};

type DeckState = {
  slides: ParsedSlide[];
  currentIndex: number;
  overlaysBySlide: Record<string, OverlayImage[]>;
  selectedOverlayId: string | null;

  past: Snapshot[];
  future: Snapshot[];
  // Bumped on undo/redo so consumers can force-remount the slide DOM. Not
  // bumped on commitSlideHtml (that flows DOM→store and the DOM is already
  // authoritative).
  revision: number;

  loadDeck: (slides: ParsedSlide[]) => void;
  loadDeckFull: (payload: {
    slides: ParsedSlide[];
    overlaysBySlide: Record<string, OverlayImage[]>;
    currentIndex: number;
  }) => void;
  setCurrentIndex: (i: number) => void;
  commitSlideHtml: (id: string, html: string) => void;

  insertBlankSlideAfter: (index: number) => void;
  duplicateSlide: (index: number) => void;
  removeSlide: (index: number) => void;

  setSelectedOverlayId: (id: string | null) => void;
  addOverlay: (slideId: string, item: OverlayImage) => void;
  updateOverlay: (slideId: string, id: string, patch: Partial<OverlayImage>) => void;
  removeOverlay: (slideId: string, id: string) => void;

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

  past: [],
  future: [],
  revision: 0,

  loadDeck: (slides) =>
    set(() => ({
      slides,
      currentIndex: 0,
      selectedOverlayId: null,
      overlaysBySlide: Object.fromEntries(slides.map((s) => [s.id, []])),
      // Fresh deck — discard any stale history.
      past: [],
      future: [],
      revision: 0,
    })),

  loadDeckFull: ({ slides, overlaysBySlide, currentIndex }) =>
    set(() => ({
      slides,
      currentIndex: Math.max(0, Math.min(currentIndex, slides.length - 1)),
      selectedOverlayId: null,
      overlaysBySlide,
      past: [],
      future: [],
      revision: 0,
    })),

  setCurrentIndex: (i) => set({ currentIndex: i, selectedOverlayId: null }),

  setSelectedOverlayId: (id) => set({ selectedOverlayId: id }),

  commitSlideHtml: (id, html) =>
    set((state) => {
      const current = state.slides.find((s) => s.id === id);
      if (!current || current.html === html) return state;
      return {
        past: pushPast(state.past, snap(state)),
        future: [],
        slides: state.slides.map((s) => (s.id === id ? { ...s, html } : s)),
      };
    }),

  insertBlankSlideAfter: (index) =>
    set((state) => {
      const id = makeSlideId();
      const newSlide: ParsedSlide = { id, html: BLANK_SLIDE_HTML, title: '새 슬라이드' };
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
        overlaysBySlide: {
          ...state.overlaysBySlide,
          [id]: sourceOverlays.map((o) => ({ ...o, id: `${o.id}-copy-${slideSeq}` })),
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
        overlaysBySlide: rest,
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
          [slideId]: list.map((it) => (it.id === id ? { ...it, ...patch } : it)),
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
        revision: state.revision + 1,
      };
    }),

  canUndo: () => get().past.length > 0,
  canRedo: () => get().future.length > 0,
}));
