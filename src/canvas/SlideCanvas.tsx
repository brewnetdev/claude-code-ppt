import type { DragEvent } from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  getZoomPercent as readStoredZoomPercent,
  setZoomPercent as writeStoredZoomPercent,
} from '../persistence/localStore';
import { useDeckStore } from '../scene/store';
import { OverlayLayer, type ImageOverlay, type Overlay } from './OverlayLayer';
import { SlideRenderer } from './SlideRenderer';
import { SLIDE_HEIGHT, SLIDE_WIDTH } from '../scene/constants';
import './spike.css';

const FIT_PADDING = 64;

const ZOOM_MIN = 25;
const ZOOM_MAX = 200;
const ZOOM_STEP = 10;
const clampZoom = (n: number) =>
  Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, Math.round(n)));

let nextId = 1;
const makeId = () => `ovl-${nextId++}`;

export function SlideCanvas() {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const hostRef = useRef<HTMLDivElement>(null);
  // baseScale auto-fits the slide to the viewport; zoomPercent layers on top
  // so 100% always means "fit to current pane" regardless of pane size.
  const [baseScale, setBaseScale] = useState(1);
  const [zoomPercent, setZoomPercent] = useState<number>(() => readStoredZoomPercent() ?? 100);
  const [zoomDraft, setZoomDraft] = useState<string | null>(null);

  // Persist zoom across reloads. Skip the initial render to avoid writing
  // the freshly-read value back, and stay below the storage call rate by
  // only firing on settled values (the input commits via blur/Enter, the
  // ± buttons fire once per click).
  useEffect(() => {
    writeStoredZoomPercent(zoomPercent);
  }, [zoomPercent]);
  const [dropActive, setDropActive] = useState(false);
  const scale = baseScale * (zoomPercent / 100);

  const slideId = useDeckStore((s) => s.slides[s.currentIndex]?.id ?? null);
  const overlays = useDeckStore((s) => (slideId ? s.overlaysBySlide[slideId] ?? [] : []));
  const selectedOverlayId = useDeckStore((s) => s.selectedOverlayId);
  const setSelectedOverlayId = useDeckStore((s) => s.setSelectedOverlayId);
  const setSelectedBlockId = useDeckStore((s) => s.setSelectedBlockId);
  const addOverlay = useDeckStore((s) => s.addOverlay);
  const updateOverlayInStore = useDeckStore((s) => s.updateOverlay);
  // Cmd/Ctrl+C/V + Delete shortcuts for blocks and overlays. Read fresh
  // store state inside the handler so we don't restart the listener on
  // every selection change.
  useEffect(() => {
    const isEditableTarget = (target: EventTarget | null): boolean => {
      const el =
        target instanceof HTMLElement
          ? target
          : (document.activeElement as HTMLElement | null);
      if (!el) return false;
      if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') return true;
      return el.isContentEditable;
    };
    const onKeydown = (e: KeyboardEvent) => {
      // Native text-edit shortcuts (Cmd+C/V inside a textbox, Backspace deleting
      // a character) win unconditionally — never poach keys from text input.
      if (isEditableTarget(e.target)) return;
      const mod = e.metaKey || e.ctrlKey;
      const k = e.key.toLowerCase();
      const state = useDeckStore.getState();
      const sid = state.slides[state.currentIndex]?.id ?? null;
      if (!sid) return;

      if (mod && k === 'c') {
        if (state.selectedOverlayId) {
          state.copyOverlay(sid, state.selectedOverlayId);
          e.preventDefault();
        } else if (state.selectedBlockId) {
          state.copyBlock(sid, state.selectedBlockId);
          e.preventDefault();
        }
        return;
      }
      if (mod && k === 'v') {
        if (state.clipboard?.kind === 'overlay') {
          state.pasteOverlay(sid);
          e.preventDefault();
        } else if (state.clipboard?.kind === 'block') {
          // No anchor → append at end. With an anchor → paste below it.
          state.pasteBlock(sid, state.selectedBlockId, 'below');
          e.preventDefault();
        }
        return;
      }
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (state.selectedOverlayId) {
          state.removeOverlay(sid, state.selectedOverlayId);
          e.preventDefault();
        } else if (state.selectedBlockId) {
          state.removeBlock(sid, state.selectedBlockId);
          e.preventDefault();
        }
      }
    };
    window.addEventListener('keydown', onKeydown);
    return () => window.removeEventListener('keydown', onKeydown);
  }, []);
  // Force SlideRenderer to remount on undo/redo so the fresh slide.html from
  // the history snapshot is injected; normal typing never bumps revision.
  const revision = useDeckStore((s) => s.revision);

  useEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;

    const compute = () => {
      const { width, height } = el.getBoundingClientRect();
      const sx = (width - FIT_PADDING) / SLIDE_WIDTH;
      const sy = (height - FIT_PADDING) / SLIDE_HEIGHT;
      setBaseScale(Math.min(sx, sy, 1.5));
    };

    compute();
    const ro = new ResizeObserver(compute);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const onDragOver = useCallback((e: DragEvent<HTMLDivElement>) => {
    if (Array.from(e.dataTransfer.types).includes('Files')) {
      e.preventDefault();
      setDropActive(true);
    }
  }, []);

  const onDragLeave = useCallback((e: DragEvent<HTMLDivElement>) => {
    if (e.currentTarget === e.target) setDropActive(false);
  }, []);

  const onDrop = useCallback(
    (e: DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setDropActive(false);
      if (!slideId) return;
      const file = Array.from(e.dataTransfer.files).find((f) => f.type.startsWith('image/'));
      if (!file) return;

      const host = hostRef.current;
      if (!host) return;
      const rect = host.getBoundingClientRect();
      const sc = rect.width / SLIDE_WIDTH;
      const dropX = (e.clientX - rect.left) / sc;
      const dropY = (e.clientY - rect.top) / sc;

      const url = URL.createObjectURL(file);
      const id = makeId();

      // Probe the natural dimensions so the drop respects the source aspect
      // ratio. The previous fixed 360×240 box was forcing portrait photos
      // (e.g. a 3104×3647 book cover) into a landscape rectangle, which
      // combined with `object-fit: cover` to crop the image AND downsample
      // it ~8× — exactly the "drop tanks the resolution" report.
      const probe = new Image();
      probe.onload = () => {
        const nW = probe.naturalWidth || 1;
        const nH = probe.naturalHeight || 1;
        // Cap the longer edge so drops don't blow up the slide. 600px on the
        // long edge × 1.5 export scale → up to 900 device px in 1080p video,
        // which is more than enough for a hero image while staying inside
        // a 1280×720 authoring frame.
        const MAX_EDGE = 600;
        let w: number;
        let h: number;
        if (nW >= nH) {
          w = Math.min(nW, MAX_EDGE);
          h = (w * nH) / nW;
        } else {
          h = Math.min(nH, MAX_EDGE);
          w = (h * nW) / nH;
        }
        w = Math.round(w);
        h = Math.round(h);
        const item: ImageOverlay = {
          id,
          kind: 'image',
          src: url,
          x: Math.max(0, Math.min(Math.round(dropX - w / 2), SLIDE_WIDTH - w)),
          y: Math.max(0, Math.min(Math.round(dropY - h / 2), SLIDE_HEIGHT - h)),
          w,
          h,
        };
        addOverlay(slideId, item);
        setSelectedOverlayId(id);
      };
      probe.onerror = () => {
        // Fallback to the legacy fixed box only when natural-dim probing fails
        // (corrupt file, blocked CORS, etc.). Better than dropping nothing.
        const w = 360;
        const h = 240;
        const item: ImageOverlay = {
          id,
          kind: 'image',
          src: url,
          x: Math.max(0, Math.min(dropX - w / 2, SLIDE_WIDTH - w)),
          y: Math.max(0, Math.min(dropY - h / 2, SLIDE_HEIGHT - h)),
          w,
          h,
        };
        addOverlay(slideId, item);
        setSelectedOverlayId(id);
      };
      probe.src = url;
    },
    [slideId, addOverlay, setSelectedOverlayId],
  );

  const updateOverlay = useCallback(
    (id: string, patch: Partial<Overlay>) => {
      if (!slideId) return;
      updateOverlayInStore(slideId, id, patch);
    },
    [slideId, updateOverlayInStore],
  );

  if (!slideId) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-[#020617] text-editor-dim">
        No slide loaded
      </div>
    );
  }

  return (
    <div
      ref={wrapperRef}
      className={`relative flex h-full w-full items-center justify-center overflow-hidden bg-[#020617] ${
        dropActive ? 'overlay-drop-active' : ''
      }`}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      onMouseDown={() => {
        setSelectedOverlayId(null);
        setSelectedBlockId(null);
      }}
    >
      <div
        ref={hostRef}
        data-canvas-role="main"
        className="slide-canvas-host relative shadow-[0_24px_64px_rgba(0,0,0,0.6)]"
        style={{
          width: SLIDE_WIDTH,
          height: SLIDE_HEIGHT,
          transform: `scale(${scale})`,
          transformOrigin: 'center center',
        }}
      >
        <SlideRenderer key={`${slideId}:${revision}`} slideId={slideId} />
        <OverlayLayer
          items={overlays}
          selectedId={selectedOverlayId}
          onSelect={setSelectedOverlayId}
          onUpdate={updateOverlay}
        />
      </div>
      <div
        className="pointer-events-auto absolute bottom-3 right-3 flex items-center gap-1 rounded-md border border-editor-border bg-editor-panel/90 px-1.5 py-1 text-[11px] text-editor-text shadow-[0_8px_24px_rgba(0,0,0,0.4)] backdrop-blur"
        onMouseDown={(e) => e.stopPropagation()}
        title="슬라이드 미리보기 크기"
      >
        <button
          type="button"
          onClick={() => setZoomPercent((p) => clampZoom(p - ZOOM_STEP))}
          disabled={zoomPercent <= ZOOM_MIN}
          className="rounded px-1.5 py-0.5 text-editor-dim transition hover:bg-editor-bg hover:text-editor-text disabled:opacity-40 disabled:hover:bg-transparent"
          aria-label="축소"
        >
          −
        </button>
        <input
          type="number"
          min={ZOOM_MIN}
          max={ZOOM_MAX}
          step={ZOOM_STEP}
          value={zoomDraft ?? zoomPercent}
          onFocus={(e) => e.target.select()}
          onChange={(e) => {
            const raw = e.target.value;
            setZoomDraft(raw);
            const n = Number(raw);
            if (raw !== '' && Number.isFinite(n)) setZoomPercent(clampZoom(n));
          }}
          onBlur={() => {
            setZoomDraft(null);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
          }}
          className="w-12 bg-transparent text-center font-mono outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
        />
        <span className="text-editor-dim">%</span>
        <button
          type="button"
          onClick={() => setZoomPercent((p) => clampZoom(p + ZOOM_STEP))}
          disabled={zoomPercent >= ZOOM_MAX}
          className="rounded px-1.5 py-0.5 text-editor-dim transition hover:bg-editor-bg hover:text-editor-text disabled:opacity-40 disabled:hover:bg-transparent"
          aria-label="확대"
        >
          +
        </button>
        <span className="mx-0.5 h-3.5 w-px bg-editor-border" aria-hidden="true" />
        <button
          type="button"
          onClick={() => setZoomPercent(100)}
          disabled={zoomPercent === 100}
          className="rounded px-1.5 py-0.5 text-editor-dim transition hover:bg-editor-bg hover:text-editor-text disabled:opacity-40 disabled:hover:bg-transparent"
          title="100% (Fit)"
        >
          Fit
        </button>
      </div>
    </div>
  );
}
