import { describe, expect, it } from 'vitest';
import { useDeckStore } from '../../src/scene/store';
import { registerPendingFlush } from '../../src/scene/pendingCommit';
import type { ParsedSlide } from '../../src/importer/parsePresentation';

const slides = (n: number): ParsedSlide[] =>
  Array.from({ length: n }, (_, i) => ({
    id: `slide-${i + 1}`,
    html: `<div class="slide">${i}</div>`,
    title: `S${i}`,
  }));

describe('store.removeSlide — keeps the viewed slide stable (M1)', () => {
  it('removing a slide BEFORE the current one decrements currentIndex', () => {
    useDeckStore.getState().loadDeck(slides(4));
    useDeckStore.getState().setCurrentIndex(2);
    useDeckStore.getState().removeSlide(0);
    expect(useDeckStore.getState().currentIndex).toBe(1);
    expect(useDeckStore.getState().slides.map((s) => s.title)).toEqual(['S1', 'S2', 'S3']);
  });

  it('removing the CURRENT slide keeps the index (shows the next slide)', () => {
    useDeckStore.getState().loadDeck(slides(4));
    useDeckStore.getState().setCurrentIndex(2);
    useDeckStore.getState().removeSlide(2);
    expect(useDeckStore.getState().currentIndex).toBe(2);
  });

  it('removing the current LAST slide clamps to the new last index', () => {
    useDeckStore.getState().loadDeck(slides(3));
    useDeckStore.getState().setCurrentIndex(2);
    useDeckStore.getState().removeSlide(2);
    expect(useDeckStore.getState().currentIndex).toBe(1);
  });

  it('removing a slide AFTER the current one keeps the index', () => {
    useDeckStore.getState().loadDeck(slides(4));
    useDeckStore.getState().setCurrentIndex(1);
    useDeckStore.getState().removeSlide(3);
    expect(useDeckStore.getState().currentIndex).toBe(1);
  });

  it('never removes the last remaining slide', () => {
    useDeckStore.getState().loadDeck(slides(1));
    useDeckStore.getState().removeSlide(0);
    expect(useDeckStore.getState().slides).toHaveLength(1);
  });
});

describe('store.loadDeck / loadDeckFull — flush pending before swap (M1)', () => {
  it('drains the registered pending flush while the OUTGOING deck is still live', () => {
    useDeckStore.getState().loadDeck(slides(2));
    let lenAtFlush = -1;
    const off = registerPendingFlush(() => {
      lenAtFlush = useDeckStore.getState().slides.length;
    });
    useDeckStore.getState().loadDeck(slides(5));
    off();
    // Flush ran before the swap → it saw the 2-slide outgoing deck, not the 5.
    expect(lenAtFlush).toBe(2);
    expect(useDeckStore.getState().slides).toHaveLength(5);
  });

  it('loadDeckFull also flushes before replacing', () => {
    useDeckStore.getState().loadDeck(slides(3));
    let lenAtFlush = -1;
    const off = registerPendingFlush(() => {
      lenAtFlush = useDeckStore.getState().slides.length;
    });
    useDeckStore.getState().loadDeckFull({
      slides: slides(1),
      overlaysBySlide: { 'slide-1': [] },
      currentIndex: 0,
    });
    off();
    expect(lenAtFlush).toBe(3);
    expect(useDeckStore.getState().slides).toHaveLength(1);
  });
});
