import { useEffect, useMemo, useState } from 'react';
import type { ImageOverlay, Overlay, TextOverlay } from '../canvas/OverlayLayer';
import { linkifyHtml } from '../exporter/linkify';
import { SLIDE_HEIGHT, SLIDE_WIDTH } from '../scene/constants';
import { useDeckStore } from '../scene/store';
import { PresentationAnnotator } from './PresentationAnnotator';

const PRESET_CLASS: Record<NonNullable<TextOverlay['preset']>, string> = {
  h1: 't-title',
  h2: 't-h2',
  h3: 't-h3',
  p: 't-body',
};

type Props = {
  onExit: () => void;
};

// Fullscreen, edit-free render of the current deck. Arrow keys (and Space)
// advance/retreat slides; Escape exits. Calls the browser's Fullscreen API
// best-effort and listens to `fullscreenchange` so the user can also exit
// natively (Esc / F11) and stay in sync with our state.
export function PresentationView({ onExit }: Props) {
  const slides = useDeckStore((s) => s.slides);
  const currentIndex = useDeckStore((s) => s.currentIndex);
  const overlaysBySlide = useDeckStore((s) => s.overlaysBySlide);
  const setCurrentIndex = useDeckStore((s) => s.setCurrentIndex);

  const [scale, setScale] = useState(1);

  useEffect(() => {
    const recompute = () => {
      const sx = window.innerWidth / SLIDE_WIDTH;
      const sy = window.innerHeight / SLIDE_HEIGHT;
      setScale(Math.min(sx, sy));
    };
    recompute();
    window.addEventListener('resize', recompute);
    return () => window.removeEventListener('resize', recompute);
  }, []);

  useEffect(() => {
    // Best-effort fullscreen — some browsers require a user gesture; the
    // toolbar click that triggers presentation already counts as one.
    const root = document.documentElement;
    if (root.requestFullscreen && !document.fullscreenElement) {
      root.requestFullscreen().catch(() => undefined);
    }
    return () => {
      if (document.fullscreenElement && document.exitFullscreen) {
        document.exitFullscreen().catch(() => undefined);
      }
    };
  }, []);

  useEffect(() => {
    const onFsChange = () => {
      // If the user exited fullscreen via Esc/F11, drop presentation mode too.
      if (!document.fullscreenElement) onExit();
    };
    document.addEventListener('fullscreenchange', onFsChange);
    return () => document.removeEventListener('fullscreenchange', onFsChange);
  }, [onExit]);

  // Capture-phase click interceptor on document — links inside the slide
  // would otherwise navigate the editor SPA away (losing in-flight state)
  // and `href="#"` would just no-op. Open real URLs in a new tab; ignore
  // empty / hash-only anchors so they don't accidentally exit presentation.
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const t = e.target as HTMLElement | null;
      const a = t?.closest('a');
      if (!a) return;
      e.preventDefault();
      e.stopPropagation();
      const href = a.getAttribute('href');
      if (!href || href === '#' || href.startsWith('#')) return;
      window.open(href, '_blank', 'noopener,noreferrer');
    };
    document.addEventListener('click', onClick, true);
    return () => document.removeEventListener('click', onClick, true);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onExit();
        return;
      }
      const { slides: cur, currentIndex: i, setCurrentIndex: set } = useDeckStore.getState();
      if (cur.length === 0) return;
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown' || e.key === ' ' || e.key === 'PageDown') {
        e.preventDefault();
        set(Math.min(cur.length - 1, i + 1));
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp' || e.key === 'PageUp' || e.key === 'Backspace') {
        e.preventDefault();
        set(Math.max(0, i - 1));
      } else if (e.key === 'Home') {
        e.preventDefault();
        set(0);
      } else if (e.key === 'End') {
        e.preventDefault();
        set(cur.length - 1);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onExit]);

  const slide = slides[currentIndex];
  // Reuse the export pipeline's linkifier so bare `https://…` text becomes
  // real anchors here too (the editor DOM is intentionally left un-linkified).
  // Existing <a> tags also get target/rel stamped. The capture-phase click
  // handler above then opens every resulting anchor in a new tab.
  const slideHtml = useMemo(
    () => (slide ? linkifyHtml(slide.html, document) : ''),
    [slide],
  );
  if (!slide) return null;
  const overlays = overlaysBySlide[slide.id] ?? [];

  return (
    <div
      className="fixed inset-0 z-[2000] flex items-center justify-center bg-black"
      role="presentation"
      data-testid="presentation-overlay"
      onClick={(e) => {
        // Click on the dark backdrop — not the slide — exits.
        if (e.target === e.currentTarget) onExit();
      }}
    >
      <div
        style={{
          width: SLIDE_WIDTH,
          height: SLIDE_HEIGHT,
          transform: `scale(${scale})`,
          transformOrigin: 'center center',
          position: 'relative',
        }}
      >
        <div
          className="slide-canvas-host"
          style={{ width: SLIDE_WIDTH, height: SLIDE_HEIGHT, position: 'relative' }}
          dangerouslySetInnerHTML={{ __html: slideHtml }}
        />
        <PresentationOverlays overlays={overlays} />
      </div>

      <div className="fixed bottom-4 right-6 z-[2200] select-none rounded bg-black/60 px-3 py-1 font-mono text-xs text-white/80 opacity-0 transition-opacity duration-200 hover:opacity-100">
        {currentIndex + 1} / {slides.length} · ← → 이동 · Esc 종료
      </div>

      {/* Moved to top-left so it never collides with the annotation toolbar
          (which owns the top-right corner). z-[2200] keeps it clickable above
          the annotator's full-screen drawing surface (z 2100). */}
      <button
        type="button"
        onClick={onExit}
        className="fixed top-4 left-4 z-[2200] rounded border border-white/30 bg-black/60 px-3 py-1 text-xs text-white/80 opacity-0 transition-opacity duration-200 hover:bg-white/10 hover:opacity-100"
        title="Exit presentation (Esc)"
      >
        ✕ 종료
      </button>

      {currentIndex > 0 ? (
        <button
          type="button"
          onClick={() => setCurrentIndex(Math.max(0, currentIndex - 1))}
          className="fixed left-4 top-1/2 z-[2200] -translate-y-1/2 rounded-full border border-white/20 bg-black/60 px-3 py-2 text-white/70 transition hover:bg-white/10"
          aria-label="Previous slide"
        >
          ‹
        </button>
      ) : null}
      {currentIndex < slides.length - 1 ? (
        <button
          type="button"
          onClick={() => setCurrentIndex(Math.min(slides.length - 1, currentIndex + 1))}
          className="fixed right-4 top-1/2 z-[2200] -translate-y-1/2 rounded-full border border-white/20 bg-black/60 px-3 py-2 text-white/70 transition hover:bg-white/10"
          aria-label="Next slide"
        >
          ›
        </button>
      ) : null}

      <PresentationAnnotator />
    </div>
  );
}

function PresentationOverlays({ overlays }: { overlays: Overlay[] }) {
  return (
    <>
      {overlays.map((o) => {
        const kind = (o as Partial<Overlay>).kind ?? 'image';
        if (kind === 'image') {
          const img = o as ImageOverlay;
          return (
            <img
              key={img.id}
              src={img.src}
              alt=""
              draggable={false}
              style={{
                position: 'absolute',
                left: img.x,
                top: img.y,
                width: img.w,
                height: img.h,
                zIndex: 100,
                pointerEvents: 'none',
                userSelect: 'none',
              }}
            />
          );
        }
        const t = o as TextOverlay;
        return (
          <div
            key={t.id}
            style={{
              position: 'absolute',
              left: t.x,
              top: t.y,
              width: t.w,
              height: t.h,
              background: t.bg ?? 'transparent',
              zIndex: 100,
              pointerEvents: 'none',
            }}
          >
            <div
              className={t.preset ? PRESET_CLASS[t.preset] : undefined}
              style={{
                textAlign: t.align ?? 'left',
                fontSize: t.fontSizePx ? `${t.fontSizePx}px` : undefined,
                width: '100%',
                height: '100%',
              }}
              dangerouslySetInnerHTML={{ __html: t.html }}
            />
          </div>
        );
      })}
    </>
  );
}
