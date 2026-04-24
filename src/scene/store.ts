import { create } from 'zustand';
import type { OverlayImage } from '../canvas/OverlayLayer';
import type { ParsedSlide } from '../importer/parsePresentation';

type DeckState = {
  slides: ParsedSlide[];
  currentIndex: number;
  overlaysBySlide: Record<string, OverlayImage[]>;

  loadDeck: (slides: ParsedSlide[]) => void;
  setCurrentIndex: (i: number) => void;
  commitSlideHtml: (id: string, html: string) => void;

  addOverlay: (slideId: string, item: OverlayImage) => void;
  updateOverlay: (slideId: string, id: string, patch: Partial<OverlayImage>) => void;
  removeOverlay: (slideId: string, id: string) => void;
};

export const useDeckStore = create<DeckState>((set) => ({
  slides: [],
  currentIndex: 0,
  overlaysBySlide: {},

  loadDeck: (slides) =>
    set(() => ({
      slides,
      currentIndex: 0,
      overlaysBySlide: Object.fromEntries(slides.map((s) => [s.id, []])),
    })),

  setCurrentIndex: (i) => set({ currentIndex: i }),

  commitSlideHtml: (id, html) =>
    set((state) => ({
      slides: state.slides.map((s) => (s.id === id ? { ...s, html } : s)),
    })),

  addOverlay: (slideId, item) =>
    set((state) => ({
      overlaysBySlide: {
        ...state.overlaysBySlide,
        [slideId]: [...(state.overlaysBySlide[slideId] ?? []), item],
      },
    })),

  updateOverlay: (slideId, id, patch) =>
    set((state) => ({
      overlaysBySlide: {
        ...state.overlaysBySlide,
        [slideId]: (state.overlaysBySlide[slideId] ?? []).map((it) =>
          it.id === id ? { ...it, ...patch } : it,
        ),
      },
    })),

  removeOverlay: (slideId, id) =>
    set((state) => ({
      overlaysBySlide: {
        ...state.overlaysBySlide,
        [slideId]: (state.overlaysBySlide[slideId] ?? []).filter((it) => it.id !== id),
      },
    })),
}));
